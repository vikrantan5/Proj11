import { Camera } from 'expo-camera';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

/**
 * Request camera permissions
 * @returns {Promise<boolean>}
 */
export const requestCameraPermission = async () => {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * Capture photo from back camera
 * @returns {Promise<Object|null>} Photo data with URI and metadata
 */
export const captureBackCameraPhoto = async () => {
  try {
    // Check camera permissions
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission not granted');
    }

    // For native platforms, we'll use Camera API
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // Create a camera reference (we'll handle this in the component)
      // For now, return metadata structure
      const metadata = {
        timestamp: new Date().toISOString(),
        deviceId: Device.modelName || 'Unknown Device',
        deviceModel: Device.modelId || 'Unknown Model',
        osVersion: Device.osVersion || 'Unknown OS',
        platform: Platform.OS,
      };

      return {
        metadata,
        requiresComponent: true, // Indicates camera component is needed
      };
    } else {
      // For web, we cannot access camera directly in service
      throw new Error('Web camera capture not supported in service layer');
    }
  } catch (error) {
    console.error('Error capturing photo:', error);
    throw error;
  }
};

/**
 * Get device metadata for photo
 * @param {Object} location - GPS coordinates
 * @returns {Object} Metadata object
 */
export const getPhotoMetadata = (location) => {
  return {
    timestamp: new Date().toISOString(),
    deviceId: Device.modelName || 'Unknown Device',
    deviceModel: Device.modelId || 'Unknown Model',
    osVersion: Device.osVersion || 'Unknown OS',
    platform: Platform.OS,
    gps: location ? {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy || 'Unknown',
    } : null,
  };
};

/**
 * Check if camera is available
 * @returns {Promise<boolean>}
 */
export const isCameraAvailable = async () => {
  try {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking camera availability:', error);
    return false;
  }
};
