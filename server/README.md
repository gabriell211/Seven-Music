# Seven Music API

Backend do Seven Music para pesquisa e reprodução online via SoundCloud.

## Fonte online

O backend usa o mesmo host consumido pelo cliente web do SoundCloud:

    https://api-v2.soundcloud.com

A busca pública usa `client_id`. Para tocar uma faixa, o backend lê
`media.transcodings`, escolhe um transcoding completo e resolve a URL assinada
passando `client_id` e, quando fornecido pela faixa, `track_authorization`.

Essa API v2 é interna/não documentada publicamente como contrato estável pelo
SoundCloud, então os endpoints podem mudar sem aviso.

## Variáveis

    SOUNDCLOUD_CLIENT_ID=...
    SOUNDCLOUD_ACCESS_TOKEN=...

`SOUNDCLOUD_CLIENT_ID` é obrigatório para busca e playback públicos.
`SOUNDCLOUD_ACCESS_TOKEN` é opcional e usado apenas em rotas autenticadas como
`/v1/soundcloud/me`.

## Subir

    cd server
    docker compose up --build

Teste:

    curl http://localhost:8787/health

Pesquisa:

    curl "http://localhost:8787/v1/soundcloud/search?q=linkin%20park&limit=5"

Resolver stream:

    curl "http://localhost:8787/v1/soundcloud/resolve/soundcloud:tracks:TRACK_ID"

O resolver prefere MP3 progressive para compatibilidade com o player mobile e
faz fallback para outros transcodings completos disponíveis.
