import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Track } from './music';
import { usePlayer } from './player';
import { C } from './theme';
import { SevenMark } from './components/SevenMark';
import { TrackMenu } from './components/TrackMenu';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={s.brand}>
      <SevenMark size={compact ? 27 : 32}/>
      <Text style={s.word}>SEVEN <Text style={{ color: C.purple }}>MUSIC</Text></Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const content = <Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text>;
  const style = [s.chip, active && s.chipOn];

  return onPress
    ? <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={style}>{content}</Pressable>
    : <View style={style}>{content}</View>;
}

export function Artwork({ track, size = 64 }: { track: Track; size?: number }) {
  const radius = Math.max(9, size * .08);

  if (track.thumbnail) {
    return (
      <Image
        source={{ uri: track.thumbnail }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: C.panel }}
        resizeMode="cover"
        accessibilityLabel={'Capa de ' + track.title}
      />
    );
  }

  return (
    <LinearGradient colors={track.colors} style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.06)' }}>
      <MaterialCommunityIcons name={track.id.includes('after') ? 'cat' : track.source === 'soundcloud' ? 'soundcloud' : 'album'} size={size * .4} color="rgba(255,255,255,.72)" />
    </LinearGradient>
  );
}

export function TrackRow({ track, source = false, queue }: { track: Track; source?: boolean; queue?: readonly Track[] }) {
  const { play, resolvingTrackId } = usePlayer();
  const [menuVisible, setMenuVisible] = useState(false);
  const resolving = resolvingTrackId === track.id;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Tocar ' + track.title + ' de ' + track.artist}
      style={({ pressed }) => [s.row, pressed && { opacity: .72 }]}
      onPress={() => { if (!resolving) void play(track, queue); }}
    >
      <Artwork track={track} size={48}/>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={s.rowTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={s.rowSub}>{resolving ? 'Carregando áudio...' : track.artist + ' · ' + track.duration + (source ? ' · SoundCloud' : '')}</Text>
      </View>
      {resolving ? <ActivityIndicator size="small" color={C.purple} accessibilityLabel="Carregando áudio"/> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Opções de ' + track.title}
        hitSlop={8}
        onPress={(event) => {
          event.stopPropagation();
          setMenuVisible(true);
        }}
        style={s.rowMenuButton}
      >
        <MaterialCommunityIcons name="dots-vertical" size={21} color={C.soft}/>
      </Pressable>
      {menuVisible ? (
        <TrackMenu
          track={track}
          visible
          onClose={() => setMenuVisible(false)}
          onPlay={() => { if (!resolving) void play(track, queue); }}
        />
      ) : null}
    </Pressable>
  );
}

export function MiniPlayer() {
  const { bottom } = useSafeAreaInsets();
  const { track, hasSelection, playing, resolvingTrackId, toggle, next } = usePlayer();
  const busy = resolvingTrackId === track.id;

  if (!hasSelection) return null;

  return (
    <Pressable onPress={() => router.push('/player')} style={[s.mini, { bottom: 66 + bottom }]}>
      <Artwork track={track} size={44}/>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={s.rowTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={s.rowSub}>{busy ? 'Carregando áudio...' : track.artist}</Text>
      </View>
      <Pressable
        accessibilityLabel={playing ? 'Pausar' : 'Reproduzir'}
        hitSlop={12}
        onPress={(e) => {
          e.stopPropagation();
          void toggle();
        }}
      >
        {busy
          ? <ActivityIndicator size="small" color={C.purple} accessibilityLabel="Carregando áudio"/>
          : <MaterialCommunityIcons name={playing ? 'pause' : 'play'} size={27} color={C.text}/>}
      </Pressable>
      <Pressable accessibilityLabel="Próxima música" hitSlop={12} onPress={(e) => { e.stopPropagation(); void next(); }}>
        <MaterialCommunityIcons name="skip-next" size={27} color={C.text}/>
      </Pressable>
    </Pressable>
  );
}

const s=StyleSheet.create({
  brand:{flexDirection:'row',alignItems:'center',gap:8},
  word:{color:C.text,fontSize:12,fontWeight:'900',letterSpacing:1.8},
  chip:{height:34,paddingHorizontal:16,borderRadius:999,backgroundColor:'#1B1D27',borderWidth:1,borderColor:'#252733',alignItems:'center',justifyContent:'center'},
  chipOn:{backgroundColor:C.purple,borderColor:C.purple},
  chipText:{color:C.soft,fontSize:12,fontWeight:'700'},
  chipTextOn:{color:'#17091F'},
  row:{minHeight:62,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:7},
  rowMenuButton:{width:38,height:44,alignItems:'center',justifyContent:'center'},
  rowTitle:{color:C.text,fontSize:14,fontWeight:'800'},
  rowSub:{color:C.muted,fontSize:11.5,marginTop:3},
  mini:{position:'absolute',left:10,right:10,bottom:66,height:58,zIndex:10,borderRadius:14,backgroundColor:'#14151C',borderWidth:1,borderColor:'#252733',flexDirection:'row',alignItems:'center',gap:10,padding:7,paddingRight:12,elevation:12}
});
