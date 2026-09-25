import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/theme';
import {
  applyEqualizerSettings,
  EQ_PRESETS,
  formatFrequency,
  getEqualizerInfo,
  loadEqualizerSettings,
  presetLevels,
  saveEqualizerSettings,
  type EqualizerInfo,
  type EqualizerSettings,
} from '@/equalizer';
import { configurePlayback } from '@/services/audio';

export default function EqualizerScreen() {
  const [info, setInfo] = useState<EqualizerInfo | null>(null);
  const [settings, setSettings] = useState<EqualizerSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await configurePlayback();
        const [capabilities, saved] = await Promise.all([getEqualizerInfo(), loadEqualizerSettings()]);
        if (!active) return;
        const levels = capabilities.frequencies.map((_, index) =>
          Math.max(capabilities.minDb, Math.min(capabilities.maxDb, saved.levels[index] ?? 0)),
        );
        setInfo(capabilities);
        setSettings({ ...saved, levels });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Equalizador indisponível neste aparelho.');
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settings) return;
    const timer = setTimeout(() => {
      void Promise.all([
        saveEqualizerSettings(settings),
        applyEqualizerSettings(settings),
      ]).then(() => setError(null)).catch(() => setError('Não foi possível aplicar o equalizador neste aparelho.'));
    }, 80);
    return () => clearTimeout(timer);
  }, [settings]);

  const choosePreset = (id: string) => {
    if (!info) return;
    setSettings((current) => current && ({
      ...current,
      preset: id,
      levels: presetLevels(id, info.frequencies).map((value) => Math.max(info.minDb, Math.min(info.maxDb, value))),
    }));
  };

  const setBand = (index: number, value: number) => {
    setSettings((current) => {
      if (!current) return current;
      const levels = [...current.levels];
      levels[index] = value;
      return { ...current, preset: 'custom', levels };
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={s.back}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={C.text}/>
        </Pressable>
        <Text style={s.headerTitle}>Equalizador</Text>
        <View style={s.back}/>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <MaterialCommunityIcons name="tune-vertical" size={28} color={C.purple}/>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Seu som, do seu jeito</Text>
            <Text style={s.muted}>Ajustes em tempo real para o áudio do Seven Music.</Text>
          </View>
        </View>

        {info && settings ? (
          <>
            <View style={s.enableRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>Ativar equalizador</Text>
                <Text style={s.muted}>{info.frequencies.length} bandas disponíveis no aparelho</Text>
              </View>
              <Switch
                accessibilityLabel="Ativar equalizador"
                value={settings.enabled}
                onValueChange={(enabled) => setSettings((current) => current && ({ ...current, enabled }))}
                trackColor={{ false: '#343541', true: C.purple }}
                thumbColor={C.text}
              />
            </View>

            <Text style={s.sectionTitle}>Predefinições</Text>
            <View style={s.presets}>
              {EQ_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: settings.preset === preset.id }}
                  onPress={() => choosePreset(preset.id)}
                  style={[s.preset, settings.preset === preset.id && s.presetActive]}
                >
                  <Text style={[s.presetText, settings.preset === preset.id && s.presetTextActive]}>{preset.label}</Text>
                </Pressable>
              ))}
              {settings.preset === 'custom' ? <View style={[s.preset, s.presetActive]}><Text style={s.presetTextActive}>Personalizado</Text></View> : null}
            </View>

            <View style={s.bandHeader}>
              <Text style={s.sectionTitle}>Bandas</Text>
              <Pressable accessibilityRole="button" onPress={() => choosePreset('flat')}>
                <Text style={s.reset}>Zerar ajustes</Text>
              </Pressable>
            </View>
            <View style={[s.bandPanel, !settings.enabled && { opacity: .48 }]}>
              {info.frequencies.map((frequency, index) => {
                const level = settings.levels[index] ?? 0;
                return (
                  <View key={index} style={s.bandRow}>
                    <Text style={s.frequency}>{formatFrequency(frequency)}</Text>
                    <Slider
                      style={s.slider}
                      accessibilityLabel={`${formatFrequency(frequency)}, ${level.toFixed(1)} decibéis`}
                      minimumValue={info.minDb}
                      maximumValue={info.maxDb}
                      step={0.5}
                      value={level}
                      disabled={!settings.enabled}
                      minimumTrackTintColor={C.purple}
                      maximumTrackTintColor="#3B3C46"
                      thumbTintColor={C.purple}
                      onValueChange={(value) => setBand(index, value)}
                    />
                    <Text style={s.level}>{level > 0 ? '+' : ''}{level.toFixed(1)}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.note}>Os limites e frequências vêm do mecanismo de áudio do aparelho. Os ajustes são salvos automaticamente.</Text>
          </>
        ) : (
          <Text style={s.status}>{error ?? 'Carregando recursos de áudio...'}</Text>
        )}
        {info && error ? <Text style={s.status}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  back: { width: 36 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '900' },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, padding: 18, borderRadius: 16, marginTop: 15, marginBottom: 24 },
  heroTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 18 },
  enableRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 26 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 8, marginBottom: 26 },
  preset: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, backgroundColor: '#1B1D27', borderWidth: 1, borderColor: C.border },
  presetActive: { backgroundColor: C.purple, borderColor: C.purple },
  presetText: { color: C.soft, fontWeight: '700', fontSize: 12 },
  presetTextActive: { color: '#17091F', fontWeight: '800', fontSize: 12 },
  bandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  reset: { color: C.purple, fontSize: 12, fontWeight: '700' },
  bandPanel: { backgroundColor: C.panel, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  bandRow: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 6 },
  frequency: { width: 57, color: C.soft, fontSize: 11, fontWeight: '700' },
  slider: { flex: 1, height: 42 },
  level: { width: 40, color: C.text, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  note: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 16 },
  status: { color: C.soft, fontSize: 13, lineHeight: 20, marginTop: 16 },
});
