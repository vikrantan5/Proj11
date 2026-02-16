import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';

/**
 * Request camera roll permissions
 * @returns {Promise<boolean>}
 */
export const requestImagePermissions = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to upload images!');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

/**
 * Pick an image from gallery
 * @returns {Promise<Object|null>} - Image object with uri, or null if cancelled
 */
export const pickImage = async () => {
  try {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Compress to reduce file size
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

/**
 * Upload image to Firebase Storage
 * @param {string} uri - Local image URI
 * @param {string} folder - Storage folder (e.g., 'community_posts')
 * @returns {Promise<string>} - Download URL of uploaded image
 */
export const uploadImage = async (uri, folder = 'community_posts') => {
  try {
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }

    // Convert URI to blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create unique filename
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, filename);

    console.log('📤 Uploading image to Firebase Storage...');
    
    // Upload blob
    await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('✅ Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};
