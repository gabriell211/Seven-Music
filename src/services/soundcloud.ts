import type { Track } from '@/music';

type SearchItem = {
  trackUrn: string;
  title: string;
  artist: string;
  durationSeconds: number;
  thumbnail: string | null;
  permalinkUrl: string | null;
  access: 'playable' | 'preview' | 'blocked' | string;
  transcodingFormat: string | null;
};

type SearchResponse = { items: SearchItem[] };

export type ResolvedSoundCloudStream = {
  trackUrn: string;
  streamUrl: string;
  streamHeaders: Record<string, string>;
  format: string;
};

const DEFAULT_API_URL = 'https://seven-music-three.vercel.app';
const API_URL = (process.env.EXPO_PUBLIC_SEVEN_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');

const PALETTES = [
  ['#1C1B18', '#9A8B71', '#151515'],
  ['#21180E', '#73543C', '#101014'],
  ['#0C2226', '#5C8E93', '#101014'],
  ['#1A1715', '#806A58', '#0B0C10'],
  ['#211225', '#6F2F78', '#0B0910'],
] as const;

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return String(Math.floor(total / 60)) + ':' + String(total % 60).padStart(2, '0');
}

function paletteFor(id: string): readonly [string, string, ...string[]] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTES[hash % PALETTES.length]!;
}

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_SEVEN_API_URL não está configurada.');

  const response = await fetch(API_URL + path, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    let detail = 'Falha ao acessar o SoundCloud.';
    try {
      const body = await response.json() as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Keep generic message.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function soundCloudApiConfigured(): boolean {
  return API_URL.length > 0;
}

export async function searchSoundCloud(query: string, signal?: AbortSignal): Promise<Track[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const data = await apiFetch<SearchResponse>(
    '/v1/soundcloud/search?q=' + encodeURIComponent(trimmed) + '&limit=12',
    signal,
  );

  return data.items
    .filter((item) => item.access === 'playable')
    .map((item) => ({
      id: item.trackUrn,
      soundcloudUrn: item.trackUrn,
      title: item.title,
      artist: item.artist,
      durationSeconds: item.durationSeconds,
      duration: formatDuration(item.durationSeconds),
      thumbnail: item.thumbnail ?? undefined,
      permalinkUrl: item.permalinkUrl ?? undefined,
      source: 'soundcloud' as const,
      colors: paletteFor(item.trackUrn),
    }));
}

export async function resolveSoundCloudStream(
  trackUrn: string,
  options: {
    permalinkUrl?: string;
    title?: string;
    artist?: string;
  } = {},
): Promise<ResolvedSoundCloudStream> {
  const params = new URLSearchParams();
  if (options.permalinkUrl) params.set('url', options.permalinkUrl);
  if (options.title) params.set('title', options.title);
  if (options.artist) params.set('artist', options.artist);

  const query = params.toString();
  return apiFetch<ResolvedSoundCloudStream>(
    '/v1/soundcloud/resolve/' + encodeURIComponent(trackUrn) + (query ? '?' + query : ''),
  );
}
