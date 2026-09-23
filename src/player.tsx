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
import {
  loadCurrentTrackId,
  loadFavorites,
  saveCurrentTrackId,
  saveFavorites,
} from './storage';

type Value = {
  track: Track;
  playing: boolean;
  currentTime: number;
  duration: number;
  buffering: boolean;
  favorites: ReadonlySet<string>;
  play: (track: Track) => Promise<void>;
  toggle: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  toggleFavorite: (trackId?: string) => Promise<void>;
};

const Context = createContext<Value | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const { tracks: deviceTracks } = useMusicLibrary();
  const queue = deviceTracks.length > 0 ? deviceTracks : localTracks;

  const [track, setTrack] = useState<Track>(localTracks[0]!);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    void configurePlayback();

    void loadFavorites().then(setFavoriteIds);
  }, []);

  useEffect(() => {
    if (deviceTracks.length === 0) return;

    void loadCurrentTrackId().then((savedId) => {
      if (!savedId) return;
      const savedTrack = deviceTracks.find((item) => item.id === savedId);
      if (savedTrack) setTrack(savedTrack);
    });
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

  const play = useCallback(async (nextTrack: Track) => {
    setTrack(nextTrack);
    setCurrentTime(0);
    await saveCurrentTrackId(nextTrack.id);

    const started = await playTrack(nextTrack);
    setPlaying(started);
  }, []);

  const toggle = useCallback(async () => {
    if (!track.uri) return;

    if (playing) {
      pausePlayback();
      setPlaying(false);
      return;
    }

    resumePlayback();
    setPlaying(true);
  }, [playing, track.uri]);

  const next = useCallback(async () => {
    const index = queue.findIndex((item) => item.id === track.id);
    const target = queue[(index + 1 + queue.length) % queue.length];
    if (target) await play(target);
  }, [play, queue, track.id]);

  const previous = useCallback(async () => {
    if (currentTime > 4) {
      await seekPlayback(0);
      setCurrentTime(0);
      return;
    }

    const index = queue.findIndex((item) => item.id === track.id);
    const target = queue[(index - 1 + queue.length) % queue.length];
    if (target) await play(target);
  }, [currentTime, play, queue, track.id]);

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
    playing,
    currentTime,
    duration,
    buffering,
    favorites,
    play,
    toggle,
    next,
    previous,
    seek,
    toggleFavorite,
  }), [
    track,
    playing,
    currentTime,
    duration,
    buffering,
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
