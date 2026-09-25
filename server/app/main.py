from __future__ import annotations

import asyncio
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from fastapi import FastAPI, HTTPException, Query


SOUNDCLOUD_API_BASE = "https://api.soundcloud.com"
TRACK_URN_RE = re.compile(r"^(?:soundcloud:tracks:)?\d+$")

app = FastAPI(
    title="Seven Music API",
    version="0.3.0",
    docs_url=None,
    redoc_url=None,
)


class SoundCloudApiError(RuntimeError):
    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        super().__init__(message)


def _authorization_header() -> str:
    raw = os.getenv("SOUNDCLOUD_ACCESS_TOKEN", "").strip()
    if not raw:
        raise SoundCloudApiError(
            503,
            "SOUNDCLOUD_ACCESS_TOKEN não está configurado no servidor.",
        )
    if raw.lower().startswith("oauth "):
        return raw
    return f"OAuth {raw}"


def _soundcloud_request(
    path: str,
    params: dict[str, str | int] | None = None,
) -> Any:
    query = urllib.parse.urlencode(params or {})
    url = SOUNDCLOUD_API_BASE + path + (f"?{query}" if query else "")
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json; charset=utf-8",
            "Authorization": _authorization_header(),
            "User-Agent": "SevenMusic/0.3",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        status = int(exc.code)
        if status == 401:
            message = "A autenticação do SoundCloud expirou ou é inválida."
        elif status == 403:
            message = "O SoundCloud bloqueou o acesso a este conteúdo."
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

    duration_ms = track.get("duration") or 0
    try:
        duration_seconds = max(0, round(float(duration_ms) / 1000))
    except (TypeError, ValueError):
        duration_seconds = 0

    artwork = track.get("artwork_url") or user.get("avatar_url")

    return {
        "trackUrn": urn,
        "title": title,
        "artist": artist,
        "durationSeconds": duration_seconds,
        "thumbnail": str(artwork) if artwork else None,
        "permalinkUrl": str(track.get("permalink_url") or "") or None,
        "access": str(track.get("access") or "playable"),
    }


def _select_stream(streams: dict[str, Any]) -> tuple[str, str]:
    preferred = (
        ("hls_aac_160_url", "hls-aac-160"),
        ("hls_aac_96_url", "hls-aac-96"),
    )
    for field, label in preferred:
        url = streams.get(field)
        if isinstance(url, str) and url:
            return url, label

    raise SoundCloudApiError(
        409,
        "Esta faixa não possui um stream AAC completo disponível para reprodução.",
    )


def _raise_http(exc: SoundCloudApiError) -> None:
    status = exc.status_code if 400 <= exc.status_code <= 599 else 502
    raise HTTPException(status_code=status, detail=str(exc)) from exc


@app.get("/")
async def root() -> dict[str, Any]:
    return {
        "name": "Seven Music API",
        "status": "online",
        "version": "0.3.0",
        "provider": "soundcloud",
        "configured": bool(os.getenv("SOUNDCLOUD_ACCESS_TOKEN", "").strip()),
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/v1/soundcloud/status")
async def soundcloud_status() -> dict[str, bool]:
    return {
        "configured": bool(os.getenv("SOUNDCLOUD_ACCESS_TOKEN", "").strip()),
        "clientIdConfigured": bool(os.getenv("SOUNDCLOUD_CLIENT_ID", "").strip()),
    }


@app.get("/v1/soundcloud/search")
async def soundcloud_search(
    q: str = Query(min_length=2, max_length=120),
    limit: int = Query(default=12, ge=1, le=50),
) -> dict[str, list[dict[str, Any]]]:
    try:
        payload = await asyncio.to_thread(
            _soundcloud_request,
            "/tracks",
            {
                "q": q.strip(),
                "access": "playable",
                "limit": limit,
                "linked_partitioning": "true",
            },
        )
    except SoundCloudApiError as exc:
        _raise_http(exc)

    raw_items: list[Any]
    if isinstance(payload, dict):
        collection = payload.get("collection")
        raw_items = collection if isinstance(collection, list) else []
    elif isinstance(payload, list):
        raw_items = payload
    else:
        raw_items = []

    items: list[dict[str, Any]] = []
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        normalized = _normalize_track(raw)
        if normalized is not None:
            items.append(normalized)

    return {"items": items[:limit]}


@app.get("/v1/soundcloud/resolve/{track_urn:path}")
async def soundcloud_resolve(track_urn: str) -> dict[str, Any]:
    if not TRACK_URN_RE.fullmatch(track_urn):
        raise HTTPException(status_code=422, detail="URN de faixa inválido.")

    encoded_urn = urllib.parse.quote(track_urn, safe=":")
    try:
        payload = await asyncio.to_thread(
            _soundcloud_request,
            f"/tracks/{encoded_urn}/streams",
        )
        if not isinstance(payload, dict):
            raise SoundCloudApiError(
                502,
                "O SoundCloud retornou uma resposta de stream inválida.",
            )
        stream_url, stream_format = _select_stream(payload)
    except SoundCloudApiError as exc:
        _raise_http(exc)

    return {
        "trackUrn": track_urn,
        "streamUrl": stream_url,
        "streamHeaders": {},
        "format": stream_format,
    }
