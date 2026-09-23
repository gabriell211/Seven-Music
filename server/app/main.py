from __future__ import annotations

import asyncio
import os
import re
import shutil
import time
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


def _extractor_args() -> dict[str, dict[str, list[str]]]:
    provider_url = os.getenv("YTDLP_POT_PROVIDER_URL", "").strip()

    clients = ["mweb", "web_embedded"] if provider_url else ["web_embedded", "android_vr", "web"]

    args: dict[str, dict[str, list[str]]] = {
        "youtube": {"player_client": clients}
    }

    if provider_url:
        args["youtubepot-bgutilhttp"] = {"base_url": [provider_url]}

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


def _resolve_sync(video_id: str) -> dict[str, Any]:
    now = time.time()
    cached = _resolve_cache.get(video_id)
    if cached and cached.expires_at > now:
        return cached.value

    options = {
        **_base_ydl_options(),
        "format": "bestaudio[protocol^=http]/bestaudio/best",
        "skip_download": True,
    }

    with YoutubeDL(options) as ydl:
        info = ydl.extract_info(
            "https://www.youtube.com/watch?v=" + video_id,
            download=False,
        )

    stream_url = info.get("url")
    stream_headers = _safe_headers(info)

    if not stream_url:
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
            stream_url = audio.get("url")
            stream_headers = _safe_headers(audio) or stream_headers

    if not stream_url:
        raise DownloadError("Nenhum formato de áudio reproduzível foi encontrado.")

    value = {
        "videoId": video_id,
        "streamUrl": stream_url,
        "streamHeaders": stream_headers,
        "expiresAt": None,
    }
    _resolve_cache[video_id] = CacheEntry(
        expires_at=now + CACHE_TTL_SECONDS,
        value=value,
    )
    return value


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


@app.get("/v1/youtube/resolve/{video_id}")
async def youtube_resolve(video_id: str) -> dict[str, Any]:
    if not VIDEO_ID_RE.fullmatch(video_id):
        raise HTTPException(status_code=422, detail="ID de vídeo inválido.")

    try:
        return await asyncio.to_thread(_resolve_sync, video_id)
    except DownloadError as exc:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível obter um stream de áudio para este vídeo.",
        ) from exc
