
import { Platform } from 'react-native';
import ENV from '../config/env';

// Cloudinary config - loaded from env
const CLOUDINARY_CLOUD_NAME = ENV.CLOUDINARY_CLOUD_NAME || 'dmwj4h3i4';
const CLOUDINARY_API_KEY = ENV.CLOUDINARY_API_KEY || '165684144277855';

// Backend URL for signed uploads
const BACKEND_URL = ENV.BACKEND_URL || '';

/**
 * Upload a file directly to Cloudinary (unsigned for SOS emergency - speed priority)
 * For SOS, we use direct upload to minimize latency
 * @param {string} fileUri - Local file URI
 * @param {string} resourceType - 'image', 'video' (audio uses 'video'), or 'raw'
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<Object>} Upload result with secure_url
 */
export const uploadToCloudinary = async (fileUri, resourceType = 'image', folder = 'sos') => {
  try {
    if (!fileUri) {
      throw new Error('No file URI provided');
    }

    const cloudName = CLOUDINARY_CLOUD_NAME;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    // Determine file extension and mime type
    let fileName = fileUri.split('/').pop() || 'file';
    let fileType = 'application/octet-stream';

    if (resourceType === 'image') {
      fileType = 'image/jpeg';
      if (!fileName.includes('.')) fileName += '.jpg';
    } else if (resourceType === 'video') {
      fileType = 'audio/m4a';
      if (!fileName.includes('.')) fileName += '.m4a';
    }

    // Build form data
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Web: fetch blob first
      const response = await fetch(fileUri);
      const blob = await response.blob();
      formData.append('file', blob, fileName);
    } else {
      // React Native: use URI directly
      formData.append('file', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });
    }

    formData.append('upload_preset', 'sos_emergency');
    formData.append('folder', folder);
    formData.append('api_key', CLOUDINARY_API_KEY);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cloudinary upload error response:', errorData);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log(`Cloudinary ${resourceType} upload success:`, result.secure_url);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error(`Cloudinary ${resourceType} upload failed:`, error);
    throw error;
  }
};

/**
 * Upload image to Cloudinary via backend (signed upload)
 * @param {string} imageUri - Local image URI
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<string>} Secure URL of uploaded image
 */
export const uploadSOSImageToCloudinary = async (imageUri, userId = 'unknown') => {
  try {
    const result = await uploadToCloudinary(
      imageUri,
      'image',
      `sos/images/${userId}`
    );
    return result.url;
  } catch (error) {
    console.error('SOS image upload failed:', error);

    // Fallback: Try server-side upload
    try {
      return await uploadViaBackend(imageUri, 'image', userId);
    } catch (backendError) {
      console.error('Backend image upload also failed:', backendError);
      throw error;
    }
  }
};

/**
 * Upload audio to Cloudinary
 * @param {string} audioUri - Local audio file URI
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<string>} Secure URL of uploaded audio
 */
export const uploadSOSAudioToCloudinary = async (audioUri, userId = 'unknown') => {
  try {
    // Audio files use 'video' resource type in Cloudinary
    const result = await uploadToCloudinary(
      audioUri,
      'video',
      `sos/audio/${userId}`
    );
    return result.url;
  } catch (error) {
    console.error('SOS audio upload failed:', error);

    // Fallback: Try server-side upload
    try {
      return await uploadViaBackend(audioUri, 'audio', userId);
    } catch (backendError) {
      console.error('Backend audio upload also failed:', backendError);
      throw error;
    }
  }
};

/**
 * Upload file via backend server (fallback for signed uploads)
 * @param {string} fileUri - Local file URI
 * @param {string} fileType - 'image' or 'audio'
 * @param {string} userId - User ID
 * @returns {Promise<string>} URL of uploaded file
 */
const uploadViaBackend = async (fileUri, fileType, userId) => {
  if (!BACKEND_URL) {
    throw new Error('Backend URL not configured');
  }

  const formData = new FormData();
  formData.append('user_id', userId);

  const fileName = fileUri.split('/').pop() || 'file';

  if (fileType === 'image') {
    formData.append('image_file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: fileName,
    });
  } else {
    formData.append('audio_file', {
      uri: fileUri,
      type: 'audio/m4a',
      name: fileName,
    });
  }

  const response = await fetch(`${BACKEND_URL}/api/sos/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Backend upload failed: ${response.status}`);
  }

  const result = await response.json();
  return fileType === 'image' ? result.image_url : result.audio_url;
};

/**
 * Upload all SOS files in parallel (optimized for speed)
 * @param {Object} params - { imageUri, audioUri, userId }
 * @returns {Promise<Object>} { imageUrl, audioUrl }
 */
export const uploadAllSOSFiles = async ({ imageUri, audioUri, userId }) => {
  const uploads = [];
  let imageUrl = null;
  let audioUrl = null;

  if (imageUri) {
    uploads.push(
      uploadSOSImageToCloudinary(imageUri, userId)
        .then(url => { imageUrl = url; })
        .catch(err => { console.error('Image upload error:', err); })
    );
  }

  if (audioUri) {
    uploads.push(
      uploadSOSAudioToCloudinary(audioUri, userId)
        .then(url => { audioUrl = url; })
        .catch(err => { console.error('Audio upload error:', err); })
    );
  }

  await Promise.allSettled(uploads);

  return { imageUrl, audioUrl };
};
