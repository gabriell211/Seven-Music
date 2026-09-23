import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Artwork } from '@/ui';
import { usePlayer } from '@/player';
import { C } from '@/theme';

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return String(minutes) + ':' + rest.toString().padStart(2, '0');
}

function youtubePlayerHtml(videoId: string): string {
  const safeVideoId = videoId.replace(/[^A-Za-z0-9_-]/g, '');

  return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">'
    + '<style>html,body,#player{margin:0;padding:0;width:100%;height:100%;background:#07080C;overflow:hidden}iframe{width:100%!important;height:100%!important}</style>'
    + '</head><body><div id="player"></div><script>'
    + 'var player;var timer;'
    + 'function send(p){try{window.ReactNativeWebView.postMessage(JSON.stringify(p));}catch(e){}}'
    + 'function onYouTubeIframeAPIReady(){player=new YT.Player("player",{videoId:"' + safeVideoId + '",playerVars:{autoplay:1,controls:0,playsinline:1,rel:0,modestbranding:1},events:{'
    + 'onReady:function(e){e.target.playVideo();send({type:"ready"});timer=setInterval(function(){if(!player||!player.getCurrentTime)return;send({type:"progress",currentTime:player.getCurrentTime()||0,duration:player.getDuration()||0});},500);},'
    + 'onStateChange:function(e){send({type:"state",state:e.data});},'
    + 'onError:function(e){send({type:"error",code:e.data});}'
    + '}});}'
    + 'var tag=document.createElement("script");tag.src="https://www.youtube.com/iframe_api";document.head.appendChild(tag);'
    + '</script></body></html>';
}

export default function Player() {
  const { width } = useWindowDimensions();
  const art = Math.min(width - 44, 360);
  const webRef = useRef<WebView>(null);
  const [progressWidth, setProgressWidth] = useState(1);
  const [embedPlaying, setEmbedPlaying] = useState(false);
  const [embedCurrentTime, setEmbedCurrentTime] = useState(0);
  const [embedDuration, setEmbedDuration] = useState(0);

  const {
    track,
    playing,
    currentTime,
    duration,
    buffering,
    resolvingTrackId,
    error,
    youtubeEmbed,
    favorites,
    shuffle,
    repeatMode,
    toggle,
    next,
    previous,
    seek,
    toggleFavorite,
    toggleShuffle,
    cycleRepeatMode,
    clearError,
  } = usePlayer();

  const embedded = Boolean(youtubeEmbed && track.source === 'youtube' && track.youtubeId);
  const effectivePlaying = embedded ? embedPlaying : playing;
  const effectiveCurrentTime = embedded ? embedCurrentTime : currentTime;
  const effectiveDuration = embedded ? (embedDuration || track.durationSeconds || 0) : duration;

  useEffect(() => {
    setEmbedPlaying(false);
    setEmbedCurrentTime(0);
    setEmbedDuration(track.durationSeconds ?? 0);
  }, [track.id, track.durationSeconds]);

  const progress = useMemo(
    () => effectiveDuration > 0
      ? Math.min(1, Math.max(0, effectiveCurrentTime / effectiveDuration))
      : 0,
    [effectiveCurrentTime, effectiveDuration],
  );

  const onProgressLayout = (event: LayoutChangeEvent) => {
    setProgressWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const seekEmbedded = (seconds: number) => {
    const target = Math.max(0, seconds);
    webRef.current?.injectJavaScript(
      'if(window.player&&player.seekTo){player.seekTo(' + String(target) + ',true);}true;',
    );
    setEmbedCurrentTime(target);
  };

  const onSeek = (event: GestureResponderEvent) => {
    if (effectiveDuration <= 0) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / progressWidth));
    const target = effectiveDuration * ratio;

    if (embedded) seekEmbedded(target);
    else void seek(target);
  };

  const togglePlayback = () => {
    if (!embedded) {
      void toggle();
      return;
    }

    webRef.current?.injectJavaScript(
      embedPlaying
        ? 'if(window.player&&player.pauseVideo){player.pauseVideo();}true;'
        : 'if(window.player&&player.playVideo){player.playVideo();}true;',
    );
  };

  const onYouTubeMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        state?: number;
        currentTime?: number;
        duration?: number;
      };

      if (message.type === 'state') {
        const state = message.state ?? -1;
        setEmbedPlaying(state === 1);
        if (state === 0) {
          setEmbedPlaying(false);

          if (repeatMode === 'one') {
            seekEmbedded(0);
            webRef.current?.injectJavaScript(
              'if(window.player&&player.playVideo){player.playVideo();}true;',
            );
          } else {
            void next();
          }
        }
        return;
      }

      if (message.type === 'progress') {
        setEmbedCurrentTime(Number(message.currentTime) || 0);
        setEmbedDuration(Number(message.duration) || track.durationSeconds || 0);
      }
    } catch {
      // Ignore malformed bridge messages.
    }
  };

  const favorite = favorites.has(track.id);
  const busy = !embedded && (buffering || resolvingTrackId === track.id);

  return (
    <LinearGradient colors={['#0B0A10', '#08080D', '#05060A']} style={s.bg}>
      <SafeAreaView style={s.safe}>
        <View style={s.top}>
          <Pressable accessibilityLabel="Fechar player" onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-down" size={30} color={C.text}/>
          </Pressable>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={C.text}/>
        </View>

        <View style={s.art}>
          {embedded && track.youtubeId ? (
            <View style={[s.youtubeFrame, { width: art, height: Math.max(220, art * 0.64) }]}>
              <WebView
                key={track.youtubeId}
                ref={webRef}
                source={{ html: youtubePlayerHtml(track.youtubeId) }}
                style={s.webview}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                onMessage={onYouTubeMessage}
                scrollEnabled={false}
                bounces={false}
              />
              <View pointerEvents="none" style={s.youtubeBadge}>
                <MaterialCommunityIcons name="youtube" size={15} color="#FFF"/>
                <Text style={s.youtubeBadgeText}>YouTube</Text>
              </View>
            </View>
          ) : (
            <Artwork track={track} size={art}/>
          )}

          {busy ? (
            <View style={s.buffer}>
              <Text style={s.bufferText}>Carregando...</Text>
            </View>
          ) : null}
        </View>

        <View style={s.meta}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.title}>{track.title}</Text>
            <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>
          </View>
          <Pressable
            accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            hitSlop={12}
            onPress={() => void toggleFavorite()}
          >
            <MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={27} color={favorite ? C.purple : C.soft}/>
          </Pressable>
        </View>

        {error ? (
          <Pressable onPress={clearError} style={s.error}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger}/>
            <Text numberOfLines={2} style={s.errorText}>{error}</Text>
            <MaterialCommunityIcons name="close" size={17} color={C.muted}/>
          </Pressable>
        ) : null}

        <Pressable onPress={onSeek} onLayout={onProgressLayout} style={s.progress}>
          <View style={[s.fill, { width: progressWidth * progress }]}/>
          <View style={[s.knob, { left: Math.max(0, progressWidth * progress - 6) }]}/>
        </Pressable>

        <View style={s.times}>
          <Text style={s.time}>{formatTime(effectiveCurrentTime)}</Text>
          <Text style={s.time}>{effectiveDuration > 0 ? formatTime(effectiveDuration) : track.duration}</Text>
        </View>

        <View style={s.controls}>
          <Pressable accessibilityLabel={shuffle ? 'Desativar aleatório' : 'Ativar aleatório'} onPress={() => void toggleShuffle()}>
            <MaterialCommunityIcons name="shuffle-variant" size={25} color={shuffle ? C.purple : C.soft}/>
          </Pressable>
          <Pressable accessibilityLabel="Música anterior" onPress={() => void previous()}>
            <MaterialCommunityIcons name="skip-previous" size={39} color={C.text}/>
          </Pressable>
          <Pressable accessibilityLabel={effectivePlaying ? 'Pausar' : 'Reproduzir'} disabled={busy} onPress={togglePlayback} style={[s.play, busy && { opacity: .72 }]}>
            <MaterialCommunityIcons name={effectivePlaying ? 'pause' : 'play'} size={41} color="#17091F"/>
          </Pressable>
          <Pressable accessibilityLabel="Próxima música" onPress={() => void next()}>
            <MaterialCommunityIcons name="skip-next" size={39} color={C.text}/>
          </Pressable>
          <Pressable accessibilityLabel="Alternar repetição" onPress={() => void cycleRepeatMode()}>
            <MaterialCommunityIcons name={repeatMode === 'one' ? 'repeat-once' : 'repeat'} size={25} color={repeatMode === 'off' ? C.soft : C.purple}/>
          </Pressable>
        </View>

        <View style={s.actions}>
          <Pressable style={s.action} onPress={() => router.push('/queue')}>
            <MaterialCommunityIcons name="playlist-music" size={22} color={C.soft}/>
            <Text style={s.actionText}>Fila</Text>
          </Pressable>
          <View style={s.action}>
            <MaterialCommunityIcons name="text" size={21} color={C.soft}/>
            <Text style={s.actionText}>Letras</Text>
          </View>
          <View style={s.action}>
            <MaterialCommunityIcons name={embedded ? 'youtube' : 'cast'} size={22} color={embedded ? C.purple : C.soft}/>
            <Text style={s.actionText}>{embedded ? 'YouTube' : 'Dispositivos'}</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s=StyleSheet.create({
  bg:{flex:1},
  safe:{flex:1,paddingHorizontal:22},
  top:{height:50,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  art:{alignItems:'center',justifyContent:'center',marginTop:12,marginBottom:26},
  youtubeFrame:{borderRadius:18,overflow:'hidden',backgroundColor:'#050507',borderWidth:1,borderColor:'#2A2034'},
  webview:{flex:1,backgroundColor:'#050507'},
  youtubeBadge:{position:'absolute',top:10,right:10,height:28,paddingHorizontal:9,borderRadius:999,backgroundColor:'rgba(7,8,12,.82)',flexDirection:'row',alignItems:'center',gap:5},
  youtubeBadgeText:{color:'#FFF',fontSize:10,fontWeight:'800'},
  buffer:{position:'absolute',bottom:12,backgroundColor:'rgba(7,8,12,.82)',paddingHorizontal:12,paddingVertical:6,borderRadius:999},
  bufferText:{color:C.soft,fontSize:10.5,fontWeight:'700'},
  meta:{flexDirection:'row',alignItems:'center',gap:10},
  title:{color:C.text,fontWeight:'900',fontSize:25,letterSpacing:-.4},
  artist:{color:C.soft,fontSize:15,marginTop:5},
  error:{marginTop:14,minHeight:46,borderRadius:12,backgroundColor:'#1B1017',borderWidth:1,borderColor:'#3B1D2A',paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:9},
  errorText:{flex:1,color:'#E8B4C2',fontSize:11.5,lineHeight:15},
  progress:{height:20,justifyContent:'center',marginTop:18},
  fill:{position:'absolute',left:0,height:4,borderRadius:999,backgroundColor:C.purple},
  knob:{position:'absolute',width:12,height:12,borderRadius:6,backgroundColor:C.purple},
  times:{flexDirection:'row',justifyContent:'space-between'},
  time:{color:C.soft,fontSize:11},
  controls:{marginTop:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  play:{width:66,height:66,borderRadius:33,backgroundColor:C.purple,alignItems:'center',justifyContent:'center'},
  actions:{marginTop:34,paddingTop:18,borderTopWidth:1,borderTopColor:'#1A1C24',flexDirection:'row',justifyContent:'space-around'},
  action:{alignItems:'center',gap:6},
  actionText:{color:C.soft,fontSize:11.5,fontWeight:'600'}
});