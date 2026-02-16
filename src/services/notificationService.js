import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { calculateDistance } from './safetyMapService';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<boolean>}
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }
    
    // For Android, set notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('safety-alerts', {
        name: 'Safety Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      await Notifications.setNotificationChannelAsync('verification-requests', {
        name: 'Verification Requests',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get Expo push token for the device
 * @returns {Promise<string|null>}
 */
export const getPushToken = async () => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }
    
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('✅ Expo Push Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Send local notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 * @returns {Promise<string>} Notification ID
 */
export const sendLocalNotification = async (title, body, data = {}) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error sending local notification:', error);
    throw error;
  }
};

/**
 * Find nearby users within radius
 * @param {Object} location - {latitude, longitude}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Promise<Array>} Array of nearby user IDs with push tokens
 */
export const findNearbyUsers = async (location, radiusKm = 0.5) => {
  try {
    // Get all users with push tokens and last known location
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('pushToken', '!=', null));
    const querySnapshot = await getDocs(q);
    
    const nearbyUsers = [];
    const currentUser = auth.currentUser;
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Skip current user
      if (doc.id === currentUser?.uid) return;
      
      // Check if user has location data
      if (userData.lastKnownLocation) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          userData.lastKnownLocation.latitude,
          userData.lastKnownLocation.longitude
        );
        
        if (distance <= radiusKm) {
          nearbyUsers.push({
            userId: doc.id,
            pushToken: userData.pushToken,
            distance,
          });
        }
      }
    });
    
    console.log(`✅ Found ${nearbyUsers.length} nearby users within ${radiusKm}km`);
    return nearbyUsers;
  } catch (error) {
    console.error('Error finding nearby users:', error);
    return [];
  }
};

/**
 * Create verification request for nearby users
 * @param {string} markerId - Safety marker ID
 * @param {Object} markerData - Marker data (coordinates, attributes)
 * @param {Array} nearbyUsers - Array of nearby user objects
 * @returns {Promise<void>}
 */
export const createVerificationRequest = async (markerId, markerData, nearbyUsers) => {
  try {
    // Store verification request in Firestore
    const verificationRef = collection(db, 'verification_requests');
    const verificationDoc = await addDoc(verificationRef, {
      markerId,
      markerData,
      requestedBy: auth.currentUser?.uid,
      notifiedUsers: nearbyUsers.map(u => u.userId),
      createdAt: serverTimestamp(),
      status: 'pending',
    });
    
    console.log(`✅ Verification request created: ${verificationDoc.id}`);
    
    // Send local notification to inform about verification request
    await sendLocalNotification(
      '📍 Verification Request Sent',
      `${nearbyUsers.length} nearby users will be notified to verify your safety marker.`,
      { verificationId: verificationDoc.id, markerId }
    );
    
    return verificationDoc.id;
  } catch (error) {
    console.error('Error creating verification request:', error);
    throw error;
  }
};

/**
 * Send verification notification to nearby users
 * @param {string} markerId - Safety marker ID
 * @param {Object} location - Marker location
 * @param {Object} attributes - Safety attributes
 * @returns {Promise<void>}
 */
export const notifyNearbyUsersForVerification = async (markerId, location, attributes) => {
  try {
    // Find nearby users
    const nearbyUsers = await findNearbyUsers(location, 0.5); // 500m radius
    
    if (nearbyUsers.length === 0) {
      console.log('No nearby users found for verification');
      return;
    }
    
    // Create verification request
    await createVerificationRequest(markerId, { location, attributes }, nearbyUsers);
    
    console.log(`✅ Verification notifications queued for ${nearbyUsers.length} users`);
  } catch (error) {
    console.error('Error notifying nearby users:', error);
  }
};

/**
 * Listen for verification requests
 * @param {Function} callback - Callback function when verification request received
 * @returns {Function} Unsubscribe function
 */
export const listenForVerificationRequests = (callback) => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const { data } = notification.request.content;
    
    if (data.type === 'verification_request') {
      callback(data);
    }
  });
  
  return () => subscription.remove();
};
