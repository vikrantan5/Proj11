import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ThumbsUp, MessageCircle, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/utils/useTheme';
import {
  fetchYouTubeComments,
  formatRelativeTime,
} from '@/services/youtubeCommentsService';

export default function YouTubeComments({ videoId }) {
  const theme = useTheme();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchYouTubeComments(videoId);
      setComments(result.comments);
      setNextPageToken(result.nextPageToken);
      setTotalResults(result.totalResults);
    } catch (err) {
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreComments = async () => {
    if (!nextPageToken || loadingMore) return;
    try {
      setLoadingMore(true);
      const result = await fetchYouTubeComments(videoId, nextPageToken);
      setComments((prev) => [...prev, ...result.comments]);
      setNextPageToken(result.nextPageToken);
    } catch (err) {
      console.error('Error loading more comments:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatLikeCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <View
        style={{
          paddingVertical: 40,
          alignItems: 'center',
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
    );
  }

  if (error) {
    return (
      <View
        style={{
          paddingVertical: 30,
          paddingHorizontal: 16,
          alignItems: 'center',
        }}
      >
        <MessageCircle size={32} color={theme.colors.textSecondary} strokeWidth={1.5} />
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 14,
            color: theme.colors.textSecondary,
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
        <TouchableOpacity
          onPress={loadComments}
          style={{
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: 'rgba(0, 229, 255, 0.15)',
            borderWidth: 1,
            borderColor: theme.colors.neonCyan,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 13,
              color: theme.colors.neonCyan,
            }}
          >
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View style={{ paddingVertical: 30, alignItems: 'center' }}>
        <MessageCircle size={32} color={theme.colors.textSecondary} strokeWidth={1.5} />
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 14,
            color: theme.colors.textSecondary,
            marginTop: 12,
          }}
        >
          No comments yet
        </Text>
      </View>
    );
  }

  return (
    <View data-testid="youtube-comments-section">
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <MessageCircle size={18} color={theme.colors.neonCyan} strokeWidth={2} />
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 16,
            color: theme.colors.text,
            marginLeft: 8,
          }}
        >
          Comments
        </Text>
        {totalResults > 0 && (
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: theme.colors.textSecondary,
              marginLeft: 8,
            }}
          >
            ({totalResults})
          </Text>
        )}
      </View>

      {/* Comments List */}
      {comments.map((comment) => (
        <View
          key={comment.id}
          style={{
            flexDirection: 'row',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.06)',
          }}
        >
          {/* Profile Image */}
          <Image
            source={{ uri: comment.authorProfileImage }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.colors.cardBackground,
              marginRight: 12,
            }}
          />

          {/* Comment Content */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 13,
                  color: theme.colors.text,
                }}
                numberOfLines={1}
              >
                {comment.authorName}
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 11,
                  color: theme.colors.textSecondary,
                  marginLeft: 8,
                }}
              >
                {formatRelativeTime(comment.publishedAt)}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 13,
                color: theme.isDark
                  ? 'rgba(255,255,255,0.85)'
                  : 'rgba(0,0,0,0.85)',
                lineHeight: 20,
                marginBottom: 8,
              }}
            >
              {comment.text}
            </Text>

            {/* Like Count & Reply Count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThumbsUp
                  size={14}
                  color={theme.colors.textSecondary}
                  strokeWidth={1.5}
                />
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 12,
                    color: theme.colors.textSecondary,
                    marginLeft: 4,
                  }}
                >
                  {formatLikeCount(comment.likeCount)}
                </Text>
              </View>
              {comment.totalReplyCount > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MessageCircle
                    size={14}
                    color={theme.colors.textSecondary}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 12,
                      color: theme.colors.textSecondary,
                      marginLeft: 4,
                    }}
                  >
                    {comment.totalReplyCount}{' '}
                    {comment.totalReplyCount === 1 ? 'reply' : 'replies'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ))}

      {/* Load More */}
      {nextPageToken && (
        <TouchableOpacity
          onPress={loadMoreComments}
          disabled={loadingMore}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            borderWidth: 1,
            borderColor: theme.isDark
              ? 'rgba(0, 229, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.1)',
            marginTop: 4,
          }}
          data-testid="load-more-comments-btn"
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color={theme.colors.neonCyan} />
          ) : (
            <>
              <ChevronDown size={16} color={theme.colors.neonCyan} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 13,
                  color: theme.colors.neonCyan,
                  marginLeft: 6,
                }}
              >
                Load More Comments
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
