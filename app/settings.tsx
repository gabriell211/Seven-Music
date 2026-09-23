import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '@/ui';
import { C } from '@/theme';
import { SevenMark } from '@/components/SevenMark';

const rows=[
 ['cog-outline','Configurações',''],
 ['weather-night','Aparência','Escuro'],
 ['tune-vertical','Qualidade do áudio','Automática'],
 ['archive-outline','Cache e armazenamento',''],
 ['folder-music-outline','Importar músicas',''],
 ['information-outline','Mais sobre o app','']
] as const;

export default function Settings(){
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <View style={s.header}><Pressable onPress={()=>router.back()}><MaterialCommunityIcons name="chevron-left" size={30} color={C.text}/></Pressable><Brand compact/><View style={{width:30}}/></View>
  <View style={s.profile}><View style={s.avatar}><SevenMark size={45}/></View><View><Text style={s.name}>Seven Music</Text><Text style={s.tagline}>Sua música. Sem limites.</Text></View></View>
  <View style={s.panel}>{rows.map((r,i)=><View key={r[1]} style={[s.row,i<rows.length-1&&s.divider]}><MaterialCommunityIcons name={r[0]} size={22} color={C.soft}/><Text style={s.label}>{r[1]}</Text>{r[2]?<Text style={s.value}>{r[2]}</Text>:null}{i>0&&i<3?<MaterialCommunityIcons name="chevron-right" size={20} color={C.muted}/>:null}</View>)}</View>
  <View style={s.version}><View style={s.smallLogo}><SevenMark size={29}/></View><View style={{flex:1}}><Text style={s.versionTitle}>Seven Music v0.1.0</Text><Text style={s.versionSub}>Feito por quem vive música.</Text></View><MaterialCommunityIcons name="heart" size={22} color={C.danger}/></View>
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},content:{paddingHorizontal:18,paddingBottom:30},
 header:{height:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 profile:{flexDirection:'row',alignItems:'center',gap:14,marginTop:14,marginBottom:22},
 avatar:{width:70,height:70,borderRadius:35,backgroundColor:'#15101E',borderWidth:1,borderColor:'#392154',alignItems:'center',justifyContent:'center'},
 name:{color:C.text,fontSize:18,fontWeight:'900'},tagline:{color:C.muted,fontSize:11.5,marginTop:4},
 panel:{borderTopWidth:1,borderBottomWidth:1,borderColor:'#1A1C24'},row:{minHeight:58,flexDirection:'row',alignItems:'center',gap:13},divider:{borderBottomWidth:1,borderBottomColor:'#1A1C24'},
 label:{color:C.text,fontSize:14,fontWeight:'600',flex:1},value:{color:C.muted,fontSize:11.5},
 version:{marginTop:22,padding:14,borderRadius:14,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.panel,borderWidth:1,borderColor:'#1A1C24'},
 smallLogo:{width:42,height:42,borderRadius:12,backgroundColor:'#1A0F2A',alignItems:'center',justifyContent:'center'},
 versionTitle:{color:C.text,fontSize:13,fontWeight:'800'},versionSub:{color:C.muted,fontSize:10.5,marginTop:3}
});