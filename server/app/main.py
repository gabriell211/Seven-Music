from __future__ import annotations

import asyncio
import json
import os
import re
import urllib.request
import shutil
import sys
import time
import traceback

from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
CACHE_TTL_SECONDS = 300

SAFE_HEADER_NAMES = {
    "accept",
    "accept-language",
    "origin",
    "referer",
    "user-agent",
}

app = FastAPI(title="Seven Music API", version="0.1.0", docs_url="/docs", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@dataclass(slots=True)
class CacheEntry:
    expires_at: float
    value: dict[str, Any]


_resolve_cache: dict[str, CacheEntry] = {}


def _resolver_upstream() -> str:
    configured = os.getenv("YTDLP_RESOLVER_UPSTREAM", "").strip().rstrip("/")
    if configured:
        return configured
    if os.getenv("VERCEL"):
        return "https://seven-music-audio.onrender.com"
    return ""


def _resolve_upstream_sync(video_id: str) -> dict[str, Any]:
    upstream = _resolver_upstream()
    if not upstream:
        raise RuntimeError("upstream disabled")

    request = urllib.request.Request(
        upstream + "/v1/youtube/resolve/" + video_id,
        headers={"Accept": "application/json", "User-Agent": "Seven-Music/1.0"},
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict) or not payload.get("streamUrl"):
        raise RuntimeError("upstream returned no streamUrl")
    return payload


def _extractor_args() -> dict[str, dict[str, list[str]]]:
    provider_url = os.getenv("YTDLP_POT_PROVIDER_URL", "").strip()
    script_home = os.getenv("YTDLP_POT_SCRIPT_HOME", "").strip()

    has_provider = bool(provider_url or script_home)
    clients = ["mweb", "web", "web_embedded"] if has_provider else ["web_embedded", "android_vr", "web"]

    args: dict[str, dict[str, list[str]]] = {
        "youtube": {"player_client": clients}
    }

    if provider_url:
        args["youtubepot-bgutilhttp"] = {"base_url": [provider_url]}
    elif script_home:
        args["youtubepot-bgutilscript"] = {"server_home": [script_home]}

    return args


def _available_js_runtimes() -> dict[str, dict[str, Any]]:
    if shutil.which("deno"):
        return {"deno": {}}
    if shutil.which("node"):
        return {"node": {}}
    return {}


def _base_ydl_options() -> dict[str, Any]:
    options: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "extractor_args": _extractor_args(),
        "js_runtimes": _available_js_runtimes(),
        "remote_components": ["ejs:github"],
        "socket_timeout": 15,
        "retries": 2,
    }

    cookie_file = os.getenv("YTDLP_COOKIES_FILE", "").strip()
    if cookie_file:
        options["cookiefile"] = cookie_file

    return options


def _search_sync(query: str, limit: int) -> list[dict[str, Any]]:
    options = {
        **_base_ydl_options(),
        "extract_flat": True,
        "skip_download": True,
    }

    with YoutubeDL(options) as ydl:
        info = ydl.extract_info("ytsearch" + str(limit) + ":" + query, download=False)

    entries = info.get("entries") or []
    results: list[dict[str, Any]] = []

    for entry in entries:
        if not entry:
            continue

        video_id = str(entry.get("id") or "")
        if not VIDEO_ID_RE.fullmatch(video_id):
            continue

        duration = entry.get("duration") or 0
        artist = entry.get("artist") or entry.get("uploader") or entry.get("channel") or "YouTube"
        thumbnails = entry.get("thumbnails") or []
        thumbnail = entry.get("thumbnail")
        if not thumbnail and thumbnails:
            thumbnail = thumbnails[-1].get("url")

        results.append(
            {
                "videoId": video_id,
                "title": str(entry.get("title") or "Sem título"),
                "artist": str(artist),
                "durationSeconds": int(duration) if duration else 0,
                "thumbnail": thumbnail,
            }
        )

    return results


def _safe_headers(info: dict[str, Any]) -> dict[str, str]:
    raw_headers = info.get("http_headers") or {}
    return {
        str(key): str(value)
        for key, value in raw_headers.items()
        if str(key).lower() in SAFE_HEADER_NAMES and value
    }


def _extract_stream(info: dict[str, Any]) -> tuple[str | None, dict[str, str]]:
    stream_url = info.get("url")
    stream_headers = _safe_headers(info)

    # Never accept a muxed/video stream. Seven Music is audio-only.
    if stream_url and info.get("vcodec") == "none":
        return str(stream_url), stream_headers

    requested = info.get("requested_formats") or []
    audio = next(
        (
            item
            for item in requested
            if item and item.get("vcodec") == "none" and item.get("url")
        ),
        None,
    )
    if audio:
        return str(audio.get("url")), _safe_headers(audio) or stream_headers

    entries = info.get("formats") or []
    candidates = [
        item
        for item in entries
        if item
        and item.get("url")
        and item.get("vcodec") == "none"
        and item.get("acodec") not in (None, "none")
    ]
    candidates.sort(
        key=lambda item: (
            str(item.get("protocol") or "").startswith("m3u8"),
            float(item.get("abr") or 0),
            float(item.get("tbr") or 0),
        ),
        reverse=True,
    )
    if candidates:
        best = candidates[0]
        return str(best.get("url")), _safe_headers(best) or stream_headers

    return None, stream_headers


def _resolve_sync(video_id: str) -> dict[str, Any]:
    now = time.time()
    cached = _resolve_cache.get(video_id)
    if cached and cached.expires_at > now:
        return cached.value

    url = "https://www.youtube.com/watch?v=" + video_id
    provider_url = os.getenv("YTDLP_POT_PROVIDER_URL", "").strip()
    script_home = os.getenv("YTDLP_POT_SCRIPT_HOME", "").strip()
    js_runtimes = _available_js_runtimes()

    strategies: list[tuple[list[str], str]] = []

    if provider_url or script_home:
        strategies.append((
            ["mweb", "web", "web_embedded"],
            "bestaudio[protocol^=http]/bestaudio",
        ))

    if js_runtimes:
        strategies.append((
            ["web_safari", "web", "web_embedded"],
            "bestaudio[protocol^=m3u8]/bestaudio[protocol^=http]/bestaudio",
        ))
    else:
        # Vercel's Python runtime currently has no JS engine. Prefer HLS from
        # clients whose GVS playback does not require a PO token where possible.
        strategies.extend([
            (
                ["web_safari"],
                "bestaudio[protocol^=m3u8]/bestaudio",
            ),
            (
                ["web_embedded"],
                "bestaudio[protocol^=http]/bestaudio",
            ),
            (
                ["tv"],
                "bestaudio[protocol^=http]/bestaudio",
            ),
        ])

    last_error: Exception | None = None

    for clients, format_selector in strategies:
        options = {
            **_base_ydl_options(),
            "format": format_selector,
            "skip_download": True,
            "extractor_args": {
                **_extractor_args(),
                "youtube": {"player_client": clients},
            },
        }

        try:
            with YoutubeDL(options) as ydl:
                info = ydl.extract_info(url, download=False)

            stream_url, stream_headers = _extract_stream(info)
            if not stream_url:
                continue

            value = {
                "videoId": video_id,
                "streamUrl": stream_url,
                "streamHeaders": stream_headers,
                "expiresAt": None,
                "strategy": clients[0],
            }
            _resolve_cache[video_id] = CacheEntry(
                expires_at=now + CACHE_TTL_SECONDS,
                value=value,
            )
            return value
        except Exception as exc:
            last_error = exc
            print(
                "Seven Music resolver strategy failed:",
                clients,
                type(exc).__name__,
                str(exc),
                file=sys.stderr,
            )

    if last_error:
        raise DownloadError(str(last_error)) from last_error

    raise DownloadError("Nenhum formato de áudio reproduzível foi encontrado.")


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": "Seven Music API",
        "status": "online",
        "version": "0.2.0",
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/youtube/search")
async def youtube_search(
    q: str = Query(min_length=2, max_length=120),
    limit: int = Query(default=12, ge=1, le=20),
) -> dict[str, list[dict[str, Any]]]:
    try:
        items = await asyncio.to_thread(_search_sync, q.strip(), limit)
        return {"items": items}
    except DownloadError as exc:
        raise HTTPException(
            status_code=502,
            detail="O YouTube recusou a pesquisa no momento.",
        ) from exc
    except Exception as exc:
        print("Seven Music search error:", type(exc).__name__, str(exc), file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail="Falha interna do yt-dlp: " + type(exc).__name__,
        ) from exc


@app.get("/v1/youtube/resolve/{video_id}")
async def youtube_resolve(video_id: str) -> dict[str, Any]:
    if not VIDEO_ID_RE.fullmatch(video_id):
        raise HTTPException(status_code=422, detail="ID de vídeo inválido.")

    try:
        if _resolver_upstream():
            try:
                return await asyncio.to_thread(_resolve_upstream_sync, video_id)
            except Exception as upstream_exc:
                print(
                    "Seven Music upstream resolver failed:",
                    type(upstream_exc).__name__,
                    str(upstream_exc),
                    file=sys.stderr,
                )

        return await asyncio.to_thread(_resolve_sync, video_id)
    except DownloadError as exc:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível obter um stream de áudio para este vídeo.",
        ) from exc
    except Exception as exc:
        print("Seven Music resolve error:", type(exc).__name__, str(exc), file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail="Não foi possível obter um stream de áudio para este vídeo.",
        ) from exc
