import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CollectionsProvider } from '@/collections';
import { LibraryProvider } from '@/library';
import { PlayerProvider } from '@/player';
import { C } from '@/theme';

export default function RootLayout() {
  return (
    <LibraryProvider>
      <CollectionsProvider>
        <PlayerProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="queue" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="playlist/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </PlayerProvider>
      </CollectionsProvider>
    </LibraryProvider>
  );
}
