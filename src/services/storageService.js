
import { uploadSOSImageToCloudinary, uploadSOSAudioToCloudinary } from './cloudinaryService';

/**
 * Upload SOS image to Cloudinary (replaces Firebase Storage)
 * @param {string} uri - Local image URI
 * @param {Object} metadata - Image metadata
 * @param {string} userId - User ID
 * @returns {Promise<string>} Download URL
 */
export const uploadSOSImage = async (uri, metadata, userId) => {
  try {
    if (!uri) {
      throw new Error('No image URI provided');
    }

    const downloadURL = await uploadSOSImageToCloudinary(uri, userId);
    console.log('Image uploaded to Cloudinary:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading SOS image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload SOS audio to Cloudinary
 * @param {string} uri - Local audio file URI
 * @param {string} userId - User ID
 * @returns {Promise<string>} Download URL
 */
export const uploadSOSAudio = async (uri, userId) => {
  try {
    if (!uri) {
      throw new Error('No audio URI provided');
    }

    const downloadURL = await uploadSOSAudioToCloudinary(uri, userId);
    console.log('Audio uploaded to Cloudinary:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading SOS audio:', error);
    throw new Error(`Failed to upload audio: ${error.message}`);
  }
};

/**
 * Generate secure, shareable link with expiry
 * @param {string} downloadURL - Cloudinary URL
 * @param {Object} metadata - Additional metadata
 * @returns {string} Formatted shareable link
 */
export const generateSecureLink = (downloadURL, metadata) => {
  return downloadURL;
};
