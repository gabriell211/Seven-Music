import {
  AssetField,
  MediaType,
  Query,
  requestPermissionsAsync,
} from 'expo-media-library';
import type { Track } from '@/music';

const BATCH_SIZE = 100;
const MAX_TRACKS = 5000;
const PALETTES = [
  ['#16051E', '#61205D', '#05070B'],
  ['#322B23', '#8A795E', '#171A1D'],
  ['#101629', '#294B91', '#07080C'],
  ['#211126', '#873A8B', '#09070C'],
  ['#10201E', '#34786A', '#070B0A'],
] as const;

export type ScanResult =
  | { status: 'ready'; tracks: Track[] }
  | { status: 'denied'; tracks: [] };

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return String(minutes) + ':' + rest.toString().padStart(2, '0');
}

function parseFilename(filename: string): { title: string; artist: string } {
  const withoutExtension = filename.replace(/\.[^/.]+$/, '').trim();
  const separator = withoutExtension.indexOf(' - ');

  if (separator > 0) {
    return {
      artist: withoutExtension.slice(0, separator).trim() || 'Artista desconhecido',
      title: withoutExtension.slice(separator + 3).trim() || withoutExtension,
    };
  }

  return {
    title: withoutExtension || 'Faixa sem título',
    artist: 'Artista desconhecido',
  };
}

function paletteFor(id: string): readonly [string, string, ...string[]] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTES[hash % PALETTES.length]!;
}

export async function scanDeviceMusic(): Promise<ScanResult> {
  const permission = await requestPermissionsAsync(false, ['audio']);

  if (!permission.granted) {
    return { status: 'denied', tracks: [] };
  }

  const tracks: Track[] = [];
  let offset = 0;

  while (offset < MAX_TRACKS) {
    const assets = await new Query()
      .eq(AssetField.MEDIA_TYPE, MediaType.AUDIO)
      .orderBy({ key: AssetField.MODIFICATION_TIME, ascending: false })
      .limit(BATCH_SIZE)
      .offset(offset)
      .exe();

    if (assets.length === 0) break;

    const batch = await Promise.all(
      assets.map(async (asset): Promise<Track | null> => {
        try {
          const [filename, uri, durationMs] = await Promise.all([
            asset.getFilename(),
            asset.getUri(),
            asset.getDuration(),
          ]);

          if (!uri) return null;

          const parsed = parseFilename(filename);
          const durationSeconds = Math.max(0, (durationMs ?? 0) / 1000);

          return {
            id: 'device:' + asset.id,
            assetId: asset.id,
            filename,
            uri,
            title: parsed.title,
            artist: parsed.artist,
            duration: formatDuration(durationSeconds),
            durationSeconds,
            source: 'local',
            colors: paletteFor(asset.id),
          };
        } catch {
          return null;
        }
      }),
    );

    tracks.push(...batch.filter((track): track is Track => track !== null));

    offset += assets.length;
    if (assets.length < BATCH_SIZE) break;
  }

  return { status: 'ready', tracks };
}
