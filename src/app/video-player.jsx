import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Video } from 'lucide-react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useTheme } from '@/utils/useTheme';
import LoadingScreen from '@/components/LoadingScreen';
import { router, useLocalSearchParams } from 'expo-router';
import { getVideoById } from '@/services/videoService';
import { toast } from 'sonner-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

export default function VideoPlayerScreen() {
  const theme = useTheme();
  const { videoId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId]);

  const loadVideo = async () => {
    try {
      setLoading(true);
      const videoData = await getVideoById(videoId);
      setVideo(videoData);
    } catch (error) {
      console.error('Error loading video:', error);
      toast.error('Failed to load video');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded || loading) {
    return <LoadingScreen />;
  }

  if (!video) {
    return null;
  }

  // Construct YouTube URL with comments visible
  const youtubeCommentsUrl = `https://m.youtube.com/watch?v=${video.videoId}`;

  return (
    <LinearGradient colors={theme.colors.backgroundGradient} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color={theme.colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Video size={20} color={theme.colors.neonCyan} strokeWidth={2} />
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 18,
                color: theme.colors.text,
                marginLeft: 10,
              }}
              numberOfLines={1}
            >
              {video.title}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* YouTube Player */}
          <View style={{ marginBottom: 20 }}>
            <YoutubePlayer
              height={width * 0.5625} // 16:9 aspect ratio
              play={playing}
              videoId={video.videoId}
              onChangeState={(state) => {
                if (state === 'ended') {
                  setPlaying(false);
                }
              }}
            />
          </View>

          {/* Video Details */}
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: 'rgba(0, 229, 255, 0.2)',
                alignSelf: 'flex-start',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 12,
                  color: theme.colors.neonCyan,
                }}
              >
                {video.category}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 20,
                color: theme.colors.text,
                marginBottom: 12,
                lineHeight: 28,
              }}
            >
              {video.title}
            </Text>

            {video.description ? (
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: theme.colors.textSecondary,
                  lineHeight: 22,
                }}
              >
                {video.description}
              </Text>
            ) : null}
          </View>

          {/* Comments Section Toggle */}
          <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setShowComments(!showComments)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(0, 229, 255, 0.2)', 'rgba(156, 39, 255, 0.1)']}
                style={{
                  borderRadius: 12,
                  padding: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.neonCyan,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: theme.colors.neonCyan,
                    letterSpacing: 0.5,
                  }}
                >
                  {showComments ? 'Hide Comments' : 'Show YouTube Comments'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* YouTube Comments WebView */}
          {showComments && (
            <View style={{ paddingHorizontal: 24 }}>
              <LinearGradient
                colors={['rgba(30, 35, 60, 0.6)', 'rgba(20, 25, 50, 0.4)']}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  height: height * 0.5,
                }}
              >
                <WebView
                  source={{ uri: youtubeCommentsUrl }}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(20, 25, 50, 0.8)',
                      }}
                    >
                      <ActivityIndicator size="large" color={theme.colors.neonCyan} />
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 14,
                          color: theme.colors.textSecondary,
                          marginTop: 12,
                        }}
                      >
                        Loading comments...
                      </Text>
                    </View>
                  )}
                />
              </LinearGradient>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
