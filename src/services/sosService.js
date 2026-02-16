import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { getUserDetails } from './userService';
import { getAuth } from 'firebase/auth';
import { requestCameraPermission, getPhotoMetadata } from './cameraService';
import { uploadSOSImage } from './storageService';
import { encryptData } from './encryptionService';

/**
 * Request SMS, Location, and Camera permissions
 * @returns {Promise<Object>} Object with SMS, Location, and Camera permission status
 */
export const requestSOSPermissions = async () => {
  try {
    // Request SMS permissions
    const smsAvailable = await SMS.isAvailableAsync();
    
    // Request Location permissions
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    
    // Request Camera permissions
    const cameraGranted = await requestCameraPermission();
    
    return {
      smsAvailable,
      locationGranted: locationStatus === 'granted',
      cameraGranted
    };
  } catch (error) {
    console.error('Error requesting SOS permissions:', error);
    return {
      smsAvailable: false,
      locationGranted: false,
      cameraGranted: false
    };
  }
};

/**
 * Get current GPS location
 * @returns {Promise<Object|null>} Location object or null if failed
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
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {string} Google Maps URL
 */
export const generateLocationLink = (latitude, longitude) => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

/**
 * Send SMS to emergency contacts with image link
 * @param {Array} contacts - Array of phone numbers (strings) or objects with phone property
 * @param {Object} location - Location object with latitude and longitude
 * @param {string} imageUrl - Optional image URL to include in SMS
 * @returns {Promise<Object>} Result object with success status
 */
export const sendEmergencySMS = async (contacts, location, imageUrl = null) => {
  try {
    const smsAvailable = await SMS.isAvailableAsync();
    
    if (!smsAvailable) {
      throw new Error('SMS is not available on this device');
    }

    // Extract phone numbers - contacts can be strings or objects
    let phoneNumbers = [];
    if (Array.isArray(contacts)) {
      phoneNumbers = contacts.map(contact => {
        if (typeof contact === 'string') {
          return contact;
        } else if (contact.phone) {
          return contact.phone;
        }
        return null;
      }).filter(phone => phone && phone.trim() !== '');
    }

    if (phoneNumbers.length === 0) {
      throw new Error('No valid emergency contacts found');
    }

    // Create emergency message
    let message = '🚨 EMERGENCY ALERT 🚨\n\n';
    message += 'This is an automated SOS message from Saheli app.\n';
    message += 'I need immediate assistance!\n\n';
    
    if (location) {
      const locationLink = generateLocationLink(location.latitude, location.longitude);
      message += `My current location:\n${locationLink}\n\n`;
      message += `Coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n`;
      message += `Time: ${new Date().toLocaleString()}\n\n`;
    } else {
      message += 'Location unavailable.\n\n';
    }
    
    if (imageUrl) {
      message += `📸 Evidence Photo:\n${imageUrl}\n\n`;
    }
    
    message += 'Please contact me immediately or call emergency services.';

    // Send SMS to all contacts
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
 * @param {Array} contacts - Array of contact objects with priority
 * @returns {Promise<Object>} Result object
 */
export const makeEmergencyCall = async (contacts) => {
  try {
    if (!contacts || contacts.length === 0) {
      throw new Error('No emergency contacts available');
    }

    // Sort by priority (lower number = higher priority) and get highest priority contact
    let sortedContacts = [...contacts];
    
    // Handle both old format (strings) and new format (objects with priority)
    if (typeof sortedContacts[0] === 'object' && 'priority' in sortedContacts[0]) {
      sortedContacts.sort((a, b) => a.priority - b.priority);
    }
    
    const priorityContact = sortedContacts[0];
    
    // Get phone number
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

    // Clean phone number (remove spaces, dashes, etc., keep only digits and +)
    phoneNumber = phoneNumber.replace(/[^0-9+]/g, '');

    // Create tel URL
    const telUrl = `tel:${phoneNumber}`;

    // Check if the device can open tel URLs
    const canOpen = await Linking.canOpenURL(telUrl);

    if (!canOpen) {
      throw new Error('Cannot make phone calls on this device');
    }

    // Open dialer with the number
    await Linking.openURL(telUrl);

    return {
      success: true,
      message: `Calling ${contactName} (Priority Contact)`,
      contactName: contactName,
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
 * Main SOS function - triggers all emergency protocols including camera capture
 * @param {string} photoUri - Optional photo URI (if captured from component)
 * @returns {Promise<Object>} Result object with all actions taken
 */
export const triggerSOS = async (photoUri = null) => {
  try {
    // Get current user
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get user details with emergency contacts
    const userDetails = await getUserDetails(currentUser.uid);

    if (!userDetails || !userDetails.emergencyContacts || userDetails.emergencyContacts.length === 0) {
      throw new Error('No emergency contacts found. Please add emergency contacts in your profile.');
    }

    // Request permissions
    const permissions = await requestSOSPermissions();

    // Get current location
    let location = null;
    if (permissions.locationGranted) {
      location = await getCurrentLocation();
    }

    // Handle photo capture and upload
    let imageUrl = null;
    let imageUploadError = null;
    
    if (photoUri && permissions.cameraGranted) {
      try {
        // Get photo metadata
        const metadata = getPhotoMetadata(location);
        
        // Encrypt sensitive data
        const encryptedMetadata = {
          timestamp: metadata.timestamp,
          deviceId: encryptData(metadata.deviceId),
          gps: location ? encryptData({
            lat: location.latitude,
            lng: location.longitude
          }) : null,
        };

        // Upload photo to Firebase Storage
        imageUrl = await uploadSOSImage(photoUri, encryptedMetadata, currentUser.uid);
        
        console.log('✅ SOS photo uploaded successfully:', imageUrl);
      } catch (error) {
        console.error('❌ Error uploading SOS photo:', error);
        imageUploadError = error.message;
        // Continue with SOS even if photo upload fails
      }
    }

    // Send SMS to all contacts (with image link if available)
    let smsResult = { success: false };
    if (permissions.smsAvailable) {
      smsResult = await sendEmergencySMS(userDetails.emergencyContacts, location, imageUrl);
    }

    // Make call to first contact
    let callResult = { success: false };
    callResult = await makeEmergencyCall(userDetails.emergencyContacts);

    // Prepare result
    const result = {
      success: smsResult.success || callResult.success,
      sms: smsResult,
      call: callResult,
      location: location,
      imageUrl: imageUrl,
      imageUploadError: imageUploadError,
      photoCapture: photoUri ? { success: !!imageUrl } : { skipped: true },
      contactsCount: userDetails.emergencyContacts.length,
    };

    return result;
  } catch (error) {
    console.error('Error triggering SOS:', error);
    throw error;
  }
};
