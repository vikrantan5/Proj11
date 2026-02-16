import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { storage } from '../config/firebaseConfig';
import { Platform } from 'react-native';

/**
 * Upload image to Firebase Storage
 * @param {string} uri - Local image URI
 * @param {Object} metadata - Image metadata (timestamp, GPS, device info)
 * @param {string} userId - User ID for organizing storage
 * @returns {Promise<string>} Download URL of uploaded image
 */
export const uploadSOSImage = async (uri, metadata, userId) => {
  try {
    if (!uri) {
      throw new Error('No image URI provided');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `sos_images/${userId}/${timestamp}.jpg`;
    const storageRef = ref(storage, filename);

    let downloadURL;

    if (Platform.OS === 'web') {
      // For web, fetch the blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload blob with metadata
      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          ...metadata,
          timestamp: metadata.timestamp || new Date().toISOString(),
        },
      });
      
      downloadURL = await getDownloadURL(storageRef);
    } else {
      // For React Native (iOS/Android)
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload blob with metadata
      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          ...metadata,
          timestamp: metadata.timestamp || new Date().toISOString(),
          gps: JSON.stringify(metadata.gps || {}),
        },
      });
      
      downloadURL = await getDownloadURL(storageRef);
    }

    console.log('✅ Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading image to Firebase Storage:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Generate secure, shareable link with expiry
 * @param {string} downloadURL - Firebase Storage download URL
 * @param {Object} metadata - Additional metadata to include
 * @returns {string} Formatted shareable link
 */
export const generateSecureLink = (downloadURL, metadata) => {
  // For now, return the direct download URL
  // In production, you might want to use Firebase Dynamic Links
  return downloadURL;
};

/**
 * Delete SOS image from storage
 * @param {string} imageUrl - Image URL to delete
 * @returns {Promise<void>}
 */
export const deleteSOSImage = async (imageUrl) => {
  try {
    // Extract path from URL
    const urlParts = imageUrl.split('/o/');
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL');
    }
    
    const pathWithQuery = urlParts[1].split('?')[0];
    const imagePath = decodeURIComponent(pathWithQuery);
    
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    
    console.log('✅ Image deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    throw error;
  }
};
