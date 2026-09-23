import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, TrackRow } from '@/ui';
import { localTracks, youtubeTracks } from '@/music';
import { C } from '@/theme';

export default function Search(){
 const [query,setQuery]=useState('linkin park');
 return <SafeAreaView edges={['top']} style={s.safe}>
  <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
   <View style={s.searchRow}><View style={s.inputWrap}><MaterialCommunityIcons name="magnify" size={20} color={C.muted}/><TextInput value={query} onChangeText={setQuery} style={s.input} placeholder="Buscar" placeholderTextColor={C.muted}/>{query?<MaterialCommunityIcons name="close-circle" size={17} color={C.muted}/>:null}</View><Text style={s.cancel}>Cancelar</Text></View>
   <View style={s.chips}><Chip label="Tudo" active/><Chip label="No dispositivo (2)"/><Chip label="YouTube (50+)"/></View>
   <Text style={s.section}>No seu dispositivo</Text>{localTracks.slice(1,3).map(t=><TrackRow key={t.id} track={t}/>)}
   <Text style={s.section}>No YouTube</Text>{youtubeTracks.map(t=><TrackRow key={t.id} track={t} source/>)}
   <View style={{height:132}}/>
  </ScrollView>
 </SafeAreaView>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},content:{paddingHorizontal:18,paddingTop:8},
 searchRow:{flexDirection:'row',alignItems:'center',gap:10},
 inputWrap:{flex:1,height:44,borderRadius:999,paddingHorizontal:13,backgroundColor:'#171922',borderWidth:1,borderColor:'#22242F',flexDirection:'row',alignItems:'center',gap:8},
 input:{flex:1,color:C.text,fontSize:13,paddingVertical:0},cancel:{color:C.soft,fontWeight:'600',fontSize:12},
 chips:{flexDirection:'row',gap:8,marginTop:14,marginBottom:22},section:{color:C.text,fontSize:17,fontWeight:'900',marginBottom:6,marginTop:10}
});