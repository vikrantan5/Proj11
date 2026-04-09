import React from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Clock } from 'lucide-react-native';
import { useTheme } from '@/utils/useTheme';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function VideoCard({ video, cardWidth }) {
  const theme = useTheme();
  const CARD_WIDTH = cardWidth || (width - 60) / 2;

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({ pathname: '/video-player', params: { videoId: video.id } })
      }
      activeOpacity={0.85}
      style={{ width: CARD_WIDTH, marginBottom: 4 }}
      data-testid={`video-card-${video.id}`}
    >
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: theme.isDark
            ? 'rgba(30, 35, 60, 0.6)'
            : theme.colors.cardBackground,
          borderWidth: 1,
          borderColor: theme.isDark
            ? theme.colors.borderLight
            : 'rgba(0,0,0,0.06)',
          shadowColor: theme.colors.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.isDark ? 0.3 : 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* Thumbnail */}
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={{
              width: '100%',
              height: CARD_WIDTH * 0.56,
              backgroundColor: theme.colors.cardBackground,
            }}
            resizeMode="cover"
          />
          {/* Play Button Overlay */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Play size={16} color="#000" strokeWidth={2.5} fill="#000" />
            </View>
          </View>
          {/* Category Badge */}
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              backgroundColor: 'rgba(0, 229, 255, 0.9)',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 9,
                color: '#000',
                letterSpacing: 0.3,
              }}
            >
              {video.category}
            </Text>
          </View>
        </View>

        {/* Video Info */}
        <View style={{ padding: 10 }}>
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 13,
              color: theme.colors.text,
              lineHeight: 17,
              marginBottom: 6,
            }}
            numberOfLines={2}
          >
            {video.title}
          </Text>

          {/* Date */}
          {video.createdAt && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock
                size={11}
                color={theme.colors.textSecondary}
                strokeWidth={1.5}
              />
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 11,
                  color: theme.colors.textSecondary,
                  marginLeft: 4,
                }}
              >
                {formatDate(video.createdAt)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
