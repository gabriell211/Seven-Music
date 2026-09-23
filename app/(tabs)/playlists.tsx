import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/theme';

const lists=[
 ['Músicas Curtidas','245 músicas',['#6D1CAF','#BE59FF'],'heart'],
 ['Minha Playlist','73 músicas',['#F1A33B','#4B2E53'],'weather-sunset'],
 ['Trap / Phonk','118 músicas',['#24151C','#7C3347'],'car-sports'],
 ['Rock','64 músicas',['#0E1016','#4E5563'],'guitar-electric'],
 ['Eletrônica','91 músicas',['#03275A','#7A29FF'],'lightning-bolt'],
 ['Sad Vibes','102 músicas',['#573A6B','#B485D1'],'weather-night']
] as const;

export default function Playlists(){
 return <SafeAreaView edges={['top']} style={s.safe}><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
  <View style={s.header}><Text style={s.title}>Playlists</Text><MaterialCommunityIcons name="plus" size={28} color={C.soft}/></View>
  {lists.map(item=><View key={item[0]} style={s.row}><LinearGradient colors={item[2]} style={s.cover}><MaterialCommunityIcons name={item[3]} size={29} color="#FFF"/></LinearGradient><View style={{flex:1}}><Text style={s.name}>{item[0]}</Text><Text style={s.count}>{item[1]}</Text></View><MaterialCommunityIcons name="dots-vertical" size={22} color={C.soft}/></View>)}
  <View style={{height:132}}/>
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},content:{paddingHorizontal:18,paddingTop:8},
 header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},title:{color:C.text,fontSize:25,fontWeight:'900'},
 row:{minHeight:72,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:7},cover:{width:58,height:58,borderRadius:9,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.06)'},
 name:{color:C.text,fontWeight:'800',fontSize:14},count:{color:C.muted,fontSize:11.5,marginTop:3}
});