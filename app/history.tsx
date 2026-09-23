import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollections } from '@/collections';
import { TrackRow } from '@/ui';
import { C } from '@/theme';

export default function History() {
  const { history } = useCollections();
  const queue = history.map((entry) => entry.track);

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={s.back}>
            <MaterialCommunityIcons name="chevron-left" size={30} color={C.soft}/>
          </Pressable>
          <Text style={s.title}>Continue ouvindo</Text>
        </View>

        {history.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="history" size={34} color={C.muted}/>
            <Text style={s.emptyTitle}>Nada no histórico ainda</Text>
            <Text style={s.emptyText}>As músicas que você ouvir aparecerão aqui.</Text>
          </View>
        ) : (
          history.map((entry) => <TrackRow key={entry.track.id} track={entry.track} queue={queue}/>)
        )}

        <View style={{ height: 132 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  back: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontSize: 23, fontWeight: '900' },
  empty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '900' },
  emptyText: { color: C.muted, fontSize: 12.5, textAlign: 'center' },
});
