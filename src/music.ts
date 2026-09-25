export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  durationSeconds?: number;
  source: 'local' | 'soundcloud';
  colors: readonly [string, string, ...string[]];
  uri?: string;
  requestHeaders?: Record<string, string>;
  assetId?: string;
  filename?: string;
  soundcloudUrn?: string;
  soundcloudTranscodingUrl?: string;
  soundcloudTrackAuthorization?: string;
  permalinkUrl?: string;
  thumbnail?: string;
};

export const localTracks: Track[] = [
  { id: 'after-dark', title: 'After Dark', artist: 'Mr.Kitty', duration: '3:50', source: 'local', colors: ['#16051E', '#61205D', '#05070B'] },
  { id: 'numb', title: 'Numb', artist: 'Linkin Park', album: 'Meteora', duration: '3:07', source: 'local', colors: ['#322B23', '#8A795E', '#171A1D'] },
  { id: 'faint', title: 'Faint', artist: 'Linkin Park', album: 'Meteora', duration: '2:42', source: 'local', colors: ['#3C3227', '#A08A63', '#111318'] },
  { id: 'sweater', title: 'Sweater Weather', artist: 'The Neighbourhood', duration: '4:00', source: 'local', colors: ['#252525', '#747474', '#101010'] },
  { id: 'montagem', title: 'Montagem Corsetão', artist: 'MC GW', duration: '2:10', source: 'local', colors: ['#17051E', '#7C1286', '#050509'] }
];
