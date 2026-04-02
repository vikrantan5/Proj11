import { db, auth } from '@/config/firebaseConfig';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

const VIDEOS_COLLECTION = 'educational_videos';

/**
 * Extract video ID from YouTube URL
 */
export const extractVideoId = (url) => {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
};

/**
 * Validate YouTube URL
 */
export const isValidYouTubeUrl = (url) => {
  const videoId = extractVideoId(url);
  return videoId !== null;
};

/**
 * Get thumbnail URL from video ID
 */
export const getThumbnailUrl = (videoId) => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Add a new video
 */
export const addVideo = async (videoData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const videoId = extractVideoId(videoData.url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Check for duplicates
    const existingQuery = query(
      collection(db, VIDEOS_COLLECTION),
      where('videoId', '==', videoId)
    );
    const existingDocs = await getDocs(existingQuery);
    if (!existingDocs.empty) {
      throw new Error('This video has already been added');
    }

    const thumbnailUrl = getThumbnailUrl(videoId);

    const newVideo = {
      videoId,
      title: videoData.title || '',
      description: videoData.description || '',
      category: videoData.category,
      thumbnailUrl,
      published: videoData.published !== undefined ? videoData.published : true,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), newVideo);
    return { id: docRef.id, ...newVideo };
  } catch (error) {
    console.error('Error adding video:', error);
    throw error;
  }
};

/**
 * Update a video
 */
export const updateVideo = async (videoId, updates) => {
  try {
    const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
    
    // If URL is being updated, extract new video ID
    if (updates.url) {
      const newVideoId = extractVideoId(updates.url);
      if (!newVideoId) {
        throw new Error('Invalid YouTube URL');
      }
      updates.videoId = newVideoId;
      updates.thumbnailUrl = getThumbnailUrl(newVideoId);
      delete updates.url;
    }

    await updateDoc(videoRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating video:', error);
    throw error;
  }
};

/**
 * Delete a video
 */
export const deleteVideo = async (videoId) => {
  try {
    const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
    await deleteDoc(videoRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
};

/**
 * Toggle video publish status
 */
export const togglePublishStatus = async (videoId, currentStatus) => {
  try {
    const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
    await updateDoc(videoRef, {
      published: !currentStatus,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error toggling publish status:', error);
    throw error;
  }
};

/**
 * Get all videos (admin view - includes unpublished)
 */
export const getAllVideos = async () => {
  try {
    const videosQuery = query(
      collection(db, VIDEOS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(videosQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting all videos:', error);
    throw error;
  }
};

/**
 * Get published videos (student view)
 */
export const getPublishedVideos = async (category = null) => {
  try {
    let videosQuery;
    
    if (category && category !== 'All') {
      videosQuery = query(
        collection(db, VIDEOS_COLLECTION),
        where('published', '==', true),
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
    } else {
      videosQuery = query(
        collection(db, VIDEOS_COLLECTION),
        where('published', '==', true),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(videosQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting published videos:', error);
    throw error;
  }
};

/**
 * Get single video by ID
 */
export const getVideoById = async (videoId) => {
  try {
    const videoRef = doc(db, VIDEOS_COLLECTION, videoId);
    const videoDoc = await getDoc(videoRef);
    
    if (!videoDoc.exists()) {
      throw new Error('Video not found');
    }

    return {
      id: videoDoc.id,
      ...videoDoc.data(),
    };
  } catch (error) {
    console.error('Error getting video:', error);
    throw error;
  }
};

/**
 * Available categories
 */
export const VIDEO_CATEGORIES = [
  'Programming',
  'Web Development',
  'DSA',
  'Aptitude',
  'Soft Skills',
  'Women Safety',
  'General',
];
