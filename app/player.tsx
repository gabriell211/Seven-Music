import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Artwork } from '@/ui';
import { usePlayer } from '@/player';
import { C } from '@/theme';

export default function Player(){
 const {width}=useWindowDimensions();
 const art=Math.min(width-44,360);
 const {track,playing,toggle,next,previous}=usePlayer();
 return <LinearGradient colors={['#0B0A10','#08080D','#05060A']} style={s.bg}>
  <SafeAreaView style={s.safe}>
   <View style={s.top}><Pressable onPress={()=>router.back()}><MaterialCommunityIcons name="chevron-down" size={30} color={C.text}/></Pressable><MaterialCommunityIcons name="dots-vertical" size={24} color={C.text}/></View>
   <View style={s.art}><Artwork track={track} size={art}/></View>
   <View style={s.meta}><View style={{flex:1}}><Text numberOfLines={1} style={s.title}>{track.title}</Text><Text numberOfLines={1} style={s.artist}>{track.artist}</Text></View><MaterialCommunityIcons name="heart" size={27} color={C.purple}/></View>
   <View style={s.progress}><View style={s.fill}/><View style={s.knob}/></View>
   <View style={s.times}><Text style={s.time}>1:24</Text><Text style={s.time}>{track.duration}</Text></View>
   <View style={s.controls}>
    <MaterialCommunityIcons name="shuffle-variant" size={25} color={C.soft}/>
    <Pressable onPress={previous}><MaterialCommunityIcons name="skip-previous" size={39} color={C.text}/></Pressable>
    <Pressable onPress={toggle} style={s.play}><MaterialCommunityIcons name={playing?'pause':'play'} size={41} color="#17091F"/></Pressable>
    <Pressable onPress={next}><MaterialCommunityIcons name="skip-next" size={39} color={C.text}/></Pressable>
    <MaterialCommunityIcons name="repeat" size={25} color={C.soft}/>
   </View>
   <View style={s.actions}>
    <View style={s.action}><MaterialCommunityIcons name="playlist-music" size={22} color={C.soft}/><Text style={s.actionText}>Fila</Text></View>
    <View style={s.action}><MaterialCommunityIcons name="text" size={21} color={C.soft}/><Text style={s.actionText}>Letras</Text></View>
    <View style={s.action}><MaterialCommunityIcons name="cast" size={22} color={C.soft}/><Text style={s.actionText}>Dispositivos</Text></View>
   </View>
  </SafeAreaView>
 </LinearGradient>
}

const s=StyleSheet.create({
 bg:{flex:1},safe:{flex:1,paddingHorizontal:22},top:{height:50,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 art:{alignItems:'center',justifyContent:'center',marginTop:12,marginBottom:26},
 meta:{flexDirection:'row',alignItems:'center',gap:10},title:{color:C.text,fontWeight:'900',fontSize:25,letterSpacing:-.4},artist:{color:C.soft,fontSize:15,marginTop:5},
 progress:{height:4,borderRadius:999,backgroundColor:'#464A55',marginTop:26},fill:{width:'38%',height:4,borderRadius:999,backgroundColor:C.purple},
 knob:{position:'absolute',left:'37%',top:-4,width:12,height:12,borderRadius:6,backgroundColor:C.purple},
 times:{flexDirection:'row',justifyContent:'space-between',marginTop:8},time:{color:C.soft,fontSize:11},
 controls:{marginTop:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},play:{width:66,height:66,borderRadius:33,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
 actions:{marginTop:34,paddingTop:18,borderTopWidth:1,borderTopColor:'#1A1C24',flexDirection:'row',justifyContent:'space-around'},
 action:{alignItems:'center',gap:6},actionText:{color:C.soft,fontSize:11.5,fontWeight:'600'}
});