import TrackPlayer, {
  Capability,
  Event,
  State,
} from 'react-native-track-player';
import type { Track as NativeTrack } from 'react-native-track-player';
import type { Track } from '@/music';
import playbackService from './playback-service';
import { applyEqualizerSettings, loadEqualizerSettings } from '../equalizer';

export type AudioStatus = {
  playing: boolean;
  currentTime: number;
  duration: number;
  buffering: boolean;
  didJustFinish: boolean;
  activeTrackId?: string;
  activeTrackUri?: string;
  activeTrackHeaders?: Record<string, string>;
};

const listeners = new Set<(status: AudioStatus) => void>();
let configured = false;
let setupPromise: Promise<void> | null = null;
let subscriptionsInstalled = false;

TrackPlayer.registerPlaybackService(() => playbackService);

const snapshot: AudioStatus = {
  playing: false,
  currentTime: 0,
  duration: 0,
  buffering: false,
  didJustFinish: false,
};

function emitStatus(): void {
  const status = { ...snapshot };
  for (const listener of listeners) listener(status);
}

function installSubscriptions(): void {
  if (subscriptionsInstalled) return;
  subscriptionsInstalled = true;

  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    snapshot.playing = state === State.Playing;
    snapshot.buffering = state === State.Loading || state === State.Buffering;
    snapshot.didJustFinish = false;
    emitStatus();
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
    snapshot.currentTime = Number.isFinite(position) ? Math.max(0, position) : 0;
    snapshot.duration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    emitStatus();
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ track }) => {
    const id = track?.id;
    snapshot.activeTrackId = typeof id === 'string' ? id : undefined;
    snapshot.activeTrackUri = typeof track?.url === 'string' ? track.url : undefined;
    snapshot.activeTrackHeaders = track?.headers as Record<string, string> | undefined;
    snapshot.currentTime = 0;
    snapshot.didJustFinish = false;
    emitStatus();
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    snapshot.playing = false;
    snapshot.didJustFinish = true;
    emitStatus();
  });

  TrackPlayer.addEventListener(Event.PlaybackError, () => {
    snapshot.playing = false;
    snapshot.buffering = false;
    emitStatus();
  });
}

export async function configurePlayback(): Promise<void> {
  if (configured) return;
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
      autoUpdateMetadata: true,
    });

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      compactCapabilities: [
        Capability.SkipToPrevious,
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      forwardJumpInterval: 10,
      backwardJumpInterval: 10,
      progressUpdateEventInterval: 0.35,
      android: {
        alwaysPauseOnInterruption: false,
      },
    });

    installSubscriptions();
    configured = true;
    try {
      await applyEqualizerSettings(await loadEqualizerSettings());
    } catch {
      // A device without an equalizer must still be able to play audio.
    }
  })();

  try {
    await setupPromise;
  } catch (error) {
    setupPromise = null;
    throw error;
  }
}

function toNativeTrack(track: Track): NativeTrack {
  if (!track.uri) throw new Error('A faixa não possui uma fonte de áudio válida.');

  return {
    id: track.id,
    url: track.uri,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.durationSeconds,
    artwork: track.thumbnail,
    headers: track.requestHeaders,
  };
}

export async function setPlaybackQueue(
  tracks: readonly Track[],
  activeTrackId: string,
  options: { preservePlayback?: boolean } = {},
): Promise<boolean> {
  await configurePlayback();

  const playableTracks = tracks.filter((track) => Boolean(track.uri));
  if (playableTracks.length === 0) return false;

  let previousPosition = 0;
  let wasPlaying = false;
  if (options.preservePlayback) {
    try {
      const [progress, playbackState] = await Promise.all([
        TrackPlayer.getProgress(),
        TrackPlayer.getPlaybackState(),
      ]);
      previousPosition = Number.isFinite(progress.position) ? Math.max(0, progress.position) : 0;
      wasPlaying = playbackState.state === State.Playing;
    } catch {
      // The player may not have an active item yet.
    }
  }

  const nativeTracks = playableTracks.map(toNativeTrack);
  await TrackPlayer.setQueue(nativeTracks);

  const activeIndex = playableTracks.findIndex((track) => track.id === activeTrackId);
  if (activeIndex > 0) {
    await TrackPlayer.skip(activeIndex, previousPosition);
  } else if (previousPosition > 0) {
    await TrackPlayer.seekTo(previousPosition);
  }
  if (wasPlaying) await TrackPlayer.play();

  snapshot.activeTrackId = playableTracks[activeIndex >= 0 ? activeIndex : 0]?.id;
  snapshot.activeTrackUri = playableTracks[activeIndex >= 0 ? activeIndex : 0]?.uri;
  snapshot.activeTrackHeaders = playableTracks[activeIndex >= 0 ? activeIndex : 0]?.requestHeaders;
  snapshot.currentTime = previousPosition;
  snapshot.duration = playableTracks[activeIndex >= 0 ? activeIndex : 0]?.durationSeconds ?? 0;
  snapshot.didJustFinish = false;
  emitStatus();
  return true;
}

export async function playTrack(track: Track): Promise<boolean> {
  if (!track.uri) return false;

  await configurePlayback();

  const activeTrack = await TrackPlayer.getActiveTrack();
  if (!activeTrack || activeTrack.id !== track.id) {
    await setPlaybackQueue([track], track.id);
  }

  await TrackPlayer.play();
  snapshot.playing = true;
  snapshot.activeTrackId = track.id;
  snapshot.activeTrackUri = track.uri;
  snapshot.activeTrackHeaders = track.requestHeaders;
  snapshot.didJustFinish = false;
  emitStatus();
  return true;
}

export function pausePlayback(): void {
  void TrackPlayer.pause();
}

export function resumePlayback(): void {
  void TrackPlayer.play();
}

export async function seekPlayback(seconds: number): Promise<void> {
  await TrackPlayer.seekTo(Math.max(0, seconds));
}

export function subscribePlaybackStatus(
  listener: (status: AudioStatus) => void,
): () => void {
  listeners.add(listener);
  listener({ ...snapshot });
  return () => listeners.delete(listener);
}

export function playbackSnapshot(): AudioStatus {
  return { ...snapshot };
}
