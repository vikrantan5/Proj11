
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let recording = null;
let recordingTimeout = null;

/**
 * Request microphone permissions
 * @returns {Promise<boolean>}
 */
export const requestAudioPermission = async () => {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting audio permission:', error);
    return false;
  }
};

/**
 * Configure audio mode for recording
 */
const configureAudioMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.error('Error configuring audio mode:', error);
  }
};

/**
 * Start recording audio
 * @returns {Promise<boolean>} true if recording started successfully
 */
export const startRecording = async () => {
  try {
    // Request permission
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      console.warn('Microphone permission denied');
      return false;
    }

    // Configure audio mode
    await configureAudioMode();

    // Stop any existing recording
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        // Ignore
      }
      recording = null;
    }

    // Create recording with high quality settings
    const recordingOptions = {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    };

    const { recording: newRecording } = await Audio.Recording.createAsync(
      recordingOptions
    );

    recording = newRecording;
    console.log('Audio recording started');
    return true;
  } catch (error) {
    console.error('Error starting audio recording:', error);
    return false;
  }
};

/**
 * Stop recording and return the audio file URI
 * @returns {Promise<string|null>} Audio file URI or null
 */
export const stopRecording = async () => {
  try {
    if (!recording) {
      console.warn('No active recording to stop');
      return null;
    }

    // Clear any auto-stop timeout
    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
      recordingTimeout = null;
    }

    await recording.stopAndUnloadAsync();

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const uri = recording.getURI();
    console.log('Audio recording stopped. URI:', uri);

    recording = null;
    return uri;
  } catch (error) {
    console.error('Error stopping audio recording:', error);
    recording = null;
    return null;
  }
};

/**
 * Record audio for a specific duration (auto-stop)
 * @param {number} durationMs - Duration in milliseconds (default: 10000 = 10 seconds)
 * @returns {Promise<string|null>} Audio file URI or null
 */
export const recordForDuration = async (durationMs = 10000) => {
  try {
    const started = await startRecording();
    if (!started) {
      return null;
    }

    // Wait for the specified duration
    return new Promise((resolve) => {
      recordingTimeout = setTimeout(async () => {
        const uri = await stopRecording();
        resolve(uri);
      }, durationMs);
    });
  } catch (error) {
    console.error('Error in timed recording:', error);
    return null;
  }
};

/**
 * Check if currently recording
 * @returns {boolean}
 */
export const isRecording = () => {
  return recording !== null;
};

/**
 * Cancel and discard current recording
 */
export const cancelRecording = async () => {
  try {
    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
      recordingTimeout = null;
    }
    if (recording) {
      await recording.stopAndUnloadAsync();
      recording = null;
    }
  } catch (error) {
    console.error('Error cancelling recording:', error);
    recording = null;
  }
};
