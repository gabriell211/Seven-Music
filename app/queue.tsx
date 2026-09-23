import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Artwork } from '@/ui';
import { usePlayer } from '@/player';
import { C } from '@/theme';

export default function QueueScreen() {
  const { track, queue, play, removeFromQueue, clearQueue } = usePlayer();

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Voltar" onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-down" size={30} color={C.text}/>
        </Pressable>
        <Text style={s.title}>Fila</Text>
        <Pressable onPress={() => void clearQueue()}>
          <Text style={s.clear}>Limpar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {queue.map((item, index) => {
          const active = item.id === track.id;

          return (
            <Pressable
              key={item.id}
              onPress={() => void play(item, queue)}
              style={[s.row, active && s.active]}
            >
              <Text style={[s.index, active && { color: C.purple }]}>
                {active ? '▶' : index + 1}
              </Text>
              <Artwork track={item} size={48}/>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={s.name}>{item.title}</Text>
                <Text numberOfLines={1} style={s.artist}>{item.artist}</Text>
              </View>
              {!active ? (
                <Pressable
                  accessibilityLabel={'Remover ' + item.title + ' da fila'}
                  hitSlop={10}
                  onPress={(event) => {
                    event.stopPropagation();
                    void removeFromQueue(item.id);
                  }}
                >
                  <MaterialCommunityIcons name="close" size={21} color={C.muted}/>
                </Pressable>
              ) : (
                <MaterialCommunityIcons name="waveform" size={22} color={C.purple}/>
              )}
            </Pressable>
          );
        })}

        {queue.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="playlist-remove" size={38} color={C.muted}/>
            <Text style={s.emptyTitle}>A fila está vazia</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  header:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#171923'},
  title:{color:C.text,fontSize:18,fontWeight:'900'},
  clear:{color:C.purple,fontSize:12,fontWeight:'800'},
  content:{paddingHorizontal:18,paddingVertical:12,paddingBottom:40},
  row:{minHeight:66,flexDirection:'row',alignItems:'center',gap:11,paddingHorizontal:9,borderRadius:13},
  active:{backgroundColor:'#14101B'},
  index:{width:22,textAlign:'center',color:C.muted,fontSize:11,fontWeight:'800'},
  name:{color:C.text,fontSize:13.5,fontWeight:'800'},
  artist:{color:C.muted,fontSize:11.5,marginTop:3},
  empty:{minHeight:280,alignItems:'center',justifyContent:'center',gap:10},
  emptyTitle:{color:C.soft,fontSize:14,fontWeight:'800'}
});
