# Seven Music

<p align="center">
  <img src="assets/brand/seven-mark.svg" width="96" alt="Seven Music">
</p>

Aplicativo mobile para Android e iOS com biblioteca local e pesquisa/reprodução online via YouTube, mantendo a identidade visual preto/violeta aprovada para o Seven Music.

API de produção: https://seven-music-three.vercel.app

## O que já funciona

- Expo SDK 57, React Native 0.86.3, React 19.2.3 e TypeScript 6 em modo strict.
- Home, Músicas locais, Músicas online, Playlists, Player completo e Configurações.
- Scanner real das músicas disponíveis no aparelho por `expo-media-library`.
- Reprodução local real por `expo-audio`.
- Background playback e metadados para controles da tela bloqueada.
- Mini-player persistente entre as abas.
- Barra de progresso e seek reais.
- Próxima/anterior com fila contextual.
- Auto-next real quando a faixa termina.
- Shuffle e repeat (fila/faixa) persistentes.
- Tela de fila com reprodução direta, remoção e limpeza.
- Favoritos e fila persistidos com AsyncStorage.
- Playlists criáveis/editáveis com músicas locais e do YouTube.
- Histórico real das músicas reproduzidas.
- Busca separada para músicas do aparelho e do YouTube.
- Reprodução do YouTube exclusivamente em áudio, sem fallback para vídeo.
- Capas reais dos resultados online.
- Backend FastAPI + yt-dlp para pesquisa e resolução de streams.
- Deno para os desafios JavaScript atuais do YouTube.
- PO Token Provider isolado no Docker Compose.
- Headers necessários do stream são transportados até o player mobile.
- Resolução online com failover no Render e cookies do YouTube configurados apenas como secret no serviço.
- URLs temporárias do YouTube não são persistidas.
- CI valida compatibilidade com Expo, TypeScript e backend Python.

## Arquitetura

    Seven Music Mobile
      ├─ Device Library
      │    └─ expo-media-library
      ├─ Player
      │    └─ expo-audio
      └─ YouTube
           └─ Seven Music API
                ├─ FastAPI
                ├─ yt-dlp
                ├─ Deno
                └─ PO Token Provider

## Rodar o aplicativo

    npm install
    cp .env.example .env
    npm run start

Para Android/iOS nativo:

    npm run android
    npm run ios

## Rodar o serviço do YouTube

    cd server
    docker compose up --build

Depois configure o endereço acessível pelo celular:

    EXPO_PUBLIC_SEVEN_API_URL=https://seven-music-three.vercel.app

Teste rápido:

    curl http://localhost:8787/health

## Identidade visual

Os arquivos vetoriais fonte ficam em `assets/brand/`.

- `seven-mark.svg`: símbolo principal.
- `app-icon-source.svg`: fonte do ícone.
- O componente mobile equivalente está em `src/components/SevenMark.tsx`.

A interface usa fundo quase preto, superfícies grafite, acento violeta e o símbolo Seven em gradiente, seguindo a referência visual aprovada.

## Segurança

- Nenhum cookie, token OAuth ou credencial do YouTube deve entrar no repositório.
- IDs de vídeo são validados no backend.
- O PO Token Provider fica apenas na rede interna do Docker Compose.
- O aplicativo recebe somente os headers estritamente necessários para tocar a mídia.
- Cookies, quando realmente necessários em um ambiente próprio, devem ser montados externamente e apontados por `YTDLP_COOKIES_FILE`.

## Próximos marcos

1. Metadados e capas para arquivos locais.
2. Letras sincronizadas e tela dedicada.
3. Editor avançado de fila (reordenação por drag-and-drop).
4. Assets nativos finais de ícone/splash e builds de distribuição.
5. Testes automatizados de domínio e E2E.
6. Equalizador e presets locais.
