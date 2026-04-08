import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/utils/useTheme';

export default function SOSCameraCapture({ visible, onCapture, onClose }) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [statusText, setStatusText] = useState('Initializing...');
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const captureAttempted = useRef(false);

  useEffect(() => {
    if (visible) {
      // Reset state for new SOS trigger
      captureAttempted.current = false;
      setCameraReady(false);
      setIsCapturing(false);
      setStatusText('Initializing...');

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      requestCameraPermissionAndSetup();
    }
  }, [visible]);

  // When camera becomes ready, capture the photo
  useEffect(() => {
    if (visible && cameraReady && !captureAttempted.current) {
      captureAttempted.current = true;
      // Small delay to ensure camera is fully initialized
      setTimeout(() => capturePhoto(), 500);
    }
  }, [visible, cameraReady]);

  const requestCameraPermissionAndSetup = async () => {
    try {
      if (Platform.OS === 'web') {
        console.log('Camera not available on web platform');
        setCameraAvailable(false);
        setStatusText('Camera unavailable - continuing SOS...');
        setTimeout(() => onCapture(null), 1000);
        return;
      }

      setStatusText('Requesting camera access...');
      
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          console.log('Camera permission denied');
          setStatusText('Camera denied - continuing SOS...');
          setTimeout(() => onCapture(null), 1000);
          return;
        }
      }

      setStatusText('Capturing evidence photo...');
      
      // If camera doesn't become ready within 5 seconds, proceed without photo
      setTimeout(() => {
        if (!captureAttempted.current) {
          console.log('Camera timeout - proceeding without photo');
          captureAttempted.current = true;
          setStatusText('Camera timeout - continuing SOS...');
          setTimeout(() => onCapture(null), 500);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Camera error:', error);
      setCameraAvailable(false);
      setStatusText('Camera error - continuing SOS...');
      setTimeout(() => onCapture(null), 1000);
    }
  };

  const handleCameraReady = () => {
    console.log('Camera is ready');
    setCameraReady(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) {
      console.log('Camera ref not available or already capturing');
      setTimeout(() => onCapture(null), 500);
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
        exif: true,
      });

      console.log('Evidence photo captured:', photo.uri);
      setStatusText('Photo captured!');
      setTimeout(() => onCapture(photo.uri), 300);
    } catch (error) {
      console.error('Photo capture error:', error);
      setStatusText('Capture failed - continuing...');
      setTimeout(() => onCapture(null), 500);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!visible) return null;

  const hasPermission = permission?.granted;

  return (
    <View style={styles.container}>
      {/* Hidden camera (captures silently) */}
      {hasPermission && cameraAvailable && (
        <CameraView
          ref={cameraRef}
          style={styles.hiddenCamera}
          facing="back"
          onCameraReady={handleCameraReady}
        />
      )}

      {/* Overlay - user sees this */}
      <View style={styles.overlay}>
        <View style={styles.contentBox}>
          <Animated.View
            style={[
              styles.pulseRing,
              { opacity: pulseAnim },
            ]}
          />
          <View style={styles.iconCircle}>
            <ActivityIndicator size="large" color="#FF2D95" />
          </View>
          <Text style={styles.title}>SOS Activating</Text>
          <Text style={styles.statusText}>{statusText}</Text>
          <View style={styles.stepsContainer}>
            <StepIndicator label="Camera" active={isCapturing || hasPermission} done={isCapturing === false && hasPermission && cameraReady} />
            <StepIndicator label="Audio" active={true} done={false} />
            <StepIndicator label="Location" active={true} done={false} />
            <StepIndicator label="Upload" active={false} done={false} />
            <StepIndicator label="Alert" active={false} done={false} />
          </View>
        </View>
      </View>
    </View>
  );
}

function StepIndicator({ label, active, done }) {
  return (
    <View style={styles.stepItem}>
      <View style={[
        styles.stepDot,
        active && styles.stepDotActive,
        done && styles.stepDotDone,
      ]} />
      <Text style={[
        styles.stepLabel,
        active && styles.stepLabelActive,
      ]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
  },
  hiddenCamera: {
    position: 'absolute',
    top: 0, left: 0,
    width: 1, height: 1,
    opacity: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  contentBox: {
    alignItems: 'center',
    width: '100%',
  },
  pulseRing: {
    position: 'absolute',
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 45, 149, 0.15)',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 45, 149, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 45, 149, 0.4)',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  statusText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
    textAlign: 'center',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255, 165, 0, 0.8)',
  },
  stepDotDone: {
    backgroundColor: '#00E5A0',
  },
  stepLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  stepLabelActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
