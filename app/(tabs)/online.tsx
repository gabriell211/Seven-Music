import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Track } from '@/music';
import { searchSoundCloud, soundCloudApiConfigured } from '@/services/soundcloud';
import { TrackRow } from '@/ui';
import { C } from '@/theme';

type OnlineStatus = 'idle' | 'loading' | 'ready' | 'error';
type SearchResult = {
  query: string;
  tracks: Track[];
  status: OnlineStatus;
  error: string | null;
};

export default function OnlineMusic() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult>({ query: '', tracks: [], status: 'idle', error: null });
  const trimmedQuery = query.trim();
  const activeResult = result.query === trimmedQuery ? result : null;
  const status: OnlineStatus = trimmedQuery.length < 2 || !soundCloudApiConfigured()
    ? 'idle'
    : activeResult?.status ?? 'loading';
  const tracks = activeResult?.tracks ?? [];
  const error = activeResult?.error ?? null;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !soundCloudApiConfigured()) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setResult({ query: trimmed, tracks: [], status: 'loading', error: null });
      void searchSoundCloud(trimmed, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return;
          setResult({ query: trimmed, tracks: results, status: 'ready', error: null });
        })
        .catch((searchError: unknown) => {
          if (controller.signal.aborted) return;
          setResult({
            query: trimmed,
            tracks: [],
            status: 'error',
            error: searchError instanceof Error ? searchError.message : 'Não foi possível pesquisar no SoundCloud.',
          });
        });
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Músicas online</Text>
        <Text style={s.subtitle}>Busque no SoundCloud e ouça as faixas disponíveis.</Text>
        <View style={s.inputWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={C.muted}/>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={s.input}
            placeholder="Buscar música ou artista..."
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar músicas online"
          />
        </View>

        {!soundCloudApiConfigured() ? (
          <Text style={s.message}>Servidor online não configurado.</Text>
        ) : null}
        {status === 'idle' && query.trim().length < 2 ? (
          <Text style={s.message}>Digite uma música ou artista para começar.</Text>
        ) : null}
        {status === 'loading' ? (
          <View style={s.loading}><ActivityIndicator color={C.purple}/><Text style={s.message}>Buscando músicas online...</Text></View>
        ) : null}
        {status === 'error' ? (
          <Text style={s.error}>{error}</Text>
        ) : null}
        {status === 'ready' && tracks.length === 0 ? (
          <Text style={s.message}>Nenhum resultado online encontrado.</Text>
        ) : null}
        {status === 'ready' ? tracks.map((track) => <TrackRow key={track.id} track={track} source queue={tracks}/>) : null}
        <View style={{ height: 132 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  title: { color: C.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 12.5, marginTop: 4, marginBottom: 18 },
  inputWrap: { height: 46, borderRadius: 14, paddingHorizontal: 13, backgroundColor: '#171922', borderWidth: 1, borderColor: '#22242F', flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, color: C.text, fontSize: 13, paddingVertical: 0 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18 },
  message: { color: C.muted, fontSize: 12.5, lineHeight: 18, paddingVertical: 18 },
  error: { color: C.danger, fontSize: 12.5, lineHeight: 18, paddingVertical: 18 },
});
