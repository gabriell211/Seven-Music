import {
  createAudioPlayer,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Platform } from 'react-native';
import type { Track } from '@/music';

const nativePlayer = createAudioPlayer(null, { updateInterval: 500 });
let configured = false;

export async function configurePlayback(): Promise<void> {
  if (configured) return;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });

  configured = true;
}

export async function playTrack(track: Track): Promise<boolean> {
  if (!track.uri) return false;

  await configurePlayback();

  if (Platform.OS === 'android') {
    try {
      await requestNotificationPermissionsAsync();
    } catch {
      // Notification permission is optional for foreground playback.
    }
  }

  nativePlayer.replace(track.uri);
  nativePlayer.setActiveForLockScreen(true, {
    title: track.title,
    artist: track.artist,
    albumTitle: track.album,
  });
  nativePlayer.play();

  return true;
}

export function pausePlayback(): void {
  nativePlayer.pause();
}

export function resumePlayback(): void {
  nativePlayer.play();
}

export async function seekPlayback(seconds: number): Promise<void> {
  await nativePlayer.seekTo(Math.max(0, seconds));
}

export function playbackSnapshot() {
  return {
    playing: nativePlayer.playing,
    currentTime: nativePlayer.currentTime,
    duration: nativePlayer.duration,
    loaded: nativePlayer.isLoaded,
    buffering: nativePlayer.isBuffering,
  };
}
