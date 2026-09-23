import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { MiniPlayer } from '@/ui';
import { C } from '@/theme';

export default function TabsLayout() {
  return (
    <>
      <Tabs screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 10, backgroundColor: '#0B0C11', borderTopColor: '#1B1D25', borderTopWidth: 1 },
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: '#777B8A',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}>
        <Tabs.Screen name="index" options={{ title:'Início', tabBarIcon:({color,size})=><MaterialCommunityIcons name="home-variant" color={color} size={size}/> }} />
        <Tabs.Screen name="search" options={{ title:'Buscar', tabBarIcon:({color,size})=><MaterialCommunityIcons name="magnify" color={color} size={size}/> }} />
        <Tabs.Screen name="library" options={{ title:'Biblioteca', tabBarIcon:({color,size})=><MaterialCommunityIcons name="music-box-multiple-outline" color={color} size={size}/> }} />
        <Tabs.Screen name="playlists" options={{ title:'Playlists', tabBarIcon:({color,size})=><MaterialCommunityIcons name="playlist-music" color={color} size={size}/> }} />
      </Tabs>
      <MiniPlayer />
    </>
  );
}