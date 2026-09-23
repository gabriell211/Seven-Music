# Seven Music

Aplicativo mobile de música para Android e iOS com identidade visual própria em preto e violeta.

## Estado atual

- Expo SDK 57 + React Native 0.86 + React 19.2.
- Expo Router.
- Home, busca, biblioteca, playlists, player e configurações.
- Mini-player persistente.
- Design system Seven Music.
- Modelo de dados preparado para faixas locais e YouTube.
- Estrutura preparada para plugar playback real e o serviço de resolução do YouTube sem reescrever a interface.

## Rodar

    npm install
    npx expo install --fix
    npm run start

## Próximas etapas

1. Scanner real de músicas locais.
2. Playback real com expo-audio.
3. Busca e resolução YouTube no backend.
4. Persistência de fila, favoritos, histórico e playlists.
5. Testes e builds EAS.

O repositório não deve conter cookies, credenciais nem tokens de sessão.