import TrackPlayer, { Event } from 'react-native-track-player';

export default async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    void TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, ({ interval }) => {
    void TrackPlayer.seekBy(interval);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, ({ interval }) => {
    void TrackPlayer.seekBy(-interval);
  });
}
