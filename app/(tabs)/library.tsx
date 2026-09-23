import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, TrackRow } from '@/ui';
import { useMusicLibrary } from '@/library';
import { C } from '@/theme';

export default function Library() {
  const { tracks, status, error, scan } = useMusicLibrary();

  useEffect(() => {
    if (status === 'idle') void scan();
  }, [scan, status]);

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Biblioteca</Text>
          <Pressable accessibilityLabel="Atualizar biblioteca" onPress={() => void scan()}>
            <MaterialCommunityIcons name="refresh" size={24} color={C.soft}/>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip label="Músicas" active/>
          <Chip label="Artistas"/>
          <Chip label="Álbuns"/>
          <Chip label="Pastas"/>
        </ScrollView>

        <View style={s.sort}>
          <Text style={s.sortLabel}>Ordenar por</Text>
          <View style={s.pill}>
            <Text style={s.sortValue}>Mais recentes</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color={C.soft}/>
          </View>
          <View style={s.shuffle}>
            <MaterialCommunityIcons name="shuffle" size={19} color="#180A20"/>
          </View>
        </View>

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

        {tracks.map((track) => <TrackRow key={track.id} track={track}/>)}
        <View style={{ height: 132 }}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},
 content:{paddingHorizontal:18,paddingTop:8},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:15},
 title:{color:C.text,fontSize:25,fontWeight:'900'},
 chips:{gap:8,paddingRight:8},
 sort:{marginTop:16,marginBottom:8,flexDirection:'row',alignItems:'center',gap:9},
 sortLabel:{color:C.soft,fontSize:12},
 pill:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#1B1D27',borderRadius:999,paddingHorizontal:12,height:33,borderWidth:1,borderColor:'#252733'},
 sortValue:{color:C.soft,fontSize:11.5,fontWeight:'700'},
 shuffle:{marginLeft:'auto',width:36,height:36,borderRadius:12,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
 state:{minHeight:220,alignItems:'center',justifyContent:'center',paddingHorizontal:28,gap:10},
 stateTitle:{color:C.text,fontSize:16,fontWeight:'900',textAlign:'center'},
 stateText:{color:C.muted,fontSize:12.5,lineHeight:18,textAlign:'center'},
 button:{marginTop:6,height:40,paddingHorizontal:18,borderRadius:999,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
 buttonText:{color:'#180A20',fontSize:12,fontWeight:'900'}
});
