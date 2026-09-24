import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Artwork, Brand, Chip } from '@/ui';
import { useCollections } from '@/collections';
import { useMusicLibrary } from '@/library';
import { usePlayer } from '@/player';
import { C } from '@/theme';

const playlistColors = [
  ['#163960', '#5A7BB8'],
  ['#080819', '#5E22B8'],
  ['#231010', '#C3432A'],
] as const;

export default function Home(){
 const {play}=usePlayer();
 const {tracks,status,scan}=useMusicLibrary();
 const {history,playlists}=useCollections();

 useEffect(()=>{
  if(status==='idle') void scan();
 },[scan,status]);

 const recent=history.slice(0,3).map((entry)=>entry.track);
 const localPreview=tracks.slice(0,3);
 const playlistPreview=playlists.slice(0,3);

 return <SafeAreaView edges={['top']} style={s.safe}>
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
   <View style={s.top}><Brand/><View style={s.topActions}><Pressable accessibilityLabel="Favoritos" onPress={()=>router.push('/favorites')} style={s.icon}><MaterialCommunityIcons name="heart-outline" size={22} color={C.soft}/></Pressable><Pressable accessibilityLabel="Configurações" onPress={()=>router.push('/settings')} style={s.icon}><MaterialCommunityIcons name="cog-outline" size={23} color={C.soft}/></Pressable></View></View>
   <Text style={s.hero}>Boa música,{"\n"}sempre com você.</Text>
   <Pressable onPress={()=>router.push('/online')} style={s.search}><MaterialCommunityIcons name="magnify" size={20} color={C.muted}/><Text style={s.searchText}>Buscar músicas online...</Text></Pressable>
   <View style={s.chips}><Chip label="Músicas locais" onPress={()=>router.push('/library')}/><Chip label="Músicas online" onPress={()=>router.push('/online')}/></View>
   <View style={s.section}><Text style={s.sectionTitle}>Continue ouvindo</Text><Pressable accessibilityRole="button" accessibilityLabel="Ver todo o histórico" onPress={()=>router.push('/history')} style={s.actionButton}><Text style={s.action}>Ver tudo ›</Text></Pressable></View>

   {recent.length>0?(
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hrow}>
     {recent.map(t=><Pressable key={t.id} style={({pressed})=>[s.card,pressed&&{opacity:.72}]} onPress={()=>void play(t,history.map((entry)=>entry.track))}><Artwork track={t} size={112}/><Text numberOfLines={1} style={s.cardTitle}>{t.title}</Text><Text numberOfLines={1} style={s.cardSub}>{t.artist}</Text></Pressable>)}
    </ScrollView>
   ):(
    <Pressable onPress={()=>router.push('/library')} style={s.emptyCard}>
     <View style={s.emptyIcon}><MaterialCommunityIcons name="music-note-plus" size={24} color={C.purple}/></View>
     <View style={{flex:1}}><Text style={s.emptyTitle}>Comece a ouvir</Text><Text style={s.emptyText}>As músicas reproduzidas aparecerão aqui.</Text></View>
     <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted}/>
    </Pressable>
   )}

   <View style={s.section}><Text style={s.sectionTitle}>Músicas locais</Text><Pressable accessibilityRole="button" accessibilityLabel="Ver todas as músicas locais" onPress={()=>router.push('/library')} style={s.actionButton}><Text style={s.action}>Ver tudo ›</Text></Pressable></View>
   {localPreview.length>0?(
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hrow}>
     {localPreview.map(t=><Pressable key={t.id} style={({pressed})=>[s.card,pressed&&{opacity:.72}]} onPress={()=>void play(t,tracks)}><Artwork track={t} size={112}/><Text numberOfLines={1} style={s.cardTitle}>{t.title}</Text><Text numberOfLines={1} style={s.cardSub}>{t.artist}</Text></Pressable>)}
    </ScrollView>
   ):(
    <Pressable onPress={()=>router.push('/library')} style={s.emptyCard}>
     <View style={s.emptyIcon}><MaterialCommunityIcons name="music-box-multiple-outline" size={24} color={C.purple}/></View>
     <View style={{flex:1}}><Text style={s.emptyTitle}>{status==='scanning'?'Procurando músicas locais...':'Nenhuma música local encontrada'}</Text><Text style={s.emptyText}>Toque para abrir as músicas deste aparelho.</Text></View>
     <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted}/>
    </Pressable>
   )}

   <View style={s.section}><Text style={s.sectionTitle}>Suas playlists</Text><Pressable accessibilityRole="button" accessibilityLabel="Ver todas as playlists" onPress={()=>router.push('/playlists')} style={s.actionButton}><Text style={s.action}>Ver tudo ›</Text></Pressable></View>
   {playlistPreview.length>0?(
    <View style={s.mixRow}>{playlistPreview.map((playlist,index)=><Pressable key={playlist.id} style={s.mixPressable} onPress={()=>router.push({pathname:'/playlist/[id]',params:{id:playlist.id}})}><LinearGradient colors={playlistColors[index]!} style={s.mix}><MaterialCommunityIcons name="playlist-music" size={30} color="rgba(255,255,255,.75)"/><View><Text numberOfLines={2} style={s.mixTitle}>{playlist.name}</Text><Text style={s.mixSub}>{playlist.trackIds.length} músicas</Text></View></LinearGradient></Pressable>)}</View>
   ):(
    <Pressable onPress={()=>router.push('/playlists')} style={s.emptyCard}>
     <View style={s.emptyIcon}><MaterialCommunityIcons name="playlist-plus" size={24} color={C.purple}/></View>
     <View style={{flex:1}}><Text style={s.emptyTitle}>Crie sua primeira playlist</Text><Text style={s.emptyText}>Organize músicas locais e do YouTube.</Text></View>
     <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted}/>
    </Pressable>
   )}
   <View style={{height:128}}/>
  </ScrollView>
 </SafeAreaView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},content:{paddingHorizontal:18,paddingTop:8,gap:18},
 top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 topActions:{flexDirection:'row',alignItems:'center',gap:8},
 icon:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:'#101117',borderWidth:1,borderColor:'#1A1C24'},
 hero:{color:C.text,fontSize:30,lineHeight:34,fontWeight:'900',letterSpacing:-.8},
 search:{height:48,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,borderRadius:14,backgroundColor:'#171922',borderWidth:1,borderColor:'#20222D'},
 searchText:{color:C.muted,fontSize:13},chips:{flexDirection:'row',gap:8},
 section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitle:{color:C.text,fontSize:18,fontWeight:'900'},actionButton:{paddingLeft:10,paddingVertical:6},action:{color:C.muted,fontSize:12,fontWeight:'700'},
 hrow:{gap:12,paddingRight:12},card:{width:112},cardTitle:{color:C.text,fontWeight:'800',fontSize:12.5,marginTop:8},cardSub:{color:C.muted,fontSize:11,marginTop:2},
 emptyCard:{minHeight:76,borderRadius:15,backgroundColor:'#11121A',borderWidth:1,borderColor:'#222431',padding:12,flexDirection:'row',alignItems:'center',gap:11},
 emptyIcon:{width:44,height:44,borderRadius:12,backgroundColor:'#1A1026',alignItems:'center',justifyContent:'center'},
 emptyTitle:{color:C.text,fontSize:13,fontWeight:'800'},emptyText:{color:C.muted,fontSize:11.5,lineHeight:16,marginTop:3},
 mixRow:{flexDirection:'row',gap:10},mixPressable:{flex:1},mix:{aspectRatio:.92,borderRadius:14,padding:12,justifyContent:'space-between',borderWidth:1,borderColor:'rgba(255,255,255,.05)'},
 mixTitle:{color:'#FFF',fontWeight:'900',fontSize:14,lineHeight:14},mixSub:{color:'rgba(255,255,255,.7)',fontSize:9.5,marginTop:4}
});
