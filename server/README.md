# Seven Music API

Backend isolado para a fonte online do Seven Music.

## Stack

- FastAPI na porta 8787
- yt-dlp 2026.8.19
- Deno 2.9.7 para desafios JavaScript do YouTube
- bgutil PO Token Provider 2.0.0

## Subir

    cd server
    docker compose up --build

Teste:

    curl http://localhost:8787/health

Pesquisa:

    curl "http://localhost:8787/v1/youtube/search?q=linkin%20park&limit=5"

No app, configure EXPO_PUBLIC_SEVEN_API_URL apontando para o IP/host dessa API.

Em produção, configure `YTDLP_COOKIES_B64` como secret do serviço Render com o conteúdo de um `cookies.txt` do YouTube em Base64. Para execução local, monte o arquivo fora do repositório e defina `YTDLP_COOKIES_FILE`. `YTDLP_PROXY` pode definir uma saída de rede própria. Nunca versione cookies ou credenciais.
