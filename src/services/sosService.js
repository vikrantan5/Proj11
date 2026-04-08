import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { getUserDetails } from './userService';
import { getAuth } from 'firebase/auth';
import { requestCameraPermission, getPhotoMetadata } from './cameraService';
import { encryptData } from './encryptionService';
import { startRecording, stopRecording } from './audioRecordingService';
import { uploadAllSOSFiles, uploadSOSImageToCloudinary, uploadSOSAudioToCloudinary } from './cloudinaryService';
import { saveSOSEventToFirestore, notifyBackend } from './sosEventService';

// SOS recording duration in ms (10 seconds)
const SOS_RECORDING_DURATION_MS = 10000;

/**
 * Request SMS, Location, Camera, and Microphone permissions
 * @returns {Promise<Object>} Permission status for all
 */
export const requestSOSPermissions = async () => {
  try {
    const results = await Promise.allSettled([
      SMS.isAvailableAsync(),
      Location.requestForegroundPermissionsAsync(),
      requestCameraPermission(),
    ]);

    const smsAvailable = results[0].status === 'fulfilled' ? results[0].value : false;
    const locationGranted = results[1].status === 'fulfilled' ? results[1].value?.status === 'granted' : false;
    const cameraGranted = results[2].status === 'fulfilled' ? results[2].value : false;

    return {
      smsAvailable,
      locationGranted,
      cameraGranted,
    };
  } catch (error) {
    console.error('Error requesting SOS permissions:', error);
    return {
      smsAvailable: false,
      locationGranted: false,
      cameraGranted: false,
    };
  }
};

/**
 * Get current GPS location with high accuracy
 * @returns {Promise<Object|null>}
 */
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(location.timestamp).toISOString(),
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

/**
 * Generate Google Maps link from coordinates
 */
export const generateLocationLink = (latitude, longitude) => {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
};

/**
 * Send SMS to emergency contacts with all evidence links
 * @param {Array} contacts - Emergency contacts
 * @param {Object} location - Location with lat/lng
 * @param {string} imageUrl - Cloudinary image URL
 * @param {string} audioUrl - Cloudinary audio URL
 * @param {string} userName - User's name
 * @returns {Promise<Object>}
 */
