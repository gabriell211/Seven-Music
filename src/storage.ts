import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryEntry, Playlist } from './collection-types';
import type { Track } from './music';

const KEYS = {
  favorites: '@seven-music/favorites',
  currentTrack: '@seven-music/current-track',
  queue: '@seven-music/queue',
  playlists: '@seven-music/playlists',
  history: '@seven-music/history',
  trackSnapshots: '@seven-music/track-snapshots',
  shuffle: '@seven-music/shuffle',
  repeat: '@seven-music/repeat',
} as const;

let snapshotWrite: Promise<void> = Promise.resolve();

function enqueueSnapshotWrite(work: () => Promise<void>): Promise<void> {
  const next = snapshotWrite.catch(() => undefined).then(work);
  snapshotWrite = next;
  return next;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseStringArray(value: string | null): string[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === 'string')
    : [];
}

export async function loadFavorites(): Promise<string[]> {
  return parseStringArray(await AsyncStorage.getItem(KEYS.favorites));
}

export async function saveFavorites(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.favorites, JSON.stringify(ids));
}

export async function loadCurrentTrackId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.currentTrack);
}

export async function saveCurrentTrackId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.currentTrack, id);
}

export async function loadQueueIds(): Promise<string[]> {
  return parseStringArray(await AsyncStorage.getItem(KEYS.queue));
}

export async function saveQueueIds(ids: readonly string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.queue, JSON.stringify(ids));
}

export async function loadPlaylists(): Promise<Playlist[]> {
  const parsed = parseJson<unknown>(await AsyncStorage.getItem(KEYS.playlists), []);
  return Array.isArray(parsed) ? parsed as Playlist[] : [];
}

export async function savePlaylists(playlists: readonly Playlist[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.playlists, JSON.stringify(playlists));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const parsed = parseJson<unknown>(await AsyncStorage.getItem(KEYS.history), []);
  return Array.isArray(parsed) ? parsed as HistoryEntry[] : [];
}

export async function saveHistory(entries: readonly HistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.history, JSON.stringify(entries));
}

export async function loadTrackSnapshots(): Promise<Record<string, Track>> {
  return parseJson<Record<string, Track>>(
    await AsyncStorage.getItem(KEYS.trackSnapshots),
    {},
  );
}

export async function saveTrackSnapshot(track: Track): Promise<void> {
  await saveTrackSnapshots([track]);
}

export function saveTrackSnapshots(tracks: readonly Track[]): Promise<void> {
  return enqueueSnapshotWrite(async () => {
    const snapshots = await loadTrackSnapshots();
    for (const track of tracks) {
      snapshots[track.id] = {
        ...track,
        uri: track.source === 'soundcloud' ? undefined : track.uri,
        requestHeaders: undefined,
      };
    }
    await AsyncStorage.setItem(KEYS.trackSnapshots, JSON.stringify(snapshots));
  });
}

export async function clearTrackSnapshots(): Promise<void> {
  await enqueueSnapshotWrite(() => AsyncStorage.removeItem(KEYS.trackSnapshots));
}

export async function loadShuffle(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.shuffle)) === '1';
}

export async function saveShuffle(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.shuffle, enabled ? '1' : '0');
}

export type RepeatMode = 'off' | 'all' | 'one';

export async function loadRepeatMode(): Promise<RepeatMode> {
  const value = await AsyncStorage.getItem(KEYS.repeat);
  return value === 'all' || value === 'one' ? value : 'off';
}

export async function saveRepeatMode(mode: RepeatMode): Promise<void> {
  await AsyncStorage.setItem(KEYS.repeat, mode);
}
