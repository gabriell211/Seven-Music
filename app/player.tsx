import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Artwork } from '@/ui';
import { usePlayer } from '@/player';
import { C } from '@/theme';

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return String(minutes) + ':' + rest.toString().padStart(2, '0');
}

export default function Player() {
  const { width } = useWindowDimensions();
  const art = Math.min(width - 44, 360);
  const [progressWidth, setProgressWidth] = useState(1);

  const {
    track,
    playing,
    currentTime,
    duration,
    buffering,
    favorites,
    toggle,
    next,
    previous,
    seek,
    toggleFavorite,
  } = usePlayer();

  const progress = useMemo(
    () => duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0,
    [currentTime, duration],
  );

  const onProgressLayout = (event: LayoutChangeEvent) => {
    setProgressWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const onSeek = (event: GestureResponderEvent) => {
    if (duration <= 0) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / progressWidth));
    void seek(duration * ratio);
  };

  const favorite = favorites.has(track.id);

  return (
    <LinearGradient colors={['#0B0A10', '#08080D', '#05060A']} style={s.bg}>
      <SafeAreaView style={s.safe}>
        <View style={s.top}>
          <Pressable accessibilityLabel="Fechar player" onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-down" size={30} color={C.text}/>
          </Pressable>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={C.text}/>
        </View>

        <View style={s.art}>
          <Artwork track={track} size={art}/>
          {buffering ? <View style={s.buffer}><Text style={s.bufferText}>Carregando...</Text></View> : null}
        </View>

        <View style={s.meta}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.title}>{track.title}</Text>
            <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>
          </View>
          <Pressable
            accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            hitSlop={12}
            onPress={() => void toggleFavorite()}
          >
            <MaterialCommunityIcons
              name={favorite ? 'heart' : 'heart-outline'}
              size={27}
              color={favorite ? C.purple : C.soft}
            />
          </Pressable>
        </View>

        <Pressable onPress={onSeek} onLayout={onProgressLayout} style={s.progress}>
          <View style={[s.fill, { width: String(progress * 100) + '%' }]}/>
          <View style={[s.knob, { left: Math.max(0, progressWidth * progress - 6) }]}/>
        </Pressable>

        <View style={s.times}>
          <Text style={s.time}>{formatTime(currentTime)}</Text>
          <Text style={s.time}>{duration > 0 ? formatTime(duration) : track.duration}</Text>
        </View>

        <View style={s.controls}>
          <MaterialCommunityIcons name="shuffle-variant" size={25} color={C.soft}/>
          <Pressable accessibilityLabel="Música anterior" onPress={() => void previous()}>
            <MaterialCommunityIcons name="skip-previous" size={39} color={C.text}/>
          </Pressable>
          <Pressable accessibilityLabel={playing ? 'Pausar' : 'Reproduzir'} onPress={() => void toggle()} style={s.play}>
            <MaterialCommunityIcons name={playing ? 'pause' : 'play'} size={41} color="#17091F"/>
          </Pressable>
          <Pressable accessibilityLabel="Próxima música" onPress={() => void next()}>
            <MaterialCommunityIcons name="skip-next" size={39} color={C.text}/>
          </Pressable>
          <MaterialCommunityIcons name="repeat" size={25} color={C.soft}/>
        </View>

        <View style={s.actions}>
          <View style={s.action}>
            <MaterialCommunityIcons name="playlist-music" size={22} color={C.soft}/>
            <Text style={s.actionText}>Fila</Text>
          </View>
          <View style={s.action}>
            <MaterialCommunityIcons name="text" size={21} color={C.soft}/>
            <Text style={s.actionText}>Letras</Text>
          </View>
          <View style={s.action}>
            <MaterialCommunityIcons name="cast" size={22} color={C.soft}/>
            <Text style={s.actionText}>Dispositivos</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s=StyleSheet.create({
 bg:{flex:1},
 safe:{flex:1,paddingHorizontal:22},
 top:{height:50,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 art:{alignItems:'center',justifyContent:'center',marginTop:12,marginBottom:26},
 buffer:{position:'absolute',bottom:12,backgroundColor:'rgba(7,8,12,.82)',paddingHorizontal:12,paddingVertical:6,borderRadius:999},
 bufferText:{color:C.soft,fontSize:10.5,fontWeight:'700'},
 meta:{flexDirection:'row',alignItems:'center',gap:10},
 title:{color:C.text,fontWeight:'900',fontSize:25,letterSpacing:-.4},
 artist:{color:C.soft,fontSize:15,marginTop:5},
 progress:{height:20,justifyContent:'center',marginTop:18},
 fill:{position:'absolute',left:0,height:4,borderRadius:999,backgroundColor:C.purple},
 knob:{position:'absolute',width:12,height:12,borderRadius:6,backgroundColor:C.purple},
 times:{flexDirection:'row',justifyContent:'space-between'},
 time:{color:C.soft,fontSize:11},
 controls:{marginTop:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 play:{width:66,height:66,borderRadius:33,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
 actions:{marginTop:34,paddingTop:18,borderTopWidth:1,borderTopColor:'#1A1C24',flexDirection:'row',justifyContent:'space-around'},
 action:{alignItems:'center',gap:6},
 actionText:{color:C.soft,fontSize:11.5,fontWeight:'600'}
});
