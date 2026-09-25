from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import shutil
import sys
import threading
import time
import traceback

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
CACHE_TTL_SECONDS = 300
SEARCH_CACHE_TTL_SECONDS = 120
MAX_AUDIO_BYTES = int(os.getenv("SEVEN_MAX_AUDIO_BYTES", str(12 * 1024 * 1024)))
MAX_SEARCH_DURATION_SECONDS = int(os.getenv("SEVEN_MAX_SEARCH_DURATION_SECONDS", "600"))
UPSTREAM_FAILURE_THRESHOLD = int(os.getenv("SEVEN_UPSTREAM_FAILURE_THRESHOLD", "3"))
UPSTREAM_COOLDOWN_SECONDS = int(os.getenv("SEVEN_UPSTREAM_COOLDOWN_SECONDS", "15"))
UPSTREAM_HTTP_RETRIES = int(os.getenv("SEVEN_UPSTREAM_HTTP_RETRIES", "1"))

SAFE_HEADER_NAMES = {
    "accept",
    "accept-language",
    "origin",
    "referer",
    "user-agent",
}

app = FastAPI(title="Seven Music API", version="0.1.0", docs_url="/docs", redoc_url=None)

print(
    "Seven Music resolver configuration:",
    "proxy=" + str(bool(os.getenv("YTDLP_PROXY"))),
    "proxy_rotate=" + str(os.getenv("YTDLP_PROXY_ROTATE", "").strip().lower() in {"1", "true", "yes", "on"}),
    "cookies=" + str(bool(os.getenv("YTDLP_COOKIES_FILE") or os.getenv("YTDLP_COOKIES_B64"))),
    "pot_provider=" + str(bool(os.getenv("YTDLP_POT_PROVIDER_URL") or os.getenv("YTDLP_POT_SCRIPT_HOME"))),
    file=sys.stderr,
)

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
    value: Any


@dataclass(slots=True)
class UpstreamHealth:
    failures: int = 0
    opened_until: float = 0.0


class AudioTooLargeError(RuntimeError):
    pass


_resolve_cache: dict[str, CacheEntry] = {}
_search_cache: dict[str, CacheEntry] = {}
_upstream_health: dict[str, UpstreamHealth] = {}
_upstream_health_lock = threading.Lock()


def _resolver_upstreams() -> list[str]:
    configured = os.getenv("YTDLP_RESOLVER_UPSTREAM", "").strip()
    if configured:
        return [item.strip().rstrip("/") for item in configured.split(",") if item.strip()]
    if os.getenv("VERCEL"):
        return [
            "https://seven-music-audio-pot.onrender.com",
            "https://seven-music-audio.onrender.com",
            "https://seven-music-audio-oregon.onrender.com",
        ]
    return []


def _healthy_upstreams(upstreams: list[str]) -> list[str]:
    now = time.monotonic()
    with _upstream_health_lock:
        healthy = [
            upstream
            for upstream in upstreams
            if _upstream_health.get(upstream, UpstreamHealth()).opened_until <= now
        ]
    # Never hard-lock the whole service. If every circuit is open, probe all
    # candidates again and let the first recovered region win.
    return healthy or upstreams


def _mark_upstream_success(upstream: str) -> None:
    with _upstream_health_lock:
        _upstream_health[upstream] = UpstreamHealth()


def _mark_upstream_failure(upstream: str) -> None:
    now = time.monotonic()
    with _upstream_health_lock:
        state = _upstream_health.setdefault(upstream, UpstreamHealth())
        state.failures += 1
        if state.failures >= UPSTREAM_FAILURE_THRESHOLD:
            state.failures = 0
            state.opened_until = now + UPSTREAM_COOLDOWN_SECONDS


def _should_trip_circuit(exc: Exception) -> bool:
    # A 502 from a resolver usually means YouTube rejected that particular
    # rotating exit IP/video combination. Do not sideline an entire Render
    # region for a content-specific failure; the next request may get a new IP.
    if isinstance(exc, urllib.error.HTTPError):
        if exc.code in {413, 429, 502}:
            return False
    return True


def _read_http_error_detail(exc: urllib.error.HTTPError) -> str:
    try:
        payload = json.loads(exc.read().decode("utf-8"))
        detail = payload.get("detail") if isinstance(payload, dict) else None
        if detail:
            return str(detail)
    except Exception:
        pass
    return "A faixa excede o limite permitido pelo Seven Music."


def _resolve_upstream_sync(video_id: str) -> dict[str, Any]:
    cache_key = "upstream:" + video_id
    now = time.time()
    cached = _resolve_cache.get(cache_key)
    if cached and cached.expires_at > now:
        return cached.value

    upstreams = _healthy_upstreams(_resolver_upstreams())
    if not upstreams:
        raise RuntimeError("upstream disabled")

    def request_upstream(upstream: str) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(UPSTREAM_HTTP_RETRIES + 1):
            request = urllib.request.Request(
                upstream + "/v1/youtube/resolve/" + video_id,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "Seven-Music/1.0",
                    "Cache-Control": "no-cache",
                    "Connection": "close",
                },
            )
            try:
                with urllib.request.urlopen(request, timeout=35) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if not isinstance(payload, dict) or not payload.get("streamUrl"):
                    raise RuntimeError("upstream returned no streamUrl")
                return payload
            except urllib.error.HTTPError as exc:
                if exc.code == 413:
                    raise AudioTooLargeError(_read_http_error_detail(exc)) from exc
                last_error = exc
                # A new request gives the rotating proxy another chance to
                # select a clean exit IP. Retry only fast, content-level
                # failures; never double a network timeout.
                if exc.code in {429, 502} and attempt < UPSTREAM_HTTP_RETRIES:
                    continue
                raise

        raise RuntimeError("upstream retry exhausted") from last_error

    executor = ThreadPoolExecutor(max_workers=len(upstreams))
    futures = {executor.submit(request_upstream, upstream): upstream for upstream in upstreams}
    last_error: Exception | None = None
    too_large_error: AudioTooLargeError | None = None
    try:
        for future in as_completed(futures):
            upstream = futures[future]
            try:
                payload = future.result()
                _mark_upstream_success(upstream)
                _resolve_cache[cache_key] = CacheEntry(
                    expires_at=time.time() + CACHE_TTL_SECONDS,
                    value=payload,
                )
                return payload
            except AudioTooLargeError as exc:
                too_large_error = exc
            except Exception as exc:
                last_error = exc
                if _should_trip_circuit(exc):
                    _mark_upstream_failure(upstream)
                print(
                    "Seven Music upstream candidate failed:",
                    upstream,
                    type(exc).__name__,
                    str(exc),
                    file=sys.stderr,
                )
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    if too_large_error:
        raise too_large_error
    raise RuntimeError("all upstream resolvers failed") from last_error


def _search_upstream_sync(query: str, limit: int) -> list[dict[str, Any]]:
    upstreams = _healthy_upstreams(_resolver_upstreams())
    if not upstreams:
        raise RuntimeError("upstream disabled")

    query_string = urllib.parse.urlencode({"q": query, "limit": limit})

    def request_upstream(upstream: str) -> list[dict[str, Any]]:
        request = urllib.request.Request(
            upstream + "/v1/youtube/search?" + query_string,
            headers={"Accept": "application/json", "User-Agent": "Seven-Music/1.0"},
        )
        with urllib.request.urlopen(request, timeout=25) as response:
            payload = json.loads(response.read().decode("utf-8"))
        items = payload.get("items") if isinstance(payload, dict) else None
        if not isinstance(items, list):
            raise RuntimeError("upstream returned invalid search payload")
        return items

    executor = ThreadPoolExecutor(max_workers=len(upstreams))
    futures = {executor.submit(request_upstream, upstream): upstream for upstream in upstreams}
    last_error: Exception | None = None
    try:
        for future in as_completed(futures):
            upstream = futures[future]
            try:
                items = future.result()
                _mark_upstream_success(upstream)
                return items
            except Exception as exc:
                last_error = exc
                if _should_trip_circuit(exc):
                    _mark_upstream_failure(upstream)
                print(
                    "Seven Music search upstream candidate failed:",
                    upstream,
                    type(exc).__name__,
                    str(exc),
                    file=sys.stderr,
                )
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    raise RuntimeError("all upstream search resolvers failed") from last_error


def _extractor_args(
    *,
    clients: list[str] | None = None,
    include_pot: bool = False,
) -> dict[str, dict[str, list[str]]]:
    provider_url = os.getenv("YTDLP_POT_PROVIDER_URL", "").strip()
    selected_clients = clients or ["web_embedded", "android_vr", "web"]

    args: dict[str, dict[str, list[str]]] = {
        "youtube": {"player_client": selected_clients}
    }

    # Only the dedicated POT service uses the long-lived HTTP provider.
    # The bgutil script provider was timing out while spawning Deno on the
    # other Render regions, so never attach it to ordinary extraction.
    if include_pot and provider_url:
        args["youtubepot-bgutilhttp"] = {"base_url": [provider_url]}

    return args


def _available_js_runtimes() -> dict[str, dict[str, Any]]:
    if shutil.which("deno"):
        return {"deno": {}}
    if shutil.which("node"):
        return {"node": {}}
    return {}


def _cookies_file() -> str:
    cookie_file = os.getenv("YTDLP_COOKIES_FILE", "").strip()
    if cookie_file:
        return cookie_file

    encoded = os.getenv("YTDLP_COOKIES_B64", "").strip()
    if not encoded:
        return ""

    path = "/tmp/seven-music-youtube-cookies.txt"
    try:
        with open(path, "wb") as handle:
            handle.write(base64.b64decode(encoded))
        os.chmod(path, 0o600)
        return path
    except Exception as exc:
        print("Seven Music cookie decode failed:", type(exc).__name__, str(exc), file=sys.stderr)
        return ""


def _effective_proxy() -> str:
    proxy = os.getenv("YTDLP_PROXY", "").strip()
    if not proxy:
        return ""

    rotate = os.getenv("YTDLP_PROXY_ROTATE", "").strip().lower() in {"1", "true", "yes", "on"}
    if not rotate:
        return proxy

    try:
        parsed = urllib.parse.urlsplit(proxy)
        username = urllib.parse.unquote(parsed.username or "")
        password = urllib.parse.unquote(parsed.password or "")
        if not username or not password:
            return proxy

        if not username.endswith("-rotate"):
            username += "-rotate"

        encoded_user = urllib.parse.quote(username, safe="-._~")
        encoded_password = urllib.parse.quote(password, safe="-._~")
        scheme = parsed.scheme or "http"
        return f"{scheme}://{encoded_user}:{encoded_password}@p.webshare.io:80/"
    except Exception as exc:
        print(
            "Seven Music rotating proxy setup failed:",
            type(exc).__name__,
            str(exc),
            file=sys.stderr,
        )
        return proxy


def _base_ydl_options() -> dict[str, Any]:
    options: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "extractor_args": _extractor_args(),
        "js_runtimes": _available_js_runtimes(),
        "remote_components": ["ejs:github"],
        "socket_timeout": 12,
        "retries": 1,
        "extractor_retries": 1,
        "fragment_retries": 1,
    }

    cookie_file = _cookies_file()
    if cookie_file:
        options["cookiefile"] = cookie_file

    proxy = _effective_proxy()
    if proxy:
        options["proxy"] = proxy

    return options


def _search_sync(query: str, limit: int) -> list[dict[str, Any]]:
    cache_key = str(limit) + ":" + query.casefold().strip()
    now = time.time()
    cached = _search_cache.get(cache_key)
    if cached and cached.expires_at > now:
        return list(cached.value)

    # Ask for extra candidates because long mixes/albums are deliberately
    # removed before results reach the app.
    fetch_limit = min(20, max(limit, limit * 2))
    options = {
        **_base_ydl_options(),
        "extract_flat": True,
        "skip_download": True,
    }

    with YoutubeDL(options) as ydl:
        info = ydl.extract_info("ytsearch" + str(fetch_limit) + ":" + query, download=False)

    entries = info.get("entries") or []
    results: list[dict[str, Any]] = []

    for entry in entries:
        if not entry:
            continue

        video_id = str(entry.get("id") or "")
        if not VIDEO_ID_RE.fullmatch(video_id):
            continue

        duration = entry.get("duration") or 0
        duration_seconds = int(duration) if duration else 0
        if duration_seconds > MAX_SEARCH_DURATION_SECONDS:
            continue

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
                "durationSeconds": duration_seconds,
                "thumbnail": thumbnail,
            }
        )
        if len(results) >= limit:
            break

    _search_cache[cache_key] = CacheEntry(
        expires_at=now + SEARCH_CACHE_TTL_SECONDS,
        value=results,
    )
    return list(results)


def _safe_headers(info: dict[str, Any]) -> dict[str, str]:
    raw_headers = info.get("http_headers") or {}
    return {
        str(key): str(value)
        for key, value in raw_headers.items()
        if str(key).lower() in SAFE_HEADER_NAMES and value
    }


def _estimated_audio_size_bytes(item: dict[str, Any], duration_seconds: float) -> int | None:
    for key in ("filesize", "filesize_approx"):
        raw = item.get(key)
        if raw:
            try:
                value = int(raw)
                if value > 0:
                    return value
            except (TypeError, ValueError):
                pass

    bitrate_kbps = item.get("tbr") or item.get("abr")
    if bitrate_kbps and duration_seconds > 0:
        try:
            # Small safety margin for container/transport overhead.
            return int(float(bitrate_kbps) * 1000 / 8 * duration_seconds * 1.05)
        except (TypeError, ValueError):
            pass
    return None


def _candidate_within_limit(
    item: dict[str, Any],
    duration_seconds: float,
) -> tuple[bool, int | None]:
    size_bytes = _estimated_audio_size_bytes(item, duration_seconds)
    if size_bytes is not None:
        return size_bytes <= MAX_AUDIO_BYTES, size_bytes

    # When YouTube omits filesize information, be conservative. This prevents
    # long albums/mixes from slipping through just because the CDN did not
    # expose Content-Length during extraction.
    if duration_seconds > MAX_SEARCH_DURATION_SECONDS:
        return False, None
    return True, None


def _extract_stream(
    info: dict[str, Any],
) -> tuple[str | None, dict[str, str], int | None]:
    duration_seconds = float(info.get("duration") or 0)
    stream_headers = _safe_headers(info)
    saw_oversized_audio = False

    # Never accept a muxed/video stream. Seven Music is audio-only.
    stream_url = info.get("url")
    if stream_url and info.get("vcodec") == "none":
        allowed, size_bytes = _candidate_within_limit(info, duration_seconds)
        if allowed:
            return str(stream_url), stream_headers, size_bytes
        saw_oversized_audio = True

    requested = info.get("requested_formats") or []
    for audio in requested:
        if not audio or audio.get("vcodec") != "none" or not audio.get("url"):
            continue
        allowed, size_bytes = _candidate_within_limit(audio, duration_seconds)
        if allowed:
            return str(audio.get("url")), _safe_headers(audio) or stream_headers, size_bytes
        saw_oversized_audio = True

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
    for candidate in candidates:
        allowed, size_bytes = _candidate_within_limit(candidate, duration_seconds)
        if allowed:
            return (
                str(candidate.get("url")),
                _safe_headers(candidate) or stream_headers,
                size_bytes,
            )
        saw_oversized_audio = True

    if saw_oversized_audio:
        raise AudioTooLargeError(
            "Esta faixa ultrapassa o limite de 12 MB do Seven Music."
        )
    return None, stream_headers, None


def _resolve_sync(video_id: str) -> dict[str, Any]:
    now = time.time()
    cached = _resolve_cache.get(video_id)
    if cached and cached.expires_at > now:
        return cached.value

    url = "https://www.youtube.com/watch?v=" + video_id
    provider_url = os.getenv("YTDLP_POT_PROVIDER_URL", "").strip()
    js_runtimes = _available_js_runtimes()

    strategies: list[tuple[list[str], str, bool]] = []

    if provider_url:
        # Current yt-dlp guidance recommends mweb + a PO Token provider.
        # Try it first so we do not spend the Vercel timeout budget on a
        # datacenter-blocked client before POT generation even starts.
        strategies.append((
            ["mweb"],
            "bestaudio[protocol^=http]/bestaudio",
            True,
        ))
        if os.getenv("YTDLP_PROXY_ROTATE", "").strip().lower() in {"1", "true", "yes", "on"}:
            # A fresh YoutubeDL instance normally opens a fresh proxy
            # connection, giving Webshare rotation a second exit-IP chance.
            strategies.append((
                ["mweb"],
                "bestaudio[protocol^=http]/bestaudio",
                True,
            ))

    if js_runtimes:
        # android_vr currently avoids the GVS PO-token path and is a useful
        # no-cookie fallback for ordinary music videos.
        strategies.append((
            ["android_vr"],
            "bestaudio[protocol^=http]/bestaudio",
            False,
        ))
        # web_safari HLS can remain playable when direct GVS URLs are guarded.
        strategies.append((
            ["web_safari"],
            "bestaudio[protocol^=m3u8]/bestaudio[protocol^=http]/bestaudio",
            False,
        ))
        # Embedded is limited to embeddable videos but is cheap to try.
        strategies.append((
            ["web_embedded"],
            "bestaudio[protocol^=http]/bestaudio",
            False,
        ))
    else:
        # Vercel should normally delegate to Render. Keep lightweight local
        # fallbacks for development or a temporary upstream outage.
        strategies.extend([
            (
                ["web_safari"],
                "bestaudio[protocol^=m3u8]/bestaudio",
                False,
            ),
            (
                ["web_embedded"],
                "bestaudio[protocol^=http]/bestaudio",
                False,
            ),
            (
                ["android_vr"],
                "bestaudio[protocol^=http]/bestaudio",
                False,
            ),
        ])

    last_error: Exception | None = None

    for clients, format_selector, use_pot in strategies:
        options = {
            **_base_ydl_options(),
            "format": format_selector,
            "skip_download": True,
            "extractor_args": _extractor_args(
                clients=clients,
                include_pot=use_pot,
            ),
        }

        try:
            with YoutubeDL(options) as ydl:
                info = ydl.extract_info(url, download=False)

            stream_url, stream_headers, size_bytes = _extract_stream(info)
            if not stream_url:
                continue

            value = {
                "videoId": video_id,
                "streamUrl": stream_url,
                "streamHeaders": stream_headers,
                "expiresAt": None,
                "strategy": clients[0],
                "sizeBytes": size_bytes,
            }
            _resolve_cache[video_id] = CacheEntry(
                expires_at=now + CACHE_TTL_SECONDS,
                value=value,
            )
            return value
        except AudioTooLargeError:
            raise
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
        "version": "0.2.6",
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
        query = q.strip()
        if _resolver_upstreams():
            try:
                items = await asyncio.to_thread(_search_upstream_sync, query, limit)
                return {"items": items}
            except Exception as upstream_exc:
                print(
                    "Seven Music search upstream resolver failed:",
                    type(upstream_exc).__name__,
                    str(upstream_exc),
                    file=sys.stderr,
                )

        items = await asyncio.to_thread(_search_sync, query, limit)
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
        if _resolver_upstreams():
            try:
                return await asyncio.to_thread(_resolve_upstream_sync, video_id)
            except AudioTooLargeError:
                raise
            except Exception as upstream_exc:
                print(
                    "Seven Music upstream resolver failed:",
                    type(upstream_exc).__name__,
                    str(upstream_exc),
                    file=sys.stderr,
                )
                if os.getenv("VERCEL"):
                    raise HTTPException(
                        status_code=502,
                        detail="O serviço de áudio online está indisponível no momento.",
                    ) from upstream_exc

        return await asyncio.to_thread(_resolve_sync, video_id)
    except HTTPException:
        raise
    except AudioTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
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
