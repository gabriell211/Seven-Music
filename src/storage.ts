import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  favorites: '@seven-music/favorites',
  currentTrack: '@seven-music/current-track',
} as const;

export async function loadFavorites(): Promise<string[]> {
  const value = await AsyncStorage.getItem(KEYS.favorites);
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
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
