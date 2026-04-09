import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Video } from 'lucide-react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useTheme } from '@/utils/useTheme';
import LoadingScreen from '@/components/LoadingScreen';
import { getPublishedVideos, VIDEO_CATEGORIES } from '@/services/videoService';
import { toast } from 'sonner-native';
import VideoCard from '@/components/VideoCard';

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
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
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
                  data-testid={`category-filter-${category}`}
                >
                  <View
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 20,
                      backgroundColor:
                        selectedCategory === category
                          ? 'rgba(0, 229, 255, 0.3)'
                          : theme.isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.04)',
                      borderWidth: 1,
                      borderColor:
                        selectedCategory === category
                          ? theme.colors.neonCyan
                          : theme.colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 13,
                        color:
                          selectedCategory === category
                            ? theme.colors.neonCyan
                            : theme.colors.text,
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
                  gap: 12,
                  justifyContent: 'space-between',
                }}
              >
                {filteredVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    cardWidth={CARD_WIDTH}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
