import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';
import * as Torch from 'expo-torch';
import { Platform, Alert } from 'react-native';

/**
 * Custom hook for managing the Loud Alarm feature
 * Handles sound playback, vibration, brightness, and flashlight
 */
export const useLoudAlarm = () => {
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isVibrating, setIsVibrating] = useState(false);
  const soundObject = useRef(null);
  const vibrationInterval = useRef(null);
  const flashlightInterval = useRef(null);
  const originalBrightness = useRef(null);

  // Preload sound on mount
  useEffect(() => {
    preloadSound();
    return () => {
      cleanup();
    };
  }, []);

  /**
   * Preload the alarm sound
   */
  const preloadSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
        interruptionModeIOS: 1, // Do not mix
        interruptionModeAndroid: 1, // Do not mix
      });

      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/audio/alarm.mp3'),
        { shouldPlay: false, isLooping: true, volume: 1.0 },
        null,
        true
      );

      soundObject.current = sound;
      console.log('✅ Alarm sound preloaded successfully');
    } catch (error) {
      console.error('❌ Error preloading alarm sound:', error);
      Alert.alert('Error', 'Failed to load alarm sound');
    }
  };

  /**
   * Start continuous vibration pattern
   */
  const startVibration = () => {
    setIsVibrating(true);
    
    const vibratePattern = () => {
      if (Platform.OS === 'ios') {
        // iOS - use haptics
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        // Android - use standard vibration
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    };

    // Initial vibration
    vibratePattern();

    // Continuous vibration every 800ms
    vibrationInterval.current = setInterval(() => {
      vibratePattern();
    }, 800);
  };

  /**
   * Stop vibration
   */
  const stopVibration = () => {
    if (vibrationInterval.current) {
      clearInterval(vibrationInterval.current);
      vibrationInterval.current = null;
    }
    setIsVibrating(false);
  };

  /**
   * Start flashlight blinking (optional feature)
   */
  const startFlashlight = async () => {
    try {
      const hasTorch = await Torch.isTorchAvailable();
      if (!hasTorch) return;

      let isOn = false;
      flashlightInterval.current = setInterval(async () => {
        try {
          await Torch.setTorchModeAsync(isOn);
          isOn = !isOn;
        } catch (e) {
          console.error('Flashlight toggle error:', e);
        }
      }, 500); // Blink every 500ms
    } catch (error) {
      console.log('Flashlight not available:', error);
    }
  };

  /**
   * Stop flashlight
   */
  const stopFlashlight = async () => {
    if (flashlightInterval.current) {
      clearInterval(flashlightInterval.current);
      flashlightInterval.current = null;
    }
    try {
      await Torch.setTorchModeAsync(false);
    } catch (e) {
      console.log('Could not turn off flashlight:', e);
    }
  };

  /**
   * Set brightness to maximum
   */
  const setMaxBrightness = async () => {
    try {
      // Save original brightness
      const { brightness } = await Brightness.getBrightnessAsync();
      originalBrightness.current = brightness;
      
      // Set to max
      await Brightness.setBrightnessAsync(1.0);
    } catch (error) {
      console.log('Could not set brightness:', error);
    }
  };

  /**
   * Restore original brightness
   */
  const restoreBrightness = async () => {
    try {
      if (originalBrightness.current !== null) {
        await Brightness.setBrightnessAsync(originalBrightness.current);
        originalBrightness.current = null;
      }
    } catch (error) {
      console.log('Could not restore brightness:', error);
    }
  };

  /**
   * Start the loud alarm
   */
  const startAlarm = useCallback(async () => {
    try {
      setIsAlarmActive(true);

      // Keep screen awake
      await activateKeepAwakeAsync();

      // Start sound
      if (soundObject.current) {
        await soundObject.current.setPositionAsync(0);
        await soundObject.current.setVolumeAsync(1.0);
        await soundObject.current.setIsLoopingAsync(true);
        await soundObject.current.playAsync();
        console.log('🔊 Alarm sound started');
      }

      // Start vibration
      startVibration();

      // Start flashlight (optional)
      startFlashlight();

      // Max brightness (optional)
      setMaxBrightness();

      console.log('🚨 LOUD ALARM ACTIVATED');
    } catch (error) {
      console.error('❌ Error starting alarm:', error);
      Alert.alert('Error', 'Failed to start alarm');
      stopAlarm();
    }
  }, []);

  /**
   * Stop the loud alarm
   */
  const stopAlarm = useCallback(async () => {
    try {
      setIsAlarmActive(false);

      // Stop sound
      if (soundObject.current) {
        await soundObject.current.stopAsync();
        console.log('🔇 Alarm sound stopped');
      }

      // Stop vibration
      stopVibration();

      // Stop flashlight
      await stopFlashlight();

      // Restore brightness
      await restoreBrightness();

      // Deactivate keep awake
      deactivateKeepAwake();

      console.log('✅ Alarm stopped');
    } catch (error) {
      console.error('❌ Error stopping alarm:', error);
    }
  }, []);

  /**
   * Toggle alarm on/off
   */
  const toggleAlarm = useCallback(() => {
    if (isAlarmActive) {
      stopAlarm();
    } else {
      startAlarm();
    }
  }, [isAlarmActive, startAlarm, stopAlarm]);

  /**
   * Cleanup function
   */
  const cleanup = async () => {
    await stopAlarm();
    if (soundObject.current) {
      await soundObject.current.unloadAsync();
      soundObject.current = null;
    }
  };

  return {
    isAlarmActive,
    isVibrating,
    startAlarm,
    stopAlarm,
    toggleAlarm,
  };
};
