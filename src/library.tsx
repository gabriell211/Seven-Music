import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Track } from '@/music';
import { scanDeviceMusic } from '@/services/library-scanner';

type LibraryStatus = 'idle' | 'scanning' | 'ready' | 'denied' | 'error';

type LibraryValue = {
  tracks: Track[];
  status: LibraryStatus;
  error: string | null;
  scan: () => Promise<void>;
};

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: PropsWithChildren) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<LibraryStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (status === 'scanning') return;

    setStatus('scanning');
    setError(null);

    try {
      const result = await scanDeviceMusic();
      setTracks(result.tracks);
      setStatus(result.status);
    } catch (scanError) {
      setStatus('error');
      setError(scanError instanceof Error ? scanError.message : 'Não foi possível ler as músicas deste aparelho.');
    }
  }, [status]);

  const value = useMemo(
    () => ({ tracks, status, error, scan }),
    [tracks, status, error, scan],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useMusicLibrary(): LibraryValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useMusicLibrary must be used inside LibraryProvider');
  return value;
}
