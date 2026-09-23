import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollections } from '@/collections';
import { useMusicLibrary } from '@/library';
import type { Track } from '@/music';
import { usePlayer } from '@/player';
import { loadTrackSnapshots } from '@/storage';
import { Artwork } from '@/ui';
import { C } from '@/theme';

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { playlists, addToPlaylist, removeFromPlaylist, deletePlaylist } = useCollections();
  const { tracks: deviceTracks } = useMusicLibrary();
  const { track: currentTrack, hasSelection, play } = usePlayer();
  const [snapshots, setSnapshots] = useState<Record<string, Track>>({});

  const playlist = playlists.find((item) => item.id === id);

  useEffect(() => {
    void loadTrackSnapshots().then(setSnapshots);
  }, [playlists]);

  const tracks = useMemo(() => {
    if (!playlist) return [];
    const map = new Map(
      [...Object.values(snapshots), ...deviceTracks].map((item) => [item.id, item] as const),
    );
    return playlist.trackIds
      .map((trackId) => map.get(trackId))
      .filter((item): item is Track => item !== undefined);
  }, [deviceTracks, playlist, snapshots]);

  if (!playlist) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()}><MaterialCommunityIcons name="chevron-left" size={30} color={C.text}/></Pressable>
          <Text style={s.title}>Playlist</Text><View style={{ width: 30 }}/>
        </View>
        <View style={s.empty}><Text style={s.emptyTitle}>Playlist não encontrada.</Text></View>
      </SafeAreaView>
    );
  }

  const onDelete = () => {
    Alert.alert('Excluir playlist?', playlist.name, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => void deletePlaylist(playlist.id).then(() => router.back()),
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}><MaterialCommunityIcons name="chevron-left" size={30} color={C.text}/></Pressable>
        <Text numberOfLines={1} style={s.title}>{playlist.name}</Text>
        <Pressable onPress={onDelete}><MaterialCommunityIcons name="trash-can-outline" size={22} color={C.soft}/></Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.cover}><MaterialCommunityIcons name="playlist-music" size={44} color={C.purple}/></View>
          <Text style={s.count}>{tracks.length} {tracks.length === 1 ? 'música' : 'músicas'}</Text>
          <Pressable
            style={[s.addCurrent, !hasSelection && { opacity: .5 }]}
            disabled={!hasSelection}
            onPress={() => void addToPlaylist(playlist.id, currentTrack)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#180A20"/>
            <Text style={s.addText}>{hasSelection ? 'Adicionar música atual' : 'Escolha uma música para adicionar'}</Text>
          </Pressable>
        </View>

        {tracks.map((item) => (
          <Pressable key={item.id} style={s.row} onPress={() => void play(item, tracks)}>
            <Artwork track={item} size={50}/>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={s.name}>{item.title}</Text>
              <Text numberOfLines={1} style={s.artist}>{item.artist}</Text>
            </View>
            <Pressable
              accessibilityLabel={'Remover ' + item.title}
              hitSlop={10}
              onPress={(event) => {
                event.stopPropagation();
                void removeFromPlaylist(playlist.id, item.id);
              }}
            >
              <MaterialCommunityIcons name="minus-circle-outline" size={23} color={C.muted}/>
            </Pressable>
          </Pressable>
        ))}

        {tracks.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="music-note-plus" size={36} color={C.muted}/>
            <Text style={s.emptyTitle}>Essa playlist ainda está vazia.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  header:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  title:{flex:1,color:C.text,fontSize:18,fontWeight:'900',textAlign:'center'},
  content:{paddingHorizontal:18,paddingBottom:42},
  hero:{alignItems:'center',paddingVertical:18,gap:9},
  cover:{width:126,height:126,borderRadius:20,backgroundColor:'#181020',borderWidth:1,borderColor:'#362047',alignItems:'center',justifyContent:'center'},
  count:{color:C.muted,fontSize:12},
  addCurrent:{height:40,paddingHorizontal:16,borderRadius:999,backgroundColor:C.purple,flexDirection:'row',alignItems:'center',gap:7,marginTop:4},
  addText:{color:'#180A20',fontSize:12,fontWeight:'900'},
  row:{minHeight:66,flexDirection:'row',alignItems:'center',gap:11,paddingVertical:7},
  name:{color:C.text,fontSize:13.5,fontWeight:'800'},
  artist:{color:C.muted,fontSize:11.5,marginTop:3},
  empty:{minHeight:220,alignItems:'center',justifyContent:'center',gap:10},
  emptyTitle:{color:C.soft,fontSize:13.5,fontWeight:'700'}
});
