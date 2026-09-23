import type { Track } from './music';

export type Playlist = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  trackIds: string[];
};

export type HistoryEntry = {
  track: Track;
  playedAt: string;
};
