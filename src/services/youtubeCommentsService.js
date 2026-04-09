import { ENV } from '@/config/env';

const YOUTUBE_API_KEY = ENV.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Fetch comments for a YouTube video using YouTube Data API v3
 * @param {string} videoId - The YouTube video ID
 * @param {string} pageToken - Optional page token for pagination
 * @returns {Promise<{comments: Array, nextPageToken: string|null}>}
 */
export const fetchYouTubeComments = async (videoId, pageToken = null) => {
  try {
    let url = `${YOUTUBE_API_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&textFormat=plainText&key=${YOUTUBE_API_KEY}`;

    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API error:', errorData);

      if (response.status === 403) {
        throw new Error('Comments are disabled for this video or API quota exceeded.');
      }
      throw new Error('Failed to fetch comments.');
    }

    const data = await response.json();

    const comments = data.items.map((item) => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        id: item.id,
        authorName: snippet.authorDisplayName,
        authorProfileImage: snippet.authorProfileImageUrl,
        text: snippet.textDisplay,
        likeCount: snippet.likeCount,
        publishedAt: snippet.publishedAt,
        totalReplyCount: item.snippet.totalReplyCount,
      };
    });

    return {
      comments,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || 0,
    };
  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    throw error;
  }
};

/**
 * Format the published date to a relative time string
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  return 'just now';
};
