import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Artwork } from '@/ui';
import { TrackMenu } from '@/components/TrackMenu';
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
  const [menuVisible, setMenuVisible] = useState(false);

  const {
    track,
    playing,
    currentTime,
    duration,
    buffering,
    resolvingTrackId,
    error,
    favorites,
    shuffle,
    repeatMode,
    toggle,
    next,
    previous,
    seek,
    toggleFavorite,
    toggleShuffle,
    cycleRepeatMode,
    clearError,
  } = usePlayer();

  const progress = useMemo(
    () => duration > 0
      ? Math.min(1, Math.max(0, currentTime / duration))
      : 0,
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
  const busy = buffering || resolvingTrackId === track.id;
  const onlineAudio = track.source === 'youtube';

  return (
    <LinearGradient colors={['#0B0A10', '#08080D', '#05060A']} style={s.bg}>
      <SafeAreaView style={s.safe}>
        <View style={s.top}>
          <Pressable accessibilityLabel="Fechar player" onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-down" size={30} color={C.text}/>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Opções da música" onPress={() => setMenuVisible(true)} style={s.topMenuButton}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color={C.text}/>
          </Pressable>
        </View>

        <View style={s.art}>
          <Artwork track={track} size={art}/>

          {busy ? (
            <View style={s.buffer}>
              <ActivityIndicator size="small" color={C.purple} accessibilityLabel="Carregando áudio"/>
              <Text style={s.bufferText}>Carregando áudio...</Text>
            </View>
          ) : null}
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
            <MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={27} color={favorite ? C.purple : C.soft}/>
          </Pressable>
        </View>

        {error ? (
          <Pressable onPress={clearError} style={s.error}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger}/>
            <Text numberOfLines={2} style={s.errorText}>{error}</Text>
            <MaterialCommunityIcons name="close" size={17} color={C.muted}/>
          </Pressable>
        ) : null}

        <Pressable onPress={onSeek} onLayout={onProgressLayout} style={s.progress}>
          <View style={[s.fill, { width: progressWidth * progress }]}/>
          <View style={[s.knob, { left: Math.max(0, progressWidth * progress - 6) }]}/>
        </Pressable>

        <View style={s.times}>
          <Text style={s.time}>{formatTime(currentTime)}</Text>
          <Text style={s.time}>{duration > 0 ? formatTime(duration) : track.duration}</Text>
        </View>

        <View style={s.controls}>
          <Pressable accessibilityLabel={shuffle ? 'Desativar aleatório' : 'Ativar aleatório'} onPress={() => void toggleShuffle()}>
            <MaterialCommunityIcons name="shuffle-variant" size={25} color={shuffle ? C.purple : C.soft}/>
          </Pressable>
          <Pressable accessibilityLabel="Música anterior" onPress={() => void previous()}>
            <MaterialCommunityIcons name="skip-previous" size={39} color={C.text}/>
          </Pressable>
          <Pressable accessibilityLabel={playing ? 'Pausar' : 'Reproduzir'} disabled={busy} onPress={() => void toggle()} style={[s.play, busy && { opacity: .72 }]}>
            {busy
              ? <ActivityIndicator size="small" color="#17091F" accessibilityLabel="Carregando áudio"/>
              : <MaterialCommunityIcons name={playing ? 'pause' : 'play'} size={41} color="#17091F"/>}
          </Pressable>
          <Pressable accessibilityLabel="Próxima música" onPress={() => void next()}>
            <MaterialCommunityIcons name="skip-next" size={39} color={C.text}/>
          </Pressable>
          <Pressable accessibilityLabel="Alternar repetição" onPress={() => void cycleRepeatMode()}>
            <MaterialCommunityIcons name={repeatMode === 'one' ? 'repeat-once' : 'repeat'} size={25} color={repeatMode === 'off' ? C.soft : C.purple}/>
          </Pressable>
        </View>

        <View style={s.actions}>
          <Pressable style={s.action} onPress={() => router.push('/queue')}>
            <MaterialCommunityIcons name="playlist-music" size={22} color={C.soft}/>
            <Text style={s.actionText}>Fila</Text>
          </Pressable>
          <View style={s.action}>
            <MaterialCommunityIcons name="text" size={21} color={C.soft}/>
            <Text style={s.actionText}>Letras</Text>
          </View>
          <View style={s.action}>
            <MaterialCommunityIcons name={onlineAudio ? 'music-circle' : 'cellphone'} size={22} color={onlineAudio ? C.purple : C.soft}/>
            <Text style={s.actionText}>{onlineAudio ? 'Áudio online' : 'Dispositivo'}</Text>
          </View>
        </View>
      </SafeAreaView>
      {menuVisible ? <TrackMenu track={track} visible onClose={() => setMenuVisible(false)} showQueue /> : null}
    </LinearGradient>
  );
}

const s=StyleSheet.create({
  bg:{flex:1},
  safe:{flex:1,paddingHorizontal:22},
  top:{height:50,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  topMenuButton:{width:42,height:42,alignItems:'center',justifyContent:'center'},
  art:{alignItems:'center',justifyContent:'center',marginTop:12,marginBottom:26},
  buffer:{position:'absolute',bottom:12,backgroundColor:'rgba(7,8,12,.82)',paddingHorizontal:12,paddingVertical:6,borderRadius:999,flexDirection:'row',alignItems:'center',gap:8},
  bufferText:{color:C.soft,fontSize:10.5,fontWeight:'700'},
  meta:{flexDirection:'row',alignItems:'center',gap:10},
  title:{color:C.text,fontWeight:'900',fontSize:25,letterSpacing:-.4},
  artist:{color:C.soft,fontSize:15,marginTop:5},
  error:{marginTop:14,minHeight:46,borderRadius:12,backgroundColor:'#1B1017',borderWidth:1,borderColor:'#3B1D2A',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:9},
  errorText:{flex:1,color:'#E8B4C2',fontSize:11.5,lineHeight:15},
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
