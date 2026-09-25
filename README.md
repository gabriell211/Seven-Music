# Seven Music

<p align="center">
  <img src="assets/brand/seven-mark.svg" width="96" alt="Seven Music">
</p>

Aplicativo mobile para Android e iOS com biblioteca local e pesquisa/reprodução online via SoundCloud, mantendo a identidade visual preto/violeta do Seven Music.

API de produção: https://seven-music-three.vercel.app

## O que já funciona

- Expo SDK 57, React Native 0.86.3, React 19.2.3 e TypeScript 6 em modo strict.
- Home, Músicas locais, Músicas online, Playlists, Player completo e Configurações.
- Scanner real das músicas disponíveis no aparelho por `expo-media-library`.
- Reprodução local e online com background playback e controles da tela bloqueada.
- Mini-player, progresso/seek, fila contextual, auto-next, shuffle e repeat.
- Favoritos, playlists, histórico e fila persistidos com AsyncStorage.
- Busca online pelo SoundCloud.
- Somente resultados `playable` entram na busca online.
- Reprodução SoundCloud por streams AAC/HLS resolvidos no backend.
- Preferência por `hls_aac_160_url` com fallback para `hls_aac_96_url`.
- URLs temporárias de stream não são persistidas no dispositivo.
- Capas, artista, duração e link original do SoundCloud preservados.
- A tela do player oferece acesso à página original da faixa no SoundCloud.
- Backend FastAPI sem yt-dlp e sem scraping do YouTube.
- CI valida Expo, TypeScript e backend Python.

## Arquitetura

    Seven Music Mobile
      ├─ Device Library
      │    └─ expo-media-library
      ├─ Player
      │    └─ react-native-track-player
      └─ SoundCloud
           └─ Seven Music API
                ├─ FastAPI
                ├─ GET /v1/soundcloud/search
                └─ GET /v1/soundcloud/resolve/{track_urn}

O token do SoundCloud fica somente no backend. O aplicativo mobile nunca recebe `SOUNDCLOUD_ACCESS_TOKEN`.

## Configuração

Crie um `.env` local a partir do exemplo:

    cp .env.example .env

Variáveis:

    EXPO_PUBLIC_SEVEN_API_URL=https://seven-music-three.vercel.app
    SOUNDCLOUD_CLIENT_ID=...
    SOUNDCLOUD_ACCESS_TOKEN=...

O `SOUNDCLOUD_ACCESS_TOKEN` deve ser configurado como secret no ambiente onde o backend roda. Quando o token atual for revogado, basta trocar essa variável; não é necessário alterar o código.

## Rodar o aplicativo

    npm install
    npm run start

Para Android/iOS nativo:

    npm run android
    npm run ios

## Rodar a API localmente

    cd server
    docker compose up --build

Teste:

    curl http://localhost:8787/health
    curl "http://localhost:8787/v1/soundcloud/search?q=linkin%20park&limit=5"

## Release Android

Um push na `main` executa o CI sem publicar APK. Para publicar uma release, atualize a versão em `package.json` e `app.json`, crie o tag correspondente (`vX.Y.Z`) e envie esse tag.

## Segurança

- Nunca versione `SOUNDCLOUD_ACCESS_TOKEN`, refresh token ou client secret.
- O backend valida a URN antes de consultar streams.
- O app recebe apenas a URL de reprodução necessária para o player.
- URLs assinadas/temporárias do SoundCloud não são persistidas.
- Faixas bloqueadas ou sem stream AAC completo retornam erro explícito.
- Respostas 401, 403, 404 e 429 do SoundCloud são tratadas pelo backend.

## Identidade visual

Os arquivos vetoriais fonte ficam em `assets/brand/`.

- `seven-mark.svg`: símbolo principal.
- `app-icon-source.svg`: fonte do ícone.
- `src/components/SevenMark.tsx`: componente equivalente no app.
