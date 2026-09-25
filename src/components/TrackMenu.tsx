import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCollections } from '../collections';
import type { Track } from '../music';
import { usePlayer } from '../player';
import { C } from '../theme';

type Props = {
  track: Track;
  visible: boolean;
  onClose: () => void;
  onPlay?: () => void;
  showQueue?: boolean;
};

export function TrackMenu({ track, visible, onClose, onPlay, showQueue = false }: Props) {
  const { favorites, toggleFavorite } = usePlayer();
  const { playlists, addToPlaylist } = useCollections();
  const [page, setPage] = useState<'actions' | 'playlists'>('actions');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPage('actions');
    setError(null);
    onClose();
  };

  const favorite = favorites.has(track.id);

  const saveToPlaylist = async (playlistId: string) => {
    try {
      await addToPlaylist(playlistId, track);
      close();
    } catch {
      setError('Não foi possível salvar a música na playlist.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar menu" />
        <View style={s.sheet}>
          <View style={s.header}>
            {page === 'playlists' ? (
              <Pressable accessibilityLabel="Voltar às ações" onPress={() => setPage('actions')} style={s.headerButton}>
                <MaterialCommunityIcons name="arrow-left" size={23} color={C.text} />
              </Pressable>
            ) : null}
            <Text numberOfLines={1} style={s.title}>
              {page === 'playlists' ? 'Adicionar à playlist' : track.title}
            </Text>
            <Pressable accessibilityLabel="Fechar menu" onPress={close} style={s.headerButton}>
              <MaterialCommunityIcons name="close" size={23} color={C.soft} />
            </Pressable>
          </View>

          {page === 'actions' ? (
            <>
              {onPlay ? (
                <Pressable accessibilityRole="button" onPress={() => { close(); onPlay(); }} style={s.option}>
                  <MaterialCommunityIcons name="play" size={23} color={C.purple} />
                  <Text style={s.optionText}>Tocar agora</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={() => { close(); void toggleFavorite(track.id); }} style={s.option}>
                <MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={23} color={C.purple} />
                <Text style={s.optionText}>{favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setPage('playlists')} style={s.option}>
                <MaterialCommunityIcons name="playlist-plus" size={23} color={C.purple} />
                <Text style={s.optionText}>Adicionar à playlist</Text>
              </Pressable>
              {showQueue ? (
                <Pressable accessibilityRole="button" onPress={() => { close(); router.push('/queue'); }} style={s.option}>
                  <MaterialCommunityIcons name="playlist-music" size={23} color={C.purple} />
                  <Text style={s.optionText}>Abrir fila</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <ScrollView style={s.list}>
              {playlists.length === 0 ? (
                <Text style={s.empty}>Crie uma playlist na aba Playlists e volte para adicionar esta música.</Text>
              ) : playlists.map((playlist) => {
                const added = playlist.trackIds.includes(track.id);
                return (
                  <Pressable
                    key={playlist.id}
                    accessibilityRole="button"
                    accessibilityLabel={added ? `${playlist.name}, música já adicionada` : `Adicionar à playlist ${playlist.name}`}
                    disabled={added}
                    onPress={() => void saveToPlaylist(playlist.id)}
                    style={s.option}
                  >
                    <MaterialCommunityIcons name={added ? 'check-circle' : 'playlist-music'} size={23} color={C.purple} />
                    <Text numberOfLines={1} style={[s.optionText, { flex: 1 }]}>{playlist.name}</Text>
                    <Text style={s.count}>{added ? 'Adicionada' : `${playlist.trackIds.length} músicas`}</Text>
                  </Pressable>
                );
              })}
              {error ? <Text style={s.error}>{error}</Text> : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.7)' },
  sheet: { paddingHorizontal: 18, paddingTop: 13, paddingBottom: 28, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#151620', borderTopWidth: 1, borderColor: C.border },
  header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: C.text, fontSize: 17, fontWeight: '900' },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 10, borderRadius: 12 },
  optionText: { color: C.text, fontSize: 14, fontWeight: '700' },
  count: { color: C.muted, fontSize: 11 },
  list: { maxHeight: 320 },
  empty: { color: C.soft, fontSize: 13, lineHeight: 19, padding: 12 },
  error: { color: C.danger, fontSize: 12, padding: 12 },
});
