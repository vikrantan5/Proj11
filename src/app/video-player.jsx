import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Video, MessageSquare, ChevronUp } from 'lucide-react-native';
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
import YouTubeComments from '@/components/YouTubeComments';

const { width } = Dimensions.get('window');

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

  const onStateChange = useCallback((state) => {
    if (state === 'ended') {
      setPlaying(false);
    }
  }, []);

  const toggleComments = useCallback(() => {
    setShowComments((prev) => !prev);
  }, []);

  if (!fontsLoaded || loading) {
    return <LoadingScreen />;
  }

  if (!video) {
    return null;
  }

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
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
            data-testid="video-player-back-btn"
          >
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
          {/* YouTube Player - Always rendered once, never re-mounted */}
          <View style={{ marginBottom: 20 }} data-testid="video-player-container">
            <YoutubePlayer
              height={width * 0.5625}
              play={playing}
              videoId={video.videoId}
              onChangeState={onStateChange}
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

          {/* Comments Toggle Button */}
          <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={toggleComments}
              activeOpacity={0.8}
              data-testid="toggle-comments-btn"
            >
              <LinearGradient
                colors={
                  showComments
                    ? ['rgba(156, 39, 255, 0.2)', 'rgba(0, 229, 255, 0.1)']
                    : ['rgba(0, 229, 255, 0.2)', 'rgba(156, 39, 255, 0.1)']
                }
                style={{
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: showComments
                    ? theme.colors.neonPurple
                    : theme.colors.neonCyan,
                }}
              >
                {showComments ? (
                  <ChevronUp
                    size={18}
                    color={theme.colors.neonPurple}
                    strokeWidth={2}
                  />
                ) : (
                  <MessageSquare
                    size={18}
                    color={theme.colors.neonCyan}
                    strokeWidth={2}
                  />
                )}
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: showComments
                      ? theme.colors.neonPurple
                      : theme.colors.neonCyan,
                    letterSpacing: 0.5,
                    marginLeft: 8,
                  }}
                >
                  {showComments ? 'Hide Comments' : 'Show YouTube Comments'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Comments Section - Fetched via YouTube API, does NOT reload video */}
          {showComments && (
            <View style={{ paddingHorizontal: 24 }}>
              <View
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.06)',
                  backgroundColor: theme.isDark
                    ? 'rgba(30, 35, 60, 0.5)'
                    : theme.colors.cardBackground,
                  padding: 16,
                }}
              >
                <YouTubeComments videoId={video.videoId} />
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
