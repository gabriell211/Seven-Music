import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Track } from './music';
import { useCollections } from './collections';
import { useMusicLibrary } from './library';
import {
  configurePlayback,
  pausePlayback,
  playbackSnapshot,
  playTrack,
  resumePlayback,
  seekPlayback,
  subscribePlaybackStatus,
} from './services/audio';
import { resolveYouTubeStream } from './services/youtube';
import {
  loadCurrentTrackId,
  loadFavorites,
  loadQueueIds,
  loadRepeatMode,
  loadShuffle,
  loadTrackSnapshots,
  saveCurrentTrackId,
  saveFavorites,
  saveQueueIds,
  saveRepeatMode,
  saveShuffle,
  saveTrackSnapshot,
  type RepeatMode,
} from './storage';

type Value = {
  track: Track;
  hasSelection: boolean;
  queue: readonly Track[];
  playing: boolean;
  currentTime: number;
  duration: number;
  buffering: boolean;
  resolvingTrackId: string | null;
  error: string | null;
  favorites: ReadonlySet<string>;
  shuffle: boolean;
  repeatMode: RepeatMode;
  play: (track: Track, sourceQueue?: readonly Track[]) => Promise<void>;
  toggle: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  toggleFavorite: (trackId?: string) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  cycleRepeatMode: () => Promise<void>;
  removeFromQueue: (trackId: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  clearError: () => void;
};

const Context = createContext<Value | null>(null);
const EMPTY_TRACK: Track = {
  id: 'empty',
  title: 'Nenhuma música selecionada',
  artist: 'Escolha uma música para ouvir',
  duration: '0:00',
  source: 'local',
  colors: ['#181020', '#362047', '#0B0C11'],
};

function cleanQueueTrack(track: Track): Track {
  return {
    ...track,
    uri: track.source === 'youtube' ? undefined : track.uri,
    requestHeaders: undefined,
  };
}

function randomDifferentIndex(length: number, currentIndex: number): number {
  if (length <= 1) return 0;
  let index = currentIndex;
  while (index === currentIndex) {
    index = Math.floor(Math.random() * length);
  }
  return index;
}

export function PlayerProvider({ children }: PropsWithChildren) {
  const { tracks: deviceTracks } = useMusicLibrary();
  const { recordPlay } = useCollections();

  const [track, setTrack] = useState<Track>(EMPTY_TRACK);
  const [hasSelection, setHasSelection] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [resolvingTrackId, setResolvingTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const finishLock = useRef(false);

  useEffect(() => {
    void configurePlayback();
    void Promise.all([loadFavorites(), loadShuffle(), loadRepeatMode()]).then(
      ([savedFavorites, savedShuffle, savedRepeat]) => {
        setFavoriteIds(savedFavorites);
        setShuffle(savedShuffle);
        setRepeatMode(savedRepeat);
      },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      loadCurrentTrackId(),
      loadQueueIds(),
      loadTrackSnapshots(),
    ]).then(([savedId, queueIds, snapshots]) => {
      if (cancelled) return;

      const knownTracks = new Map(
        [...Object.values(snapshots), ...deviceTracks]
          .map((item) => [item.id, item] as const),
      );

      const restoredQueue = queueIds
        .map((id) => knownTracks.get(id))
        .filter((item): item is Track => item !== undefined);

      setQueue(restoredQueue.length > 0 ? restoredQueue : deviceTracks);

      if (!savedId) return;
      const savedTrack = knownTracks.get(savedId);
      if (savedTrack) {
        setTrack(savedTrack);
        setHasSelection(true);
      }
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
    }, 350);

    return () => clearInterval(timer);
  }, []);

  const persistQueue = useCallback(async (nextQueue: readonly Track[]) => {
    await Promise.all([
      saveQueueIds(nextQueue.map((item) => item.id)),
      ...nextQueue.map((item) => saveTrackSnapshot(cleanQueueTrack(item))),
    ]);
  }, []);

  const play = useCallback(async (nextTrack: Track, sourceQueue?: readonly Track[]) => {
    if (resolvingTrackId) return;

    setError(null);
    setResolvingTrackId(nextTrack.id);
    finishLock.current = false;

    const cleanTrack = cleanQueueTrack(nextTrack);

    const persistSelection = async (selectedTrack: Track) => {
      if (sourceQueue && sourceQueue.length > 0) {
        const nextQueue = sourceQueue.map(cleanQueueTrack);
        setQueue(nextQueue);
        void persistQueue(nextQueue);
      } else {
        setQueue((currentQueue) => {
          if (currentQueue.some((item) => item.id === selectedTrack.id)) return currentQueue;

          const nextQueue = [...currentQueue, cleanQueueTrack(selectedTrack)];
          void persistQueue(nextQueue);
          return nextQueue;
        });
      }

      setTrack(selectedTrack);
      setHasSelection(true);
      setCurrentTime(0);
      setDuration(selectedTrack.durationSeconds ?? 0);

      await Promise.all([
        saveCurrentTrackId(selectedTrack.id),
        saveTrackSnapshot(cleanQueueTrack(selectedTrack)),
      ]);
    };

    try {
      if (nextTrack.source === 'youtube') {
        if (!nextTrack.youtubeId) {
          throw new Error('Este resultado do YouTube não possui um ID válido.');
        }

        try {
          const resolved = await resolveYouTubeStream(nextTrack.youtubeId);
          const playable = {
            ...cleanTrack,
            uri: resolved.streamUrl,
            requestHeaders: resolved.streamHeaders,
          };

          await persistSelection(playable);

          const started = await playTrack(playable);
          setPlaying(started);
          if (started) await recordPlay(cleanQueueTrack(playable));
          return;
        } catch (resolveError) {
          pausePlayback();
          await persistSelection(cleanTrack);
          setBuffering(false);
          setPlaying(false);
          setError(
            resolveError instanceof Error
              ? resolveError.message
              : 'Não foi possível obter o áudio desta música.',
          );
          return;
        }
      }

      if (!nextTrack.uri) {
        throw new Error('O arquivo desta música não está disponível para reprodução.');
      }

      await persistSelection(nextTrack);

      const started = await playTrack(nextTrack);
      setPlaying(started);
      if (started) await recordPlay(cleanQueueTrack(nextTrack));
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
  }, [persistQueue, recordPlay, resolvingTrackId]);

  const selectNextTrack = useCallback((automatic: boolean): Track | null => {
    if (queue.length === 0) return null;

    const index = queue.findIndex((item) => item.id === track.id);
    const safeIndex = index >= 0 ? index : 0;

    if (shuffle) {
      return queue[randomDifferentIndex(queue.length, safeIndex)] ?? null;
    }

    const isLast = safeIndex >= queue.length - 1;
    if (automatic && isLast && repeatMode === 'off') return null;

    return queue[(safeIndex + 1) % queue.length] ?? null;
  }, [queue, repeatMode, shuffle, track.id]);

  const nextInternal = useCallback(async (automatic: boolean) => {
    if (automatic && repeatMode === 'one' && track.uri) {
      await seekPlayback(0);
      resumePlayback();
      setCurrentTime(0);
      setPlaying(true);
      return;
    }

    const target = selectNextTrack(automatic);
    if (!target) {
      setPlaying(false);
      return;
    }

    await play(target, queue);
  }, [play, queue, repeatMode, selectNextTrack, track.uri]);

  const next = useCallback(async () => {
    await nextInternal(false);
  }, [nextInternal]);

  const previous = useCallback(async () => {
    if (currentTime > 4 && track.uri) {
      await seekPlayback(0);
      setCurrentTime(0);
      return;
    }

    if (queue.length === 0) return;

    const index = queue.findIndex((item) => item.id === track.id);
    const safeIndex = index >= 0 ? index : 0;
    const target = shuffle
      ? queue[randomDifferentIndex(queue.length, safeIndex)]
      : queue[(safeIndex - 1 + queue.length) % queue.length];

    if (target) await play(target, queue);
  }, [currentTime, play, queue, shuffle, track.id, track.uri]);

  useEffect(() => subscribePlaybackStatus((status) => {
    if (!status.didJustFinish || finishLock.current) return;
    finishLock.current = true;

    void nextInternal(true).finally(() => {
      setTimeout(() => {
        finishLock.current = false;
      }, 300);
    });
  }), [nextInternal]);

  const toggle = useCallback(async () => {
    if (resolvingTrackId || !hasSelection) return;

    if (!track.uri) {
      await play(track, queue);
      return;
    }

    if (playing) {
      pausePlayback();
      setPlaying(false);
      return;
    }

    resumePlayback();
    setPlaying(true);
  }, [hasSelection, play, playing, queue, resolvingTrackId, track]);

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

  const toggleShuffle = useCallback(async () => {
    const nextValue = !shuffle;
    setShuffle(nextValue);
    await saveShuffle(nextValue);
  }, [shuffle]);

  const cycleRepeatMode = useCallback(async () => {
    const nextMode: RepeatMode = repeatMode === 'off'
      ? 'all'
      : repeatMode === 'all'
        ? 'one'
        : 'off';

    setRepeatMode(nextMode);
    await saveRepeatMode(nextMode);
  }, [repeatMode]);

  const removeFromQueue = useCallback(async (trackId: string) => {
    const nextQueue = queue.filter((item) => item.id !== trackId);
    setQueue(nextQueue);
    await persistQueue(nextQueue);
  }, [persistQueue, queue]);

  const clearQueue = useCallback(async () => {
    const nextQueue = queue.filter((item) => item.id === track.id);
    setQueue(nextQueue);
    await persistQueue(nextQueue);
  }, [persistQueue, queue, track.id]);

  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const value = useMemo<Value>(() => ({
    track,
    hasSelection,
    queue,
    playing,
    currentTime,
    duration,
    buffering,
    resolvingTrackId,
    error,
    favorites,
    shuffle,
    repeatMode,
    play,
    toggle,
    next,
    previous,
    seek,
    toggleFavorite,
    toggleShuffle,
    cycleRepeatMode,
    removeFromQueue,
    clearQueue,
    clearError: () => setError(null),
  }), [
    track,
    hasSelection,
    queue,
    playing,
    currentTime,
    duration,
    buffering,
    resolvingTrackId,
    error,
    favorites,
    shuffle,
    repeatMode,
    play,
    toggle,
    next,
    previous,
    seek,
    toggleFavorite,
    toggleShuffle,
    cycleRepeatMode,
    removeFromQueue,
    clearQueue,
  ]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlayer() {
  const value = useContext(Context);
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider');
  return value;
}
