# Seven Music API

Backend do Seven Music para pesquisa e reprodução online via SoundCloud.

## Stack

- FastAPI
- API pública do SoundCloud
- Streaming AAC/HLS
- Sem yt-dlp, cookies ou PO Token

## Variáveis

    SOUNDCLOUD_CLIENT_ID=...
    SOUNDCLOUD_ACCESS_TOKEN=...

O access token é enviado somente do backend ao SoundCloud no header `Authorization: OAuth ...`.

## Subir

    cd server
    docker compose up --build

Teste:

    curl http://localhost:8787/health

Pesquisa:

    curl "http://localhost:8787/v1/soundcloud/search?q=linkin%20park&limit=5"

Resolver stream:

    curl "http://localhost:8787/v1/soundcloud/resolve/soundcloud:tracks:TRACK_ID"

O resolver prefere `hls_aac_160_url` e usa `hls_aac_96_url` como fallback. Faixas sem stream completo disponível são rejeitadas em vez de reproduzir apenas preview.
