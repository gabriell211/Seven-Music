import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Artwork, Brand, Chip } from '@/ui';
import { localTracks } from '@/music';
import { usePlayer } from '@/player';
import { C } from '@/theme';

const mixes=[
  {title:'Mix\nDiário',sub:'Feito para você',colors:['#163960','#5A7BB8'] as const,icon:'account-music' as const},
  {title:'Vibes\nNoturnas',sub:'',colors:['#080819','#5E22B8'] as const,icon:'weather-night' as const},
  {title:'Rock\nClássico',sub:'',colors:['#231010','#C3432A'] as const,icon:'guitar-electric' as const},
];

export default function Home(){
 const {play}=usePlayer();
 return <SafeAreaView edges={['top']} style={s.safe}>
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
   <View style={s.top}><Brand/><Pressable onPress={()=>router.push('/settings')} style={s.icon}><MaterialCommunityIcons name="cog-outline" size={23} color={C.soft}/></Pressable></View>
   <Text style={s.hero}>Boa música,{"\n"}sempre com você.</Text>
   <Pressable onPress={()=>router.push('/search')} style={s.search}><MaterialCommunityIcons name="magnify" size={20} color={C.muted}/><Text style={s.searchText}>Buscar músicas, artistas, vídeos...</Text></Pressable>
   <View style={s.chips}><Chip label="Tudo" active/><Chip label="No dispositivo"/><Chip label="YouTube"/></View>
   <View style={s.section}><Text style={s.sectionTitle}>Continue ouvindo</Text><Text style={s.action}>Ver tudo ›</Text></View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hrow}>
    {localTracks.slice(0,3).map(t=><Pressable key={t.id} style={s.card} onPress={()=>play(t)}><Artwork track={t} size={112}/><Text numberOfLines={1} style={s.cardTitle}>{t.title}</Text><Text numberOfLines={1} style={s.cardSub}>{t.artist}</Text></Pressable>)}
   </ScrollView>
   <View style={s.section}><Text style={s.sectionTitle}>Para você</Text><Text style={s.action}>Ver tudo ›</Text></View>
   <View style={s.mixRow}>{mixes.map(m=><LinearGradient key={m.title} colors={m.colors} style={s.mix}><MaterialCommunityIcons name={m.icon} size={30} color="rgba(255,255,255,.75)"/><View><Text style={s.mixTitle}>{m.title}</Text>{m.sub?<Text style={s.mixSub}>{m.sub}</Text>:null}</View></LinearGradient>)}</View>
   <View style={{height:128}}/>
  </ScrollView>
 </SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},content:{paddingHorizontal:18,paddingTop:8,gap:18},
 top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 icon:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#101117',borderWidth:1,borderColor:'#1A1C24'},
 hero:{color:C.text,fontSize:30,lineHeight:34,fontWeight:'900',letterSpacing:-.8},
 search:{height:48,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,borderRadius:14,backgroundColor:'#171922',borderWidth:1,borderColor:'#20222D'},
 searchText:{color:C.muted,fontSize:13},chips:{flexDirection:'row',gap:8},
 section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitle:{color:C.text,fontSize:18,fontWeight:'900'},action:{color:C.muted,fontSize:12,fontWeight:'700'},
 hrow:{gap:12,paddingRight:12},card:{width:112},cardTitle:{color:C.text,fontWeight:'800',fontSize:12.5,marginTop:8},cardSub:{color:C.muted,fontSize:11,marginTop:2},
 mixRow:{flexDirection:'row',gap:10},mix:{flex:1,aspectRatio:.92,borderRadius:14,padding:12,justifyContent:'space-between',borderWidth:1,borderColor:'rgba(255,255,255,.05)'},
 mixTitle:{color:'#FFF',fontWeight:'900',fontSize:14,lineHeight:14},mixSub:{color:'rgba(255,255,255,.7)',fontSize:9.5,marginTop:4}
});