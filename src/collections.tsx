import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Track } from './music';
import type { HistoryEntry, Playlist } from './collection-types';
import {
  loadHistory,
  loadPlaylists,
  saveHistory,
  savePlaylists,
} from './storage';

type CollectionsValue = {
  playlists: Playlist[];
  history: HistoryEntry[];
  createPlaylist: (name: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  recordPlay: (track: Track) => Promise<void>;
};

const Context = createContext<CollectionsValue | null>(null);

function cleanTrack(track: Track): Track {
  return {
    ...track,
    uri: track.source === 'soundcloud' ? undefined : track.uri,
    requestHeaders: undefined,
  };
}

export function CollectionsProvider({ children }: PropsWithChildren) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    void Promise.all([loadPlaylists(), loadHistory()]).then(([savedPlaylists, savedHistory]) => {
      setPlaylists(savedPlaylists);
      setHistory(savedHistory);
    });
  }, []);

  const createPlaylist = useCallback(async (rawName: string): Promise<Playlist> => {
    const name = rawName.trim().slice(0, 60);
    if (!name) throw new Error('Digite um nome para a playlist.');

    const now = new Date().toISOString();
    const playlist: Playlist = {
      id: 'playlist-' + Date.now().toString(36),
      name,
      createdAt: now,
      updatedAt: now,
      trackIds: [],
    };

    const next = [playlist, ...playlists];
    setPlaylists(next);
    await savePlaylists(next);
    return playlist;
  }, [playlists]);

  const deletePlaylist = useCallback(async (id: string) => {
    const next = playlists.filter((playlist) => playlist.id !== id);
    setPlaylists(next);
    await savePlaylists(next);
  }, [playlists]);

  const addToPlaylist = useCallback(async (playlistId: string, track: Track) => {
    const storedTrack = cleanTrack(track);
    const next = playlists.map((playlist) => {
      if (playlist.id !== playlistId || playlist.trackIds.includes(storedTrack.id)) return playlist;

      return {
        ...playlist,
        updatedAt: new Date().toISOString(),
        trackIds: [...playlist.trackIds, storedTrack.id],
      };
    });

    setPlaylists(next);
    await Promise.all([
      savePlaylists(next),
      import('./storage').then(({ saveTrackSnapshot }) => saveTrackSnapshot(storedTrack)),
    ]);
  }, [playlists]);

  const removeFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    const next = playlists.map((playlist) => (
      playlist.id === playlistId
        ? {
            ...playlist,
            updatedAt: new Date().toISOString(),
            trackIds: playlist.trackIds.filter((id) => id !== trackId),
          }
        : playlist
    ));

    setPlaylists(next);
    await savePlaylists(next);
  }, [playlists]);

  const recordPlay = useCallback(async (track: Track) => {
    const entry: HistoryEntry = {
      track: cleanTrack(track),
      playedAt: new Date().toISOString(),
    };

    const next = [
      entry,
      ...history.filter((item) => item.track.id !== track.id),
    ].slice(0, 100);

    setHistory(next);
    await saveHistory(next);
  }, [history]);

  const value = useMemo(() => ({
    playlists,
    history,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    recordPlay,
  }), [
    playlists,
    history,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    recordPlay,
  ]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCollections(): CollectionsValue {
  const value = useContext(Context);
  if (!value) throw new Error('useCollections must be used inside CollectionsProvider');
  return value;
}
