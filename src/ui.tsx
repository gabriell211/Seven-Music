import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Track } from './music';
import { usePlayer } from './player';
import { C } from './theme';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={s.brand}>
      <LinearGradient colors={['#D36BFF', '#7D2DFF', '#3D145D']} style={[s.logo, compact && { width: 28, height: 28 }]}>
        <Text style={[s.logoText, compact && { fontSize: 22 }]}>7</Text>
      </LinearGradient>
      <Text style={s.word}>SEVEN <Text style={{ color: C.purple }}>MUSIC</Text></Text>
    </View>
  );
}

export function Chip({ label, active }: { label: string; active?: boolean }) {
  return <View style={[s.chip, active && s.chipOn]}><Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text></View>;
}

export function Artwork({ track, size = 64 }: { track: Track; size?: number }) {
  return (
    <LinearGradient colors={track.colors} style={{ width: size, height: size, borderRadius: Math.max(9, size * .08), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.06)' }}>
      <MaterialCommunityIcons name={track.id.includes('after') ? 'cat' : track.source === 'youtube' ? 'youtube' : 'album'} size={size * .4} color="rgba(255,255,255,.72)" />
    </LinearGradient>
  );
}

export function TrackRow({ track, source = false }: { track: Track; source?: boolean }) {
  const { play } = usePlayer();
  return (
    <Pressable style={s.row} onPress={() => play(track)}>
      <Artwork track={track} size={48}/>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={s.rowTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={s.rowSub}>{track.artist + ' · ' + track.duration + (source ? ' · YouTube' : '')}</Text>
      </View>
      <MaterialCommunityIcons name="dots-vertical" size={21} color={C.soft}/>
    </Pressable>
  );
}

export function MiniPlayer() {
  const { track, playing, toggle, next } = usePlayer();
  return (
    <Pressable onPress={() => router.push('/player')} style={s.mini}>
      <Artwork track={track} size={44}/>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={s.rowTitle}>{track.title}</Text>
        <Text numberOfLines={1} style={s.rowSub}>{track.artist}</Text>
      </View>
      <Pressable hitSlop={12} onPress={(e) => { e.stopPropagation(); toggle(); }}>
        <MaterialCommunityIcons name={playing ? 'pause' : 'play'} size={27} color={C.text}/>
      </Pressable>
      <Pressable hitSlop={12} onPress={(e) => { e.stopPropagation(); next(); }}>
        <MaterialCommunityIcons name="skip-next" size={27} color={C.text}/>
      </Pressable>
    </Pressable>
  );
}

const s=StyleSheet.create({
  brand:{flexDirection:'row',alignItems:'center',gap:8},
  logo:{width:34,height:34,borderRadius:9,alignItems:'center',justifyContent:'center',transform:[{skewX:'-10deg'}]},
  logoText:{color:'#FFF',fontSize:27,fontWeight:'900',fontStyle:'italic',marginTop:-2},
  word:{color:C.text,fontSize:12,fontWeight:'900',letterSpacing:1.8},
  chip:{height:34,paddingHorizontal:16,borderRadius:999,backgroundColor:'#1B1D27',borderWidth:1,borderColor:'#252733',alignItems:'center',justifyContent:'center'},
  chipOn:{backgroundColor:C.purple,borderColor:C.purple},
  chipText:{color:C.soft,fontSize:12,fontWeight:'700'},
  chipTextOn:{color:'#17091F'},
  row:{minHeight:62,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:7},
  rowTitle:{color:C.text,fontSize:14,fontWeight:'800'},
  rowSub:{color:C.muted,fontSize:11.5,marginTop:3},
  mini:{position:'absolute',left:10,right:10,bottom:66,height:58,zIndex:10,borderRadius:14,backgroundColor:'#14151C',borderWidth:1,borderColor:'#252733',flexDirection:'row',alignItems:'center',gap:10,padding:7,paddingRight:12,elevation:12}
});