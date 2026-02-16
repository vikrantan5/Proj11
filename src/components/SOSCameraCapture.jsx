import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import { useTheme } from '@/utils/useTheme';

export default function SOSCameraCapture({ visible, onCapture, onClose }) {
  const theme = useTheme();
  const [hasPermission, setHasPermission] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (visible) {
      requestCameraPermissionAndCapture();
    }
  }, [visible]);













  

  const requestCameraPermissionAndCapture = async () => {
    try {
      // Check if Camera is available (not available on web)
      if (!Camera || !Camera.Constants || Platform.OS === 'web') {
        console.log('⚠️ Camera not available on this platform, continuing without photo');
        setCameraAvailable(false);
        onCapture(null);
        return;
      }

      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        // Silent auto-capture immediately
        setTimeout(() => {
          capturePhoto();
        }, 500); // Small delay to ensure camera is ready
      } else {
        // Permission denied, continue without photo
        console.log('⚠️ Camera permission denied, continuing without photo');
        onCapture(null);
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setCameraAvailable(false);
      onCapture(null);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      
      console.log('✅ Evidence photo captured silently:', photo.uri);
      onCapture(photo.uri);
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      onCapture(null);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!visible) return null;

  // If camera not available, show brief message and continue
  if (!cameraAvailable) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.text}>
            Camera not available on this platform. Continuing with SOS alert...
          </Text>
        </View>
      </View>
    );
  }

  // Silent capture - no UI shown to user except brief loading indicator
  return (
    <View style={styles.container}>
      {hasPermission === null || hasPermission === false ? (
        // No camera UI shown - just processing indicator
        <View style={[styles.content, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.text}>
            {hasPermission === null ? 'Processing...' : 'Continuing without photo...'}
          </Text>
        </View>
      ) : (
        // Camera active but hidden from user view - captures silently
        <View style={styles.hiddenCameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.hiddenCamera}
            type={Camera?.Constants?.Type?.back || 'back'}
            autoFocus={Camera?.Constants?.AutoFocus?.on || 'on'}
          />
          <View style={[styles.content, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.text}>Capturing evidence...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  hiddenCameraContainer: {
    flex: 1,
    position: 'relative',
  },
  hiddenCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0, // Camera is hidden from user
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
});
