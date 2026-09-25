import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

export type EqualizerInfo = {
  frequencies: number[];
  minDb: number;
  maxDb: number;
};

export type EqualizerSettings = {
  enabled: boolean;
  preset: string;
  levels: number[];
};

const KEY = '@seven-music/equalizer';
const native = NativeModules.TrackPlayerModule as {
  getEqualizerInfo?: () => Promise<EqualizerInfo>;
  setEqualizer?: (enabled: boolean, levels: number[]) => Promise<void>;
} | undefined;

export const EQ_PRESETS = [
  { id: 'flat', label: 'Plano' },
  { id: 'bass', label: 'Graves' },
  { id: 'vocal', label: 'Voz' },
  { id: 'rock', label: 'Rock' },
  { id: 'electronic', label: 'Eletrônica' },
  { id: 'jazz', label: 'Jazz' },
] as const;

export function presetLevels(id: string, frequencies: number[]): number[] {
  return frequencies.map((hz) => {
    if (id === 'bass') return hz < 120 ? 6 : hz < 400 ? 3 : hz > 6000 ? 1 : 0;
    if (id === 'vocal') return hz < 180 ? -2 : hz < 700 ? 1 : hz < 4500 ? 3 : 0;
    if (id === 'rock') return hz < 180 ? 4 : hz < 1000 ? -1 : hz < 5000 ? 2 : 4;
    if (id === 'electronic') return hz < 180 ? 5 : hz < 1000 ? 1 : hz < 5000 ? 2 : 4;
    if (id === 'jazz') return hz < 180 ? 2 : hz < 1000 ? 1 : hz < 5000 ? 0 : 2;
    return 0;
  });
}

export function formatFrequency(hz: number): string {
  return hz >= 1000 ? `${+(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`;
}

export async function getEqualizerInfo(): Promise<EqualizerInfo> {
  if (Platform.OS !== 'android' || !native?.getEqualizerInfo) {
    throw new Error('Equalizador disponível apenas na versão Android atualizada do app.');
  }
  const info = await native.getEqualizerInfo();
  if (!info?.frequencies?.length || !(info.minDb < info.maxDb)) {
    throw new Error('Este aparelho não oferece um equalizador compatível.');
  }
  return info;
}

export async function loadEqualizerSettings(): Promise<EqualizerSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EqualizerSettings>;
      return {
        enabled: parsed.enabled === true,
        preset: typeof parsed.preset === 'string' ? parsed.preset : 'flat',
        levels: Array.isArray(parsed.levels) ? parsed.levels.map((value) => typeof value === 'number' && Number.isFinite(value) ? value : 0) : [],
      };
    }
  } catch {
    // Corrupt preferences should never prevent playback.
  }
  return { enabled: false, preset: 'flat', levels: [] };
}

export async function saveEqualizerSettings(settings: EqualizerSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

export async function applyEqualizerSettings(settings: EqualizerSettings): Promise<void> {
  if (Platform.OS === 'android' && native?.setEqualizer) {
    await native.setEqualizer(settings.enabled, settings.levels);
  }
}
