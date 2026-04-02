import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Play, Video, Shield } from 'lucide-react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useTheme } from '@/utils/useTheme';
import LoadingScreen from '@/components/LoadingScreen';
import { router } from 'expo-router';
import { getPublishedVideos, VIDEO_CATEGORIES } from '@/services/videoService';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function VideosScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredVideos, setFilteredVideos] = useState([]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    filterVideos();
  }, [selectedCategory, videos]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const videosData = await getPublishedVideos();
      setVideos(videosData);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  const filterVideos = () => {
    if (selectedCategory === 'All') {
      setFilteredVideos(videos);
    } else {
      setFilteredVideos(videos.filter((v) => v.category === selectedCategory));
    }
  };

  if (!fontsLoaded || loading) {
    return <LoadingScreen />;
  }

  const categories = ['All', ...VIDEO_CATEGORIES];

  return (
    <LinearGradient colors={theme.colors.backgroundGradient} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: 24,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.neonCyan}
            />
          }
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Video size={24} color={theme.colors.neonCyan} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 28,
                  color: theme.colors.text,
                  marginLeft: 12,
                  letterSpacing: 1,
                }}
              >
                Educational Videos
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.colors.textSecondary,
              }}
            >
              Learn and empower yourself with knowledge
            </Text>
          </View>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}
          >
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        selectedCategory === category ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      borderWidth: 1,
                      borderColor: selectedCategory === category ? theme.colors.neonCyan : theme.colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 13,
                        color: selectedCategory === category ? theme.colors.neonCyan : theme.colors.text,
                      }}
                    >
                      {category}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Videos Grid */}
          {filteredVideos.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
              <Video size={64} color={theme.colors.textSecondary} strokeWidth={1.5} />
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 16,
                  color: theme.colors.textSecondary,
                  marginTop: 20,
                  textAlign: 'center',
                }}
              >
                No videos available in this category yet.
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 24 }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 16,
                  justifyContent: 'space-between',
                }}
              >
                {filteredVideos.map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    onPress={() => router.push({ pathname: '/video-player', params: { videoId: video.id } })}
                    activeOpacity={0.8}
                    style={{ width: CARD_WIDTH }}
                  >
                    <LinearGradient
                      colors={['rgba(30, 35, 60, 0.6)', 'rgba(20, 25, 50, 0.4)']}
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: theme.colors.borderLight,
                      }}
                    >
                      {/* Thumbnail */}
                      <View style={{ position: 'relative' }}>
                        <Image
                          source={{ uri: video.thumbnailUrl }}
                          style={{ width: '100%', height: 120, backgroundColor: theme.colors.cardBackground }}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Play size={20} color="#000" strokeWidth={2} fill="#000" />
                          </View>
                        </View>
                        {/* Category Badge */}
                        <View
                          style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            backgroundColor: 'rgba(0, 229, 255, 0.9)',
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'Inter_600SemiBold',
                              fontSize: 10,
                              color: '#000',
                            }}
                          >
                            {video.category}
                          </Text>
                        </View>
                      </View>

                      {/* Video Info */}
                      <View style={{ padding: 12 }}>
                        <Text
                          style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 14,
                            color: theme.colors.text,
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {video.title}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
