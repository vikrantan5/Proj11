import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';

export const useLoudAlarm = () => {
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const soundObject = useRef(null);
  const vibrationInterval = useRef(null);

  // Preload sound on mount
  useEffect(() => {
    preloadSound();
    return () => {
      cleanup();
    };
  }, []);

  const preloadSound = async () => {
    try {
      // ✅ SDK 53 ka sahi syntax
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });

      // ✅ Temp sound - pehle ye use kar
      const { sound } = await Audio.Sound.createAsync(
        require('../app/assets/audio'), // Is file ko check kar
        { shouldPlay: false, isLooping: true, volume: 1.0 }
      );

      soundObject.current = sound;
      console.log('✅ Alarm sound preloaded');
    } catch (error) {
      console.error('❌ Error preloading:', error);
      // Crash mat hone de
    }
  };

  const startAlarm = useCallback(async () => {
    try {
      setIsAlarmActive(true);
      await activateKeepAwakeAsync();

      // Sound play
      if (soundObject.current) {
        await soundObject.current.setPositionAsync(0);
        await soundObject.current.playAsync();
      }

      // Simple vibration (bina flashlight/brightness ke)
      vibrationInterval.current = setInterval(() => {
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      }, 1000);

      console.log('🚨 Alarm activated');
    } catch (error) {
      console.error('❌ Error:', error);
      stopAlarm();
    }
  }, []);

  const stopAlarm = useCallback(async () => {
    try {
      setIsAlarmActive(false);

      if (soundObject.current) {
        await soundObject.current.stopAsync();
      }

      if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
        vibrationInterval.current = null;
      }

      deactivateKeepAwake();
      console.log('✅ Alarm stopped');
    } catch (error) {
      console.error('❌ Error stopping:', error);
    }
  }, []);

  const cleanup = async () => {
    await stopAlarm();
    if (soundObject.current) {
      await soundObject.current.unloadAsync();
      soundObject.current = null;
    }
  };

  return {
    isAlarmActive,
    startAlarm,
    stopAlarm,
    toggleAlarm: () => isAlarmActive ? stopAlarm() : startAlarm(),
  };
};