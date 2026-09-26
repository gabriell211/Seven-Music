from __future__ import annotations

import asyncio
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import time
from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, HTTPException, Query


SOUNDCLOUD_API_BASE = "https://api-v2.soundcloud.com"
TRACK_URN_RE = re.compile(r"^(?:soundcloud:tracks:)?\d+$")
TRACK_CACHE_TTL_SECONDS = int(os.getenv("SEVEN_SOUNDCLOUD_TRACK_CACHE_TTL_SECONDS", "300"))


@dataclass(slots=True)
class TrackCacheEntry:
    expires_at: float
    track: dict[str, Any]


_track_cache: dict[str, TrackCacheEntry] = {}

app = FastAPI(
    title="Seven Music API",
    version="0.3.2",
    docs_url=None,
    redoc_url=None,
)


class SoundCloudApiError(RuntimeError):
    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        super().__init__(message)


def _client_id() -> str:
    client_id = os.getenv("SOUNDCLOUD_CLIENT_ID", "").strip()
    if not client_id:
        raise SoundCloudApiError(
            503,
            "SOUNDCLOUD_CLIENT_ID não está configurado no servidor.",
        )
    return client_id


def _access_token() -> str | None:
    raw = os.getenv("SOUNDCLOUD_ACCESS_TOKEN", "").strip()
    if not raw:
        return None
    return raw[6:].strip() if raw.lower().startswith("oauth ") else raw


def _soundcloud_request(
    path_or_url: str,
    params: dict[str, str | int] | None = None,
    *,
    authenticated: bool = False,
    send_access_token: bool = True,
) -> Any:
    query_params: dict[str, str | int] = {"client_id": _client_id()}
    if params:
        query_params.update(params)

    separator = "&" if "?" in path_or_url else "?"
    base_url = (
        path_or_url
        if path_or_url.startswith(("https://", "http://"))
        else SOUNDCLOUD_API_BASE + path_or_url
    )
    url = base_url + separator + urllib.parse.urlencode(query_params)

    headers = {
        "Accept": "application/json",
        "Origin": "https://soundcloud.com",
        "Referer": "https://soundcloud.com/",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/154.0.0.0 Safari/537.36"
        ),
    }

    token = _access_token()
    if authenticated and not token:
        raise SoundCloudApiError(
            503,
            "SOUNDCLOUD_ACCESS_TOKEN não está configurado no servidor.",
        )
    if token and send_access_token:
        headers["Authorization"] = f"OAuth {token}"

    request = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        if status == 401:
            message = "O SoundCloud recusou a credencial usada nesta requisição."
        elif status == 403:
            message = "O SoundCloud bloqueou esta requisição ou faixa."
        elif status == 404:
            message = "Faixa não encontrada no SoundCloud."
        elif status == 429:
            message = "Limite temporário do SoundCloud atingido. Tente novamente em instantes."
        else:
            message = "O SoundCloud não respondeu como esperado."
        raise SoundCloudApiError(status, message) from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise SoundCloudApiError(
            502,
            "Não foi possível conectar ao SoundCloud no momento.",
        ) from exc


def _track_urn(track: dict[str, Any]) -> str | None:
    urn = track.get("urn")
    if isinstance(urn, str) and TRACK_URN_RE.fullmatch(urn):
        return urn

    track_id = track.get("id")
    if isinstance(track_id, int) or (isinstance(track_id, str) and track_id.isdigit()):
        return f"soundcloud:tracks:{track_id}"

    return None


def _numeric_track_id(track_urn: str) -> str:
    return track_urn.rsplit(":", 1)[-1]


def _transcodings(track: dict[str, Any]) -> list[dict[str, Any]]:
    media = track.get("media")
    if not isinstance(media, dict):
        return []

    raw = media.get("transcodings")
    if not isinstance(raw, list):
        return []

    return [item for item in raw if isinstance(item, dict)]


def _has_full_stream(track: dict[str, Any]) -> bool:
    if track.get("streamable") is False:
        return False
    if str(track.get("policy") or "").upper() in {"BLOCK", "SNIP"}:
        return False

    return any(
        isinstance(item.get("url"), str)
        and bool(item.get("url"))
        and item.get("snipped") is not True
        for item in _transcodings(track)
    )


def _normalize_track(track: dict[str, Any]) -> dict[str, Any] | None:
    urn = _track_urn(track)
    if not urn:
        return None

    user = track.get("user") if isinstance(track.get("user"), dict) else {}
    publisher = (
        track.get("publisher_metadata")
        if isinstance(track.get("publisher_metadata"), dict)
        else {}
    )

    title = str(track.get("title") or "").strip()
    if not title:
        return None

    artist = str(
        publisher.get("artist")
        or user.get("username")
        or "Artista desconhecido"
    ).strip()

    duration_ms = track.get("full_duration") or track.get("duration") or 0
    try:
        duration_seconds = max(0, round(float(duration_ms) / 1000))
    except (TypeError, ValueError):
        duration_seconds = 0

    artwork = track.get("artwork_url") or user.get("avatar_url")

    access = "playable" if _has_full_stream(track) else "blocked"
    transcoding_url: str | None = None
    transcoding_format: str | None = None
    if access == "playable":
        try:
            transcoding = _select_transcoding(track)
            transcoding_url = str(transcoding.get("url") or "") or None
            fmt = transcoding.get("format")
            protocol = str(fmt.get("protocol") or "") if isinstance(fmt, dict) else ""
            preset = str(transcoding.get("preset") or "")
            transcoding_format = "-".join(
                part for part in (protocol, preset) if part
            ) or None
        except SoundCloudApiError:
            access = "blocked"

    return {
        "trackUrn": urn,
        "title": title,
        "artist": artist,
        "durationSeconds": duration_seconds,
        "thumbnail": str(artwork) if artwork else None,
        "permalinkUrl": str(track.get("permalink_url") or "") or None,
        "access": access,
        # Raw transcoding URLs and track_authorization tokens stay server-side.
        "transcodingFormat": transcoding_format,
    }


def _stream_score(transcoding: dict[str, Any]) -> tuple[int, int, int]:
    fmt = transcoding.get("format")
    if not isinstance(fmt, dict):
        fmt = {}

    protocol = str(fmt.get("protocol") or "").lower()
    mime_type = str(fmt.get("mime_type") or "").lower()
    preset = str(transcoding.get("preset") or "").lower()
    quality = str(transcoding.get("quality") or "").lower()

    # Current SoundCloud playback primarily uses HLS/AAC. Keep progressive
    # MP3 as a compatibility fallback for tracks that still expose it.
    protocol_score = 4 if protocol == "hls" else 3 if protocol == "progressive" else 0
    codec_score = (
        4 if "audio/mp4" in mime_type or "aac" in preset
        else 3 if "audio/mpeg" in mime_type
        else 2 if "opus" in mime_type or "opus" in preset
        else 1
    )
    quality_score = 2 if quality == "hq" else 1 if quality == "sq" else 0
    return protocol_score, codec_score, quality_score


def _transcoding_candidates(track: dict[str, Any]) -> list[dict[str, Any]]:
    candidates = [
        item
        for item in _transcodings(track)
        if isinstance(item.get("url"), str)
        and bool(item.get("url"))
        and item.get("snipped") is not True
    ]
    candidates.sort(key=_stream_score, reverse=True)
    return candidates


def _select_transcoding(track: dict[str, Any]) -> dict[str, Any]:
    candidates = _transcoding_candidates(track)
    if not candidates:
        raise SoundCloudApiError(
            409,
            "Esta faixa não possui um stream completo disponível para reprodução.",
        )
    return candidates[0]


def _transcoding_label(transcoding: dict[str, Any]) -> str:
    fmt = transcoding.get("format")
    protocol = str(fmt.get("protocol") or "") if isinstance(fmt, dict) else ""
    preset = str(transcoding.get("preset") or "")
    return "-".join(part for part in (protocol, preset) if part) or "soundcloud"


def _resolve_transcoding_candidate(
    transcoding: dict[str, Any],
    track_authorization: str | None,
) -> tuple[str, str]:
    transcoding_url = str(transcoding.get("url") or "")
    if not transcoding_url:
        raise SoundCloudApiError(502, "Transcoding do SoundCloud sem URL.")

    params: dict[str, str] = {}
    if track_authorization:
        params["track_authorization"] = track_authorization

    payload = _soundcloud_request(
        transcoding_url,
        params,
        send_access_token=False,
    )
    stream_url = payload.get("url") if isinstance(payload, dict) else None
    if not isinstance(stream_url, str) or not stream_url.startswith(("https://", "http://")):
        raise SoundCloudApiError(
            502,
            "O SoundCloud retornou uma URL de áudio inválida.",
        )

    return stream_url, _transcoding_label(transcoding)


def _resolve_transcoding(track: dict[str, Any]) -> tuple[str, str]:
    candidates = _transcoding_candidates(track)
    if not candidates:
        raise SoundCloudApiError(
            409,
            "Esta faixa não possui um stream completo disponível para reprodução.",
        )

    raw_authorization = track.get("track_authorization") or track.get("track_auth")
    track_authorization = (
        str(raw_authorization)
        if isinstance(raw_authorization, str) and raw_authorization
        else None
    )

    last_error: SoundCloudApiError | None = None
    for transcoding in candidates:
        try:
            return _resolve_transcoding_candidate(transcoding, track_authorization)
        except SoundCloudApiError as exc:
            last_error = exc
            if exc.status_code == 429:
                raise

    if last_error is not None:
        raise SoundCloudApiError(
            502,
            "Nenhum dos streams disponíveis desta faixa pôde ser resolvido.",
        ) from last_error

    raise SoundCloudApiError(
        409,
        "Esta faixa não possui um stream completo disponível para reprodução.",
    )


def _cache_track(track: dict[str, Any]) -> None:
    urn = _track_urn(track)
    if not urn:
        return
    _track_cache[urn] = TrackCacheEntry(
        expires_at=time.time() + TRACK_CACHE_TTL_SECONDS,
        track=track,
    )


def _cached_track(track_urn: str) -> dict[str, Any] | None:
    entry = _track_cache.get(track_urn)
    if entry is None:
        return None
    if entry.expires_at <= time.time():
        _track_cache.pop(track_urn, None)
        return None
    return entry.track


def _identity_queries(
    permalink_url: str | None,
    title: str | None,
    artist: str | None,
) -> list[str]:
    queries: list[str] = []

    combined = " ".join(
        part.strip()
        for part in (artist or "", title or "")
        if part and part.strip()
    )
    if combined:
        queries.append(combined)

    if permalink_url:
        parsed = urllib.parse.urlparse(permalink_url)
        parts = [part for part in parsed.path.split("/") if part]
        if parts:
            slug_parts = parts[-2:] if len(parts) >= 2 else parts
            slug_query = " ".join(part.replace("-", " ") for part in slug_parts).strip()
            if slug_query and slug_query not in queries:
                queries.append(slug_query)

    return queries


def _find_track_via_search(
    track_urn: str,
    *,
    permalink_url: str | None = None,
    title: str | None = None,
    artist: str | None = None,
) -> dict[str, Any] | None:
    for query in _identity_queries(permalink_url, title, artist):
        payload = _soundcloud_request(
            "/search/tracks",
            {
                "q": query,
                "limit": 20,
                "offset": 0,
                "linked_partitioning": 1,
                "app_locale": "pt_BR",
            },
        )
        collection = payload.get("collection") if isinstance(payload, dict) else None
        if not isinstance(collection, list):
            continue

        for raw in collection:
            if not isinstance(raw, dict):
                continue
            if _track_urn(raw) == track_urn:
                _cache_track(raw)
                return raw

    return None


def _raise_http(exc: SoundCloudApiError) -> None:
    status = exc.status_code if 400 <= exc.status_code <= 599 else 502
    raise HTTPException(status_code=status, detail=str(exc)) from exc


@app.get("/")
async def root() -> dict[str, Any]:
    return {
        "name": "Seven Music API",
        "status": "online",
        "version": "0.3.2",
        "provider": "soundcloud-api-v2",
        "configured": bool(os.getenv("SOUNDCLOUD_CLIENT_ID", "").strip()),
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/soundcloud/status")
async def soundcloud_status() -> dict[str, Any]:
    return {
        "configured": bool(os.getenv("SOUNDCLOUD_CLIENT_ID", "").strip()),
        "clientIdConfigured": bool(os.getenv("SOUNDCLOUD_CLIENT_ID", "").strip()),
        "accessTokenConfigured": bool(os.getenv("SOUNDCLOUD_ACCESS_TOKEN", "").strip()),
        "apiBase": SOUNDCLOUD_API_BASE,
    }


@app.get("/v1/soundcloud/search")
async def soundcloud_search(
    q: str = Query(min_length=2, max_length=120),
    limit: int = Query(default=12, ge=1, le=50),
) -> dict[str, list[dict[str, Any]]]:
    try:
        payload = await asyncio.to_thread(
            _soundcloud_request,
            "/search/tracks",
            {
                "q": q.strip(),
                "limit": limit,
                "offset": 0,
                "linked_partitioning": 1,
                "app_locale": "pt_BR",
            },
        )
    except SoundCloudApiError as exc:
        _raise_http(exc)

    collection = payload.get("collection") if isinstance(payload, dict) else None
    raw_items = collection if isinstance(collection, list) else []

    items: list[dict[str, Any]] = []
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        normalized = _normalize_track(raw)
        if normalized is not None and normalized["access"] == "playable":
            _cache_track(raw)
            items.append(normalized)

    return {"items": items[:limit]}


@app.get("/v1/soundcloud/resolve/{track_urn:path}")
async def soundcloud_resolve(
    track_urn: str,
    transcoding_url: str | None = Query(default=None, max_length=1000),
    track_authorization: str | None = Query(default=None, max_length=2000),
    url: str | None = Query(default=None, max_length=500),
    title: str | None = Query(default=None, max_length=300),
    artist: str | None = Query(default=None, max_length=300),
) -> dict[str, Any]:
    if not TRACK_URN_RE.fullmatch(track_urn):
        raise HTTPException(status_code=422, detail="URN de faixa inválido.")

    # Backward compatibility for released clients. A stale transcoding is
    # attempted once; recoverable failures fall through to fresh metadata.
    if transcoding_url:
        parsed = urllib.parse.urlparse(transcoding_url)
        if parsed.scheme != "https" or parsed.hostname != "api-v2.soundcloud.com":
            raise HTTPException(status_code=422, detail="URL de transcoding inválida.")
        if "/media/" not in parsed.path or "/stream/" not in parsed.path:
            raise HTTPException(status_code=422, detail="URL de transcoding inválida.")

        try:
            payload = await asyncio.to_thread(
                _soundcloud_request,
                transcoding_url,
                {"track_authorization": track_authorization} if track_authorization else {},
                send_access_token=False,
            )
            stream_url = payload.get("url") if isinstance(payload, dict) else None
            if isinstance(stream_url, str) and stream_url.startswith(("https://", "http://")):
                return {
                    "trackUrn": track_urn,
                    "streamUrl": stream_url,
                    "streamHeaders": {},
                    "format": "soundcloud-transcoding",
                }
        except SoundCloudApiError as exc:
            if exc.status_code == 429:
                _raise_http(exc)

    if url and not url.startswith(("https://soundcloud.com/", "http://soundcloud.com/")):
        raise HTTPException(status_code=422, detail="URL do SoundCloud inválida.")

    track_id = _numeric_track_id(track_urn)

    try:
        track: Any = _cached_track(track_urn)

        if not isinstance(track, dict) and url:
            try:
                track = await asyncio.to_thread(
                    _soundcloud_request,
                    "/resolve",
                    {"url": url},
                )
            except SoundCloudApiError as exc:
                if exc.status_code not in (404,):
                    raise

        if not isinstance(track, dict):
            try:
                track = await asyncio.to_thread(
                    _soundcloud_request,
                    f"/tracks/{track_id}",
                )
            except SoundCloudApiError as exc:
                if exc.status_code != 404:
                    raise

                hydrated = await asyncio.to_thread(
                    _soundcloud_request,
                    "/tracks",
                    {"ids": track_id},
                )
                if isinstance(hydrated, list) and hydrated:
                    track = hydrated[0]
                elif isinstance(hydrated, dict):
                    collection = hydrated.get("collection")
                    track = collection[0] if isinstance(collection, list) and collection else None

        if not isinstance(track, dict):
            track = await asyncio.to_thread(
                _find_track_via_search,
                track_urn,
                permalink_url=url,
                title=title,
                artist=artist,
            )

        if not isinstance(track, dict):
            raise SoundCloudApiError(
                404,
                "Faixa não encontrada no SoundCloud.",
            )

        _cache_track(track)

        if not _has_full_stream(track):
            raise SoundCloudApiError(
                409,
                "Esta faixa não está disponível para reprodução completa.",
            )

        stream_url, stream_format = await asyncio.to_thread(
            _resolve_transcoding,
            track,
        )
    except SoundCloudApiError as exc:
        _raise_http(exc)

    return {
        "trackUrn": _track_urn(track) or track_urn,
        "streamUrl": stream_url,
        "streamHeaders": {},
        "format": stream_format,
    }
