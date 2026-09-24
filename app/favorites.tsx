import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollections } from '@/collections';
import { useMusicLibrary } from '@/library';
import type { Track } from '@/music';
import { usePlayer } from '@/player';
import { loadTrackSnapshots } from '@/storage';
import { TrackRow } from '@/ui';
import { C } from '@/theme';

export default function Favorites() {
  const { favorites } = usePlayer();
  const { history } = useCollections();
  const { tracks: deviceTracks } = useMusicLibrary();
  const [snapshots, setSnapshots] = useState<Record<string, Track>>({});

  useEffect(() => {
    void loadTrackSnapshots().then(setSnapshots);
  }, [history.length, deviceTracks.length]);

  const tracks = useMemo(() => {
    const knownTracks = new Map<string, Track>();
    for (const item of Object.values(snapshots)) knownTracks.set(item.id, item);
    for (const item of history.map((entry) => entry.track)) knownTracks.set(item.id, item);
    for (const item of deviceTracks) knownTracks.set(item.id, item);

    return [...favorites]
      .map((id) => knownTracks.get(id))
      .filter((item): item is Track => item !== undefined);
  }, [deviceTracks, favorites, history, snapshots]);

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={s.back}>
            <MaterialCommunityIcons name="chevron-left" size={30} color={C.soft}/>
          </Pressable>
          <Text style={s.title}>Favoritos</Text>
          <View style={s.back}/>
        </View>

        {tracks.length > 0 ? tracks.map((track) => <TrackRow key={track.id} track={track} queue={tracks}/>) : (
          <View style={s.empty}>
            <MaterialCommunityIcons name="heart-outline" size={40} color={C.muted}/>
            <Text style={s.emptyTitle}>Nenhuma música favorita</Text>
            <Text style={s.emptyText}>Toque no coração do player para salvar suas músicas aqui.</Text>
          </View>
        )}
        <View style={{ height: 132 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  back: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontSize: 25, fontWeight: '900' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '900' },
  emptyText: { color: C.muted, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
});
