import { Platform } from 'react-native';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { calculateDistance } from './safetyMapService';

// Safely import expo-notifications (crashes in Expo Go SDK 53+)
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications not available:', e.message);
}

// Configure notification handler safely
try {
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  console.warn('Failed to configure notification handler:', e.message);
}

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  try {
    if (!Notifications) {
      console.warn('Notifications not available');
      return false;
    }

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
    
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('safety-alerts', {
          name: 'Safety Alerts',
          importance: Notifications.AndroidImportance?.MAX || 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        
        await Notifications.setNotificationChannelAsync('verification-requests', {
          name: 'Verification Requests',
          importance: Notifications.AndroidImportance?.DEFAULT || 3,
          vibrationPattern: [0, 250, 250, 250],
        });
      } catch (channelError) {
        console.warn('Failed to create notification channels:', channelError.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get Expo push token for the device
 */
export const getPushToken = async () => {
  try {
    if (!Notifications) {
      console.warn('Notifications not available - cannot get push token');
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }
    
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);
    return token;
  } catch (error) {
    console.warn('Error getting push token:', error.message);
    return null;
  }
};

/**
 * Send local notification
 */
export const sendLocalNotification = async (title, body, data = {}) => {
  try {
    if (!Notifications) {
      console.warn('Notifications not available - skipping:', title);
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH,
      },
      trigger: null,
    });
    
    return notificationId;
  } catch (error) {
    console.warn('Error sending local notification:', error.message);
    return null;
  }
};

/**
 * Find nearby users within radius
 */
export const findNearbyUsers = async (location, radiusKm = 0.5) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('pushToken', '!=', null));
    const querySnapshot = await getDocs(q);
    
    const nearbyUsers = [];
    const currentUser = auth.currentUser;
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      
      if (doc.id === currentUser?.uid) return;
      
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
    
    console.log(`Found ${nearbyUsers.length} nearby users within ${radiusKm}km`);
    return nearbyUsers;
  } catch (error) {
    console.error('Error finding nearby users:', error);
    return [];
  }
};

/**
 * Create verification request for nearby users
 */
export const createVerificationRequest = async (markerId, markerData, nearbyUsers) => {
  try {
    const verificationRef = collection(db, 'verification_requests');
    const verificationDoc = await addDoc(verificationRef, {
      markerId,
      markerData,
      requestedBy: auth.currentUser?.uid,
      notifiedUsers: nearbyUsers.map(u => u.userId),
      createdAt: serverTimestamp(),
      status: 'pending',
    });
    
    console.log(`Verification request created: ${verificationDoc.id}`);
    
    await sendLocalNotification(
      'Verification Request Sent',
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
 */
export const notifyNearbyUsersForVerification = async (markerId, location, attributes) => {
  try {
    const nearbyUsers = await findNearbyUsers(location, 0.5);
    
    if (nearbyUsers.length === 0) {
      console.log('No nearby users found for verification');
      return;
    }
    
    await createVerificationRequest(markerId, { location, attributes }, nearbyUsers);
    
    console.log(`Verification notifications queued for ${nearbyUsers.length} users`);
  } catch (error) {
    console.error('Error notifying nearby users:', error);
  }
};

/**
 * Listen for verification requests
 */
export const listenForVerificationRequests = (callback) => {
  if (!Notifications) {
    console.warn('Notifications not available - cannot listen for verification requests');
    return () => {};
  }

  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const { data } = notification.request.content;
    
    if (data.type === 'verification_request') {
      callback(data);
    }
  });
  
  return () => subscription.remove();
};
