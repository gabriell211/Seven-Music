import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { localTracks, type Track } from './music';

type Value = {
  track: Track;
  playing: boolean;
  play: (track: Track) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
};

const Context = createContext<Value | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const [track, setTrack] = useState<Track>(localTracks[0]!);
  const [playing, setPlaying] = useState(false);

  const value = useMemo<Value>(() => ({
    track,
    playing,
    play: (nextTrack) => { setTrack(nextTrack); setPlaying(true); },
    toggle: () => setPlaying((v) => !v),
    next: () => {
      const i = localTracks.findIndex((item) => item.id === track.id);
      setTrack(localTracks[(i + 1) % localTracks.length] ?? localTracks[0]!);
      setPlaying(true);
    },
    previous: () => {
      const i = localTracks.findIndex((item) => item.id === track.id);
      setTrack(localTracks[(i - 1 + localTracks.length) % localTracks.length] ?? localTracks[0]!);
      setPlaying(true);
    },
  }), [playing, track]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlayer() {
  const value = useContext(Context);
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider');
  return value;
}