import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollections } from '@/collections';
import { Artwork } from '@/ui';
import { usePlayer } from '@/player';
import { C } from '@/theme';

export default function Playlists() {
  const { playlists, history, createPlaylist } = useCollections();
  const { play } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    try {
      setError(null);
      const playlist = await createPlaylist(name);
      setName('');
      setCreating(false);
      router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Não foi possível criar a playlist.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Playlists</Text>
          <Pressable accessibilityLabel="Criar playlist" onPress={() => setCreating(true)} style={s.add}>
            <MaterialCommunityIcons name="plus" size={23} color="#180A20"/>
          </Pressable>
        </View>

        {playlists.map((playlist, index) => {
          const palettes = [
            ['#6D1CAF','#BE59FF'],
            ['#F1A33B','#4B2E53'],
            ['#24151C','#7C3347'],
            ['#03275A','#7A29FF'],
          ] as const;
          const colors = palettes[index % palettes.length]!;

          return (
            <Pressable
              key={playlist.id}
              style={({ pressed }) => [s.row, pressed && { opacity: .72 }]}
              onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
            >
              <LinearGradient colors={colors} style={s.cover}>
                <MaterialCommunityIcons name="playlist-music" size={29} color="#FFF"/>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={s.name}>{playlist.name}</Text>
                <Text style={s.count}>{playlist.trackIds.length} {playlist.trackIds.length === 1 ? 'música' : 'músicas'}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted}/>
            </Pressable>
          );
        })}

        {playlists.length === 0 ? (
          <Pressable onPress={() => setCreating(true)} style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <MaterialCommunityIcons name="playlist-plus" size={27} color={C.purple}/>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.emptyTitle}>Crie sua primeira playlist</Text>
              <Text style={s.emptyText}>Organize músicas locais e do SoundCloud do seu jeito.</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ouvidas recentemente</Text>
          <Text style={s.sectionMeta}>{history.length}</Text>
        </View>

        {history.slice(0, 12).map((entry) => (
          <Pressable
            key={entry.track.id}
            style={s.historyRow}
            onPress={() => void play(entry.track, history.map((item) => item.track))}
          >
            <Artwork track={entry.track} size={48}/>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={s.name}>{entry.track.title}</Text>
              <Text numberOfLines={1} style={s.count}>{entry.track.artist}</Text>
            </View>
            <MaterialCommunityIcons name="play" size={22} color={C.soft}/>
          </Pressable>
        ))}

        {history.length === 0 ? (
          <Text style={s.historyEmpty}>Seu histórico aparecerá aqui conforme você ouvir músicas.</Text>
        ) : null}

        <View style={{ height: 132 }}/>
      </ScrollView>

      <Modal
        visible={creating}
        transparent
        animationType="fade"
        onRequestClose={() => setCreating(false)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Nova playlist</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nome da playlist"
              placeholderTextColor={C.muted}
              maxLength={60}
              autoFocus
              style={s.input}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <View style={s.modalActions}>
              <Pressable onPress={() => { setCreating(false); setError(null); }} style={s.cancelButton}>
                <Text style={s.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={() => void submit()} style={s.createButton}>
                <Text style={s.createText}>Criar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  content:{paddingHorizontal:18,paddingTop:8},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
  title:{color:C.text,fontSize:25,fontWeight:'900'},
  add:{width:38,height:38,borderRadius:13,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
  row:{minHeight:72,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:7},
  cover:{width:58,height:58,borderRadius:9,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.06)'},
  name:{color:C.text,fontWeight:'800',fontSize:14},
  count:{color:C.muted,fontSize:11.5,marginTop:3},
  emptyCard:{minHeight:82,flexDirection:'row',alignItems:'center',gap:12,padding:13,borderRadius:15,backgroundColor:'#11121A',borderWidth:1,borderColor:'#222431'},
  emptyIcon:{width:48,height:48,borderRadius:14,backgroundColor:'#1A1026',alignItems:'center',justifyContent:'center'},
  emptyTitle:{color:C.text,fontSize:13.5,fontWeight:'900'},
  emptyText:{color:C.muted,fontSize:11.5,lineHeight:16,marginTop:3},
  section:{marginTop:26,marginBottom:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  sectionTitle:{color:C.text,fontSize:17,fontWeight:'900'},
  sectionMeta:{color:C.muted,fontSize:11.5},
  historyRow:{minHeight:62,flexDirection:'row',alignItems:'center',gap:11,paddingVertical:6},
  historyEmpty:{color:C.muted,fontSize:12.5,lineHeight:18,paddingVertical:16},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,.68)',alignItems:'center',justifyContent:'center',padding:22},
  modal:{width:'100%',maxWidth:420,borderRadius:20,backgroundColor:'#12131B',borderWidth:1,borderColor:'#292B36',padding:18},
  modalTitle:{color:C.text,fontSize:19,fontWeight:'900',marginBottom:14},
  input:{height:48,borderRadius:13,backgroundColor:'#1A1C25',borderWidth:1,borderColor:'#2A2C38',paddingHorizontal:13,color:C.text,fontSize:14},
  error:{color:'#F0A7B9',fontSize:11.5,marginTop:8},
  modalActions:{flexDirection:'row',justifyContent:'flex-end',gap:9,marginTop:16},
  cancelButton:{height:40,paddingHorizontal:15,borderRadius:11,alignItems:'center',justifyContent:'center'},
  cancelText:{color:C.soft,fontWeight:'800',fontSize:12},
  createButton:{height:40,paddingHorizontal:18,borderRadius:11,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
  createText:{color:'#180A20',fontWeight:'900',fontSize:12}
});
