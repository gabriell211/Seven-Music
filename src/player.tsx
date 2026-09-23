import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { localTracks, type Track } from './music';
import { useMusicLibrary } from './library';
import {
  configurePlayback,
  pausePlayback,
  playbackSnapshot,
  playTrack,
  resumePlayback,
  seekPlayback,
} from './services/audio';
import { resolveYouTubeStream } from './services/youtube';
import {
  loadCurrentTrackId,
  loadFavorites,
  loadQueueIds,
  saveCurrentTrackId,
  saveFavorites,
  saveQueueIds,
} from './storage';

type Value = {
  track: Track;
  queue: readonly Track[];
  playing: boolean;
  currentTime: number;
  duration: number;
  buffering: boolean;
  resolvingTrackId: string | null;
  error: string | null;
  favorites: ReadonlySet<string>;
  play: (track: Track) => Promise<void>;
  toggle: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  toggleFavorite: (trackId?: string) => Promise<void>;
  clearError: () => void;
};

const Context = createContext<Value | null>(null);

function withoutExpiredRemoteUri(track: Track): Track {
  if (track.source !== 'youtube') return track;
  const { uri: _uri, ...clean } = track;
  return clean;
}

export function PlayerProvider({ children }: PropsWithChildren) {
  const { tracks: deviceTracks } = useMusicLibrary();

  const [track, setTrack] = useState<Track>(localTracks[0]!);
  const [queue, setQueue] = useState<Track[]>(localTracks);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [resolvingTrackId, setResolvingTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    void configurePlayback();
    void loadFavorites().then(setFavoriteIds);
  }, []);

  useEffect(() => {
    if (deviceTracks.length === 0) return;

    let cancelled = false;

    void Promise.all([loadCurrentTrackId(), loadQueueIds()]).then(([savedId, queueIds]) => {
      if (cancelled) return;

      const knownTracks = new Map(
        [...deviceTracks, ...localTracks].map((item) => [item.id, item] as const),
      );
      const restoredQueue = queueIds
        .map((id) => knownTracks.get(id))
        .filter((item): item is Track => item !== undefined);

      const nextQueue = restoredQueue.length > 0 ? restoredQueue : deviceTracks;
      setQueue(nextQueue);

      if (!savedId) return;
      const savedTrack = knownTracks.get(savedId);
      if (savedTrack) setTrack(savedTrack);
    });

    return () => {
      cancelled = true;
    };
  }, [deviceTracks]);

  useEffect(() => {
    const timer = setInterval(() => {
      const snapshot = playbackSnapshot();
      setPlaying(snapshot.playing);
      setCurrentTime(snapshot.currentTime);
      setDuration(snapshot.duration);
      setBuffering(snapshot.buffering);
    }, 500);

    return () => clearInterval(timer);
  }, []);

  const persistQueue = useCallback(async (nextQueue: Track[]) => {
    await saveQueueIds(nextQueue.map((item) => item.id));
  }, []);

  const play = useCallback(async (nextTrack: Track) => {
    if (resolvingTrackId) return;

    setError(null);
    setResolvingTrackId(nextTrack.id);

    try {
      let playable = nextTrack;

      if (nextTrack.source === 'youtube') {
        if (!nextTrack.youtubeId) {
          throw new Error('Este resultado do YouTube não possui um ID válido.');
        }

        const uri = await resolveYouTubeStream(nextTrack.youtubeId);
        playable = { ...withoutExpiredRemoteUri(nextTrack), uri };
      }

      if (!playable.uri) {
        throw new Error('O arquivo desta música não está disponível para reprodução.');
      }

      setTrack(playable);
      setCurrentTime(0);
      await saveCurrentTrackId(playable.id);

      setQueue((currentQueue) => {
        if (currentQueue.some((item) => item.id === playable.id)) return currentQueue;

        const nextQueue = [...currentQueue, withoutExpiredRemoteUri(playable)];
        void persistQueue(nextQueue);
        return nextQueue;
      });

      const started = await playTrack(playable);
      setPlaying(started);
    } catch (playError) {
      setPlaying(false);
      setError(
        playError instanceof Error
          ? playError.message
          : 'Não foi possível reproduzir esta música.',
      );
    } finally {
      setResolvingTrackId(null);
    }
  }, [persistQueue, resolvingTrackId]);

  const toggle = useCallback(async () => {
    if (resolvingTrackId) return;

    if (!track.uri) {
      await play(track);
      return;
    }

    if (playing) {
      pausePlayback();
      setPlaying(false);
      return;
    }

    resumePlayback();
    setPlaying(true);
  }, [play, playing, resolvingTrackId, track]);

  const next = useCallback(async () => {
    if (queue.length === 0) return;

    const index = queue.findIndex((item) => item.id === track.id);
    const safeIndex = index >= 0 ? index : 0;
    const target = queue[(safeIndex + 1) % queue.length];

    if (target) await play(target);
  }, [play, queue, track.id]);

  const previous = useCallback(async () => {
    if (currentTime > 4 && track.uri) {
      await seekPlayback(0);
      setCurrentTime(0);
      return;
    }

    if (queue.length === 0) return;

    const index = queue.findIndex((item) => item.id === track.id);
    const safeIndex = index >= 0 ? index : 0;
    const target = queue[(safeIndex - 1 + queue.length) % queue.length];

    if (target) await play(target);
  }, [currentTime, play, queue, track.id, track.uri]);

  const seek = useCallback(async (seconds: number) => {
    if (!track.uri) return;
    await seekPlayback(seconds);
    setCurrentTime(seconds);
  }, [track.uri]);

  const toggleFavorite = useCallback(async (trackId = track.id) => {
    const nextIds = favoriteIds.includes(trackId)
      ? favoriteIds.filter((id) => id !== trackId)
      : [...favoriteIds, trackId];

    setFavoriteIds(nextIds);
    await saveFavorites(nextIds);
  }, [favoriteIds, track.id]);

  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const value = useMemo<Value>(() => ({
    track,
    queue,
    playing,
    currentTime,
    duration,
    buffering,
    resolvingTrackId,
    error,
    favorites,
    play,
    toggle,
    next,
    previous,
    seek,
    toggleFavorite,
    clearError: () => setError(null),
  }), [
    track,
    queue,
    playing,
    currentTime,
    duration,
    buffering,
    resolvingTrackId,
    error,
    favorites,
    play,
    toggle,
    next,
    previous,
    seek,
    toggleFavorite,
  ]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlayer() {
  const value = useContext(Context);
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider');
  return value;
}
