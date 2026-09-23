import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrackRow } from '@/ui';
import { useMusicLibrary } from '@/library';
import { C } from '@/theme';

export default function Library() {
  const { tracks, status, error, scan } = useMusicLibrary();
  const [query, setQuery] = useState('');

  const visibleTracks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return tracks;
    return tracks.filter((track) =>
      track.title.toLocaleLowerCase('pt-BR').includes(normalized)
      || track.artist.toLocaleLowerCase('pt-BR').includes(normalized)
      || track.album?.toLocaleLowerCase('pt-BR').includes(normalized)
      || track.filename?.toLocaleLowerCase('pt-BR').includes(normalized),
    );
  }, [tracks, query]);

  useEffect(() => {
    if (status === 'idle') void scan();
  }, [scan, status]);

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Músicas locais</Text>
          <Pressable accessibilityLabel="Atualizar biblioteca" onPress={() => void scan()}>
            <MaterialCommunityIcons name="refresh" size={24} color={C.soft}/>
          </Pressable>
        </View>

        {status === 'ready' ? <>
          <View style={s.inputWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={C.muted}/>
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={s.input}
              placeholder="Buscar neste aparelho..."
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Buscar músicas locais"
            />
          </View>
          <Text style={s.summary}>{query.trim() ? `${visibleTracks.length} de ${tracks.length}` : tracks.length} {tracks.length === 1 ? 'música' : 'músicas'} neste aparelho</Text>
        </> : null}

        {status === 'scanning' ? (
          <View style={s.state}>
            <ActivityIndicator color={C.purple}/>
            <Text style={s.stateText}>Lendo as músicas deste aparelho...</Text>
          </View>
        ) : null}

        {status === 'denied' ? (
          <View style={s.state}>
            <MaterialCommunityIcons name="music-off" size={34} color={C.muted}/>
            <Text style={s.stateTitle}>Acesso às músicas necessário</Text>
            <Text style={s.stateText}>Permita o acesso à biblioteca de áudio para o Seven Music encontrar suas músicas.</Text>
            <Pressable onPress={() => void scan()} style={s.button}>
              <Text style={s.buttonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}

        {status === 'error' ? (
          <View style={s.state}>
            <MaterialCommunityIcons name="alert-circle-outline" size={34} color={C.danger}/>
            <Text style={s.stateTitle}>Não conseguimos ler a biblioteca</Text>
            <Text style={s.stateText}>{error}</Text>
            <Pressable onPress={() => void scan()} style={s.button}>
              <Text style={s.buttonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}

        {status === 'ready' && tracks.length === 0 ? (
          <View style={s.state}>
            <MaterialCommunityIcons name="music-note-off-outline" size={34} color={C.muted}/>
            <Text style={s.stateTitle}>Nenhuma música encontrada</Text>
            <Text style={s.stateText}>Adicione arquivos de áudio ao aparelho e toque em atualizar.</Text>
          </View>
        ) : null}

        {status === 'ready' && tracks.length > 0 && visibleTracks.length === 0 ? (
          <Text style={s.noMatches}>Nenhuma música local encontrada para esta busca.</Text>
        ) : null}

        {status === 'ready' ? visibleTracks.map((track) => <TrackRow key={track.id} track={track} queue={visibleTracks}/>) : null}
        <View style={{ height: 132 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},
 content:{paddingHorizontal:18,paddingTop:8},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},
 title:{color:C.text,fontSize:25,fontWeight:'900'},
  inputWrap:{height:46,borderRadius:14,paddingHorizontal:13,backgroundColor:'#171922',borderWidth:1,borderColor:'#22242F',flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},
  input:{flex:1,color:C.text,fontSize:13,paddingVertical:0},
  summary:{color:C.muted,fontSize:12,marginBottom:12},
  noMatches:{color:C.muted,fontSize:12.5,lineHeight:18,paddingVertical:18},
 state:{minHeight:220,alignItems:'center',justifyContent:'center',paddingHorizontal:28,gap:10},
 stateTitle:{color:C.text,fontSize:16,fontWeight:'900',textAlign:'center'},
 stateText:{color:C.muted,fontSize:12.5,lineHeight:18,textAlign:'center'},
 button:{marginTop:6,height:40,paddingHorizontal:18,borderRadius:999,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
 buttonText:{color:'#180A20',fontSize:12,fontWeight:'900'}
});