export const sendEmergencySMS = async (contacts, location, imageUrl = null, audioUrl = null, userName = 'User') => {
  try {
    const smsAvailable = await SMS.isAvailableAsync();
    if (!smsAvailable) {
      throw new Error('SMS is not available on this device');
    }

    let phoneNumbers = [];
    if (Array.isArray(contacts)) {
      phoneNumbers = contacts.map(contact => {
        if (typeof contact === 'string') return contact;
        if (contact.phone) return contact.phone;
        return null;
      }).filter(phone => phone && phone.trim() !== '');
    }

    if (phoneNumbers.length === 0) {
      throw new Error('No valid emergency contacts found');
    }

    // Build comprehensive SOS message
    let message = 'SOS ALERT - Emergency Detected\n';
    message += `User: ${userName}\n`;
    
    if (location) {
      const locationLink = generateLocationLink(location.latitude, location.longitude);
      message += `Location: ${locationLink}\n`;
    } else {
      message += 'Location: Unavailable\n';
    }

    if (imageUrl) {
      message += `Image Evidence: ${imageUrl}\n`;
    }

    if (audioUrl) {
      message += `Audio Evidence: ${audioUrl}\n`;
    }

    message += `Time: ${new Date().toLocaleString()}\n`;
    message += 'Please contact me immediately or call emergency services.';

    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);

    return {
      success: result === 'sent',
      sentTo: phoneNumbers.length,
      message: result === 'sent'
        ? `Emergency alert sent to ${phoneNumbers.length} contact(s)`
        : 'SMS was not sent',
    };
  } catch (error) {
    console.error('Error sending emergency SMS:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Make emergency call to highest priority contact
 */
export const makeEmergencyCall = async (contacts) => {
  try {
    if (!contacts || contacts.length === 0) {
      throw new Error('No emergency contacts available');
    }

    let sortedContacts = [...contacts];
    if (typeof sortedContacts[0] === 'object' && 'priority' in sortedContacts[0]) {
      sortedContacts.sort((a, b) => a.priority - b.priority);
    }

    const priorityContact = sortedContacts[0];
    let phoneNumber;
    let contactName = 'emergency contact';

    if (typeof priorityContact === 'string') {
      phoneNumber = priorityContact;
    } else {
      phoneNumber = priorityContact.phone;
      contactName = priorityContact.name || contactName;
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
      throw new Error('Invalid phone number for priority contact');
    }

    phoneNumber = phoneNumber.replace(/[^0-9+]/g, '');
    const telUrl = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(telUrl);

    if (!canOpen) {
      throw new Error('Cannot make phone calls on this device');
    }

    await Linking.openURL(telUrl);

    return {
      success: true,
      message: `Calling ${contactName} (Priority Contact)`,
      contactName,
    };
  } catch (error) {
    console.error('Error making emergency call:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Create SOS payload for backend
 */
export const createSOSPayload = (userData, location, imageUrl, audioUrl) => {
  const timestamp = new Date().toISOString();
  const locationUrl = location ? generateLocationLink(location.latitude, location.longitude) : null;

  return {
    user_id: userData.userId || 'unknown',
    user_name: userData.name || 'Unknown',
    latitude: location?.latitude || null,
    longitude: location?.longitude || null,
    location_url: locationUrl,
    image_url: imageUrl,
    audio_url: audioUrl,
    emergency_contacts: userData.emergencyContacts || [],
    timestamp,
  };
};

/**
 * MAIN SOS FUNCTION - Enhanced with audio recording + Cloudinary upload
 * Performs all actions in parallel for maximum speed
 *
 * Flow:
 * 1. Start audio recording immediately
 * 2. Capture image (from component)
 * 3. Get location
 * 4. Wait for audio to finish (10s)
 * 5. Upload files to Cloudinary in parallel
 * 6. Send SMS with evidence links
 * 7. Make emergency call
 * 8. Notify backend
 *
 * @param {string|null} photoUri - Photo URI from camera component
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Complete SOS result
 */
export const triggerSOS = async (photoUri = null, onProgress = null) => {
  const updateProgress = (step, status) => {
    if (onProgress) {
      onProgress({ step, status });
    }
  };

  try {
    updateProgress('auth', 'checking');

    // Step 1: Verify user authentication
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Step 2: Get user details with emergency contacts
    const userDetails = await getUserDetails(currentUser.uid);
    if (!userDetails || !userDetails.emergencyContacts || userDetails.emergencyContacts.length === 0) {
      throw new Error('No emergency contacts found. Please add emergency contacts in your profile.');
    }

    updateProgress('permissions', 'requesting');

    // Step 3: Start audio recording IMMEDIATELY (non-blocking)
    let audioRecordingStarted = false;
    const audioRecordingPromise = (async () => {
      try {
        audioRecordingStarted = await startRecording();
        if (audioRecordingStarted) {
          console.log('Audio recording started for SOS');
          updateProgress('audio', 'recording');
        }
        return audioRecordingStarted;
      } catch (err) {
        console.error('Audio recording failed to start:', err);
        return false;
      }
    })();

    // Step 4: Get location (in parallel with audio start)
    updateProgress('location', 'fetching');
    let location = null;
    const locationPromise = (async () => {
      try {
        location = await getCurrentLocation();
        if (location) {
          updateProgress('location', 'success');
        }
        return location;
      } catch (err) {
        console.error('Location fetch failed:', err);
        return null;
      }
    })();

    // Wait for audio to start and location in parallel
    await Promise.allSettled([audioRecordingPromise, locationPromise]);

    // Step 5: Wait for audio recording to complete (10 seconds)
    updateProgress('audio', 'recording');
    let audioUri = null;
    if (audioRecordingStarted) {
      // Wait for recording duration
      await new Promise(resolve => setTimeout(resolve, SOS_RECORDING_DURATION_MS));
      try {
        audioUri = await stopRecording();
        if (audioUri) {
          updateProgress('audio', 'captured');
          console.log('SOS audio recorded:', audioUri);
        }
      } catch (err) {
        console.error('Error stopping audio recording:', err);
      }
    }

    // Step 6: Upload files to Cloudinary (IMAGE + AUDIO in parallel)
    updateProgress('upload', 'uploading');
    let imageUrl = null;
    let audioUrl = null;
    let imageUploadError = null;
    let audioUploadError = null;

    const userId = currentUser.uid;

    const uploadResults = await uploadAllSOSFiles({
      imageUri: photoUri,
      audioUri,
      userId,
    });

    imageUrl = uploadResults.imageUrl;
    audioUrl = uploadResults.audioUrl;

    if (photoUri && !imageUrl) {
      imageUploadError = 'Image upload failed';
    }
    if (audioUri && !audioUrl) {
      audioUploadError = 'Audio upload failed';
    }

    updateProgress('upload', imageUrl || audioUrl ? 'success' : 'partial');

    // Step 7: Send SMS to all contacts with evidence
    updateProgress('sms', 'sending');
    let smsResult = { success: false };
    try {
      smsResult = await sendEmergencySMS(
        userDetails.emergencyContacts,
        location,
        imageUrl,
        audioUrl,
        userDetails.name || 'User'
      );
      if (smsResult.success) {
        updateProgress('sms', 'sent');
      }
    } catch (err) {
      console.error('SMS sending failed:', err);
    }

    // Step 8: Make emergency call to priority contact
    updateProgress('call', 'calling');
    let callResult = { success: false };
    try {
      callResult = await makeEmergencyCall(userDetails.emergencyContacts);
    } catch (err) {
      console.error('Emergency call failed:', err);
    }

    updateProgress('complete', 'done');

    // Build result
    const result = {
      success: smsResult.success || callResult.success || !!imageUrl || !!audioUrl,
      sms: smsResult,
      call: callResult,
      location,
      locationUrl: location ? generateLocationLink(location.latitude, location.longitude) : null,
      imageUrl,
      audioUrl,
      imageUploadError,
      audioUploadError,
      audioRecording: {
        started: audioRecordingStarted,
        captured: !!audioUri,
        uploaded: !!audioUrl,
      },
      photoCapture: photoUri ? { success: !!imageUrl, uri: photoUri } : { skipped: true },
      contactsCount: userDetails.emergencyContacts.length,
      userName: userDetails.name || 'User',
      timestamp: new Date().toISOString(),
    };

    // Step 9: Persist SOS event (non-blocking, in background)
    try {
      const persistPromises = [
        saveSOSEventToFirestore(result).catch(err =>
          console.error('Firestore SOS save failed:', err)
        ),
        notifyBackend({
          user_id: currentUser.uid,
          user_name: userDetails.name || 'User',
          latitude: location?.latitude,
          longitude: location?.longitude,
          location_url: result.locationUrl,
          image_url: imageUrl,
          audio_url: audioUrl,
          emergency_contacts: userDetails.emergencyContacts,
          contacts_notified: userDetails.emergencyContacts.length,
          sms_success: smsResult.success,
          call_success: callResult.success,
          audio_recorded: !!audioUri,
          photo_captured: !!photoUri,
          success: result.success,
        }).catch(err =>
          console.error('Backend SOS notify failed:', err)
        ),
      ];
      // Fire-and-forget persistence - don't block the SOS result
      Promise.allSettled(persistPromises).then(results => {
        console.log('SOS event persistence completed:', results.map(r => r.status));
      });
    } catch (persistError) {
      console.error('Error initiating SOS persistence:', persistError);
    }

    return result;
  } catch (error) {
    console.error('Error triggering SOS:', error);
    updateProgress('error', error.message);
    throw error;
  }
};