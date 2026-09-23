import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, TrackRow } from '@/ui';
import { localTracks } from '@/music';
import { C } from '@/theme';

export default function Library(){
 return <SafeAreaView edges={['top']} style={s.safe}><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
  <View style={s.header}><Text style={s.title}>Biblioteca</Text><MaterialCommunityIcons name="magnify" size={24} color={C.soft}/></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}><Chip label="Músicas" active/><Chip label="Artistas"/><Chip label="Álbuns"/><Chip label="Pastas"/></ScrollView>
  <View style={s.sort}><Text style={s.sortLabel}>Ordenar por</Text><View style={s.pill}><Text style={s.sortValue}>Mais recentes</Text><MaterialCommunityIcons name="chevron-down" size={16} color={C.soft}/></View><View style={s.shuffle}><MaterialCommunityIcons name="shuffle" size={19} color="#180A20"/></View></View>
  {localTracks.map(t=><TrackRow key={t.id} track={t}/>)}
  <View style={{height:132}}/>
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},content:{paddingHorizontal:18,paddingTop:8},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:15},title:{color:C.text,fontSize:25,fontWeight:'900'},
 chips:{gap:8,paddingRight:8},sort:{marginTop:16,marginBottom:8,flexDirection:'row',alignItems:'center',gap:9},
 sortLabel:{color:C.soft,fontSize:12},pill:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#1B1D27',borderRadius:999,paddingHorizontal:12,height:33,borderWidth:1,borderColor:'#252733'},
 sortValue:{color:C.soft,fontSize:11.5,fontWeight:'700'},shuffle:{marginLeft:'auto',width:36,height:36,borderRadius:12,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'}
});