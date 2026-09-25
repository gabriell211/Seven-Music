import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMusicLibrary } from '@/library';
import { clearTrackSnapshots } from '@/storage';
import { Brand } from '@/ui';
import { C } from '@/theme';
import { SevenMark } from '@/components/SevenMark';
import appConfig from '../app.json';

const APP_VERSION = appConfig.expo.version;

type SettingRowProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
};

function SettingRow({ icon, label, value, onPress }: SettingRowProps) {
  const content = (
    <>
      <MaterialCommunityIcons name={icon} size={22} color={C.soft}/>
      <Text style={s.label}>{label}</Text>
      {value ? <Text style={s.value}>{value}</Text> : null}
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted}/> : null}
    </>
  );

  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>{content}</Pressable>
    : <View style={s.row}>{content}</View>;
}

export default function Settings() {
  const { scan } = useMusicLibrary();
  const [busy, setBusy] = useState(false);

  const importMusic = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await scan();
      Alert.alert('Biblioteca atualizada', 'As músicas disponíveis no aparelho foram lidas novamente.');
    } catch {
      Alert.alert('Não foi possível atualizar', 'Tente novamente em alguns instantes.');
    } finally {
      setBusy(false);
    }
  };

  const clearCache = () => {
    Alert.alert(
      'Limpar cache?',
      'Isso remove apenas cópias locais dos metadados. Playlists, histórico e preferências serão mantidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => void clearTrackSnapshots()
            .then(() => Alert.alert('Cache limpo'))
            .catch(() => Alert.alert('Não foi possível limpar o cache', 'Tente novamente em alguns instantes.')),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Pressable accessibilityLabel="Voltar" onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={30} color={C.text}/>
          </Pressable>
          <Brand compact/>
          <View style={{ width: 30 }}/>
        </View>

        <View style={s.profile}>
          <View style={s.avatar}><SevenMark size={45}/></View>
          <View><Text style={s.name}>Seven Music</Text><Text style={s.tagline}>Sua música. Sem limites.</Text></View>
        </View>

        <View style={s.panel}>
          <SettingRow icon="heart-outline" label="Favoritos" onPress={() => router.push('/favorites')}/>
          <View style={s.divider}/>
          <SettingRow icon="weather-night" label="Aparência" value="Escuro"/>
          <View style={s.divider}/>
          <SettingRow icon="tune-vertical" label="Equalizador" onPress={() => router.push('/equalizer')}/>
          <View style={s.divider}/>
          <SettingRow icon="archive-outline" label="Cache e armazenamento" onPress={clearCache}/>
          <View style={s.divider}/>
          <SettingRow icon="folder-music-outline" label={busy ? 'Lendo músicas...' : 'Importar músicas'} onPress={() => void importMusic()}/>
          <View style={s.divider}/>
          <SettingRow icon="information-outline" label="Mais sobre o app" onPress={() => Alert.alert('Seven Music', `Versão ${APP_VERSION}\n\nPlayer local e busca online em áudio.`)}/>
        </View>

        <View style={s.version}>
          <View style={s.smallLogo}><SevenMark size={29}/></View>
          <View style={{ flex: 1 }}><Text style={s.versionTitle}>Seven Music v{APP_VERSION}</Text><Text style={s.versionSub}>Feito por quem vive música.</Text></View>
          <MaterialCommunityIcons name="heart" size={22} color={C.danger}/>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 18, paddingBottom: 30 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14, marginBottom: 22 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#15101E', borderWidth: 1, borderColor: '#392154', alignItems: 'center', justifyContent: 'center' },
  name: { color: C.text, fontSize: 18, fontWeight: '900' },
  tagline: { color: C.muted, fontSize: 11.5, marginTop: 4 },
  panel: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1A1C24' },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 13 },
  divider: { height: 1, backgroundColor: '#1A1C24' },
  label: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  value: { color: C.muted, fontSize: 11.5 },
  version: { marginTop: 22, padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.panel, borderWidth: 1, borderColor: '#1A1C24' },
  smallLogo: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1A0F2A', alignItems: 'center', justifyContent: 'center' },
  versionTitle: { color: C.text, fontSize: 13, fontWeight: '800' },
  versionSub: { color: C.muted, fontSize: 10.5, marginTop: 3 },
});
