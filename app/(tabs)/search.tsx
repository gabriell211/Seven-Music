import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, TrackRow } from '@/ui';
import { useMusicLibrary } from '@/library';
import { searchYouTube, youtubeApiConfigured } from '@/services/youtube';
import type { Track } from '@/music';
import { C } from '@/theme';

type OnlineStatus = 'idle' | 'loading' | 'ready' | 'error';

export default function Search() {
  const [query, setQuery] = useState('linkin park');
  const [onlineTracks, setOnlineTracks] = useState<Track[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>('idle');
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const { tracks: deviceTracks, status: libraryStatus, scan } = useMusicLibrary();

  useEffect(() => {
    if (libraryStatus === 'idle') void scan();
  }, [libraryStatus, scan]);

  const localMatches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');

    if (!normalized) return deviceTracks.slice(0, 20);

    return deviceTracks
      .filter((track) =>
        track.title.toLocaleLowerCase('pt-BR').includes(normalized)
        || track.artist.toLocaleLowerCase('pt-BR').includes(normalized)
        || track.album?.toLocaleLowerCase('pt-BR').includes(normalized),
      )
      .slice(0, 20);
  }, [deviceTracks, query]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setOnlineTracks([]);
      setOnlineStatus('idle');
      setOnlineError(null);
      return;
    }

    if (!youtubeApiConfigured()) {
      setOnlineTracks([]);
      setOnlineStatus('idle');
      setOnlineError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setOnlineStatus('loading');
      setOnlineError(null);

      void searchYouTube(trimmed, controller.signal)
        .then((results) => {
          setOnlineTracks(results);
          setOnlineStatus('ready');
        })
        .catch((searchError: unknown) => {
          if (controller.signal.aborted) return;
          setOnlineTracks([]);
          setOnlineStatus('error');
          setOnlineError(
            searchError instanceof Error
              ? searchError.message
              : 'Não foi possível pesquisar no YouTube.',
          );
        });
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.searchRow}>
          <View style={s.inputWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={C.muted}/>
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={s.input}
              placeholder="Buscar músicas, artistas, vídeos..."
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityLabel="Limpar busca"
                hitSlop={10}
                onPress={() => setQuery('')}
              >
                <MaterialCommunityIcons name="close-circle" size={17} color={C.muted}/>
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={() => setQuery('')}>
            <Text style={s.cancel}>Cancelar</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip label="Tudo" active/>
          <Chip label={'No dispositivo (' + localMatches.length + ')'}/>
          <Chip label={'YouTube (' + onlineTracks.length + ')'}/>
        </ScrollView>

        <Text style={s.section}>No seu dispositivo</Text>

        {libraryStatus === 'scanning' ? (
          <View style={s.inlineState}>
            <ActivityIndicator size="small" color={C.purple}/>
            <Text style={s.stateText}>Procurando músicas no aparelho...</Text>
          </View>
        ) : null}

        {libraryStatus === 'ready' && localMatches.length === 0 ? (
          <Text style={s.empty}>Nenhuma música local encontrada para esta busca.</Text>
        ) : null}

        {localMatches.map((track) => (
          <TrackRow key={track.id} track={track} queue={localMatches}/>
        ))}

        <View style={s.youtubeHeader}>
          <Text style={s.section}>No YouTube</Text>
          {onlineStatus === 'loading' ? <ActivityIndicator size="small" color={C.purple}/> : null}
        </View>

        {!youtubeApiConfigured() ? (
          <View style={s.onlineNotice}>
            <MaterialCommunityIcons name="server-network-off" size={23} color={C.purple}/>
            <View style={{ flex: 1 }}>
              <Text style={s.noticeTitle}>Servidor online não configurado</Text>
              <Text style={s.noticeText}>Defina EXPO_PUBLIC_SEVEN_API_URL para ativar a pesquisa do YouTube.</Text>
            </View>
          </View>
        ) : null}

        {onlineStatus === 'error' ? (
          <View style={s.onlineNotice}>
            <MaterialCommunityIcons name="alert-circle-outline" size={23} color={C.danger}/>
            <View style={{ flex: 1 }}>
              <Text style={s.noticeTitle}>YouTube indisponível</Text>
              <Text style={s.noticeText}>{onlineError}</Text>
            </View>
          </View>
        ) : null}

        {onlineStatus === 'ready' && onlineTracks.length === 0 ? (
          <Text style={s.empty}>Nenhum resultado online encontrado.</Text>
        ) : null}

        {onlineTracks.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            source
            queue={onlineTracks}
          />
        ))}

        <View style={{ height: 132 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  content:{paddingHorizontal:18,paddingTop:8},
  searchRow:{flexDirection:'row',alignItems:'center',gap:10},
  inputWrap:{flex:1,height:44,borderRadius:999,paddingHorizontal:13,backgroundColor:'#171922',borderWidth:1,borderColor:'#22242F',flexDirection:'row',alignItems:'center',gap:8},
  input:{flex:1,color:C.text,fontSize:13,paddingVertical:0},
  cancel:{color:C.soft,fontWeight:'600',fontSize:12},
  chips:{gap:8,marginTop:14,marginBottom:22,paddingRight:8},
  section:{color:C.text,fontSize:17,fontWeight:'900',marginBottom:6,marginTop:10},
  youtubeHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  inlineState:{height:54,flexDirection:'row',alignItems:'center',gap:9},
  stateText:{color:C.muted,fontSize:12},
  empty:{color:C.muted,fontSize:12.5,lineHeight:18,paddingVertical:14},
  onlineNotice:{flexDirection:'row',gap:11,alignItems:'center',backgroundColor:'#11121A',borderWidth:1,borderColor:'#222431',borderRadius:14,padding:13,marginTop:6,marginBottom:8},
  noticeTitle:{color:C.text,fontWeight:'800',fontSize:12.5},
  noticeText:{color:C.muted,fontSize:11.5,lineHeight:16,marginTop:2}
});
