import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { createSafetyAlert } from './safetyAlertService';
import { isLocationInDangerZone, subscribeToSafetyMarkers, getMarkersByStatus } from './safetyMapService';

// Safely import expo-notifications (crashes in Expo Go SDK 53+)
let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications not available:', e.message);
}

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_RADIUS_KM = 0.5;
const PERMISSION_REQUEST_DELAY = 1500;
const LOCATION_TIMEOUT_MS = 15000;

let unsafeMarkersCache = [];
let lastAlertTime = {};
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

// Configure notifications safely (wrapped in try-catch for Expo Go)
try {
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH,
      }),
    });
  }
} catch (e) {
  console.warn('Failed to configure notification handler:', e.message);
}

/**
 * Create notification channels for Android 8+
 */
export const createNotificationChannels = async () => {
  if (Platform.OS === 'android' && Notifications) {
    try {
      await Notifications.setNotificationChannelAsync('safety-alerts', {
        name: 'Safety Alerts',
        importance: Notifications.AndroidImportance?.HIGH || 4,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('location-service', {
        name: 'Location Monitoring',
        importance: Notifications.AndroidImportance?.LOW || 2,
        sound: null,
        vibrationPattern: [0],
        showBadge: false,
      });

      console.log('Notification channels created successfully');
      return true;
    } catch (error) {
      console.warn('Failed to create notification channels:', error.message);
      return false;
    }
  }
  return true;
};

/**
 * Request location permissions with proper delays
 */
export const requestLocationPermissions = async (background = false) => {
  try {
    console.log('Requesting location permissions...');
    
    const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
    
    if (currentStatus === 'granted') {
      console.log('Foreground location permission already granted');
      
      if (background) {
        await new Promise(resolve => setTimeout(resolve, PERMISSION_REQUEST_DELAY));
        
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
          console.log('Background location permission already granted');
          return true;
        }
        
        const bgPermission = await Location.requestBackgroundPermissionsAsync();
        if (bgPermission.status !== 'granted') {
          console.warn('Background location permission denied');
          return false;
        }
        console.log('Background location permission granted');
      }
      
      return true;
    }
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('Foreground location permission denied');
      return false;
    }

    console.log('Foreground location permission granted');

    if (background) {
      await new Promise(resolve => setTimeout(resolve, PERMISSION_REQUEST_DELAY));
      
      const bgPermission = await Location.requestBackgroundPermissionsAsync();
      if (bgPermission.status !== 'granted') {
        console.warn('Background location permission denied');
        return false;
      }
      console.log('Background location permission granted');
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
};

/**
 * Request notification permissions with error handling
 */
export const requestNotificationPermissions = async () => {
  try {
    if (!Notifications) {
      console.warn('Notifications not available - skipping permission request');
      return false;
    }

    await createNotificationChannels();
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    console.log('Notification permission granted');
    return true;
  } catch (error) {
    console.warn('Error requesting notification permissions:', error.message);
    return false;
  }
};

/**
 * Get current location with timeout and retry
 */
export const getCurrentLocation = async () => {
  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Getting current location (attempt ${attempt}/${maxRetries})...`);
      
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        throw new Error('Location services are disabled. Please enable GPS.');
      }
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Location request timeout')), LOCATION_TIMEOUT_MS)
      );
      
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: attempt === 1 ? Location.Accuracy.High : Location.Accuracy.Balanced,
        maximumAge: 10000,
        timeout: LOCATION_TIMEOUT_MS,
      });
      
      const location = await Promise.race([locationPromise, timeoutPromise]);
      
      if (!location || !location.coords) {
        throw new Error('Invalid location data received');
      }
      
      const { latitude, longitude } = location.coords;
      
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Invalid coordinate values');
      }
      
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Coordinates out of valid range');
      }
      
      console.log(`Location obtained: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      
      return { latitude, longitude };
      
    } catch (error) {
      lastError = error;
      console.warn(`Location attempt ${attempt} failed:`, error.message);
      
      if (error.message && error.message.includes('permission')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  console.error('Failed to get location after all retries:', lastError);
  throw lastError || new Error('Unable to get current location');
};

/**
 * Watch location changes
 */
export const watchLocation = async (callback) => {
  try {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    console.log('Starting location watch...');
    
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 50,
      },
      (location) => {
        try {
          if (!location || !location.coords) {
            console.warn('Invalid location in watch callback');
            return;
          }
          
          const { latitude, longitude } = location.coords;
          
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            console.warn('Invalid coordinate types in watch');
            return;
          }
          
          callback({ latitude, longitude });
          
        } catch (callbackError) {
          console.error('Error in location callback:', callbackError);
        }
      }
    );
    
    console.log('Location watch started successfully');
    return subscription;
    
  } catch (error) {
    console.error('Error watching location:', error);
    throw error;
  }
};

/**
 * Send local notification with error handling
 */
export const sendLocalNotification = async (title, body, data = {}) => {
  try {
    if (!Notifications) {
      console.warn('Notifications not available - skipping notification:', title);
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH,
        vibrate: [0, 250, 250, 250],
        ...(Platform.OS === 'android' && {
          channelId: 'safety-alerts',
        }),
      },
      trigger: null,
    });
    console.log('Notification sent:', title);
  } catch (error) {
    console.warn('Error sending notification:', error.message);
  }
};

/**
 * Check danger zone with null safety
 */
const checkDangerZone = async (location, unsafeMarkers) => {
  try {
    if (!location || !location.latitude || !location.longitude) {
      return;
    }
    
    if (!Array.isArray(unsafeMarkers) || unsafeMarkers.length === 0) {
      return;
    }
    
    const dangerZone = isLocationInDangerZone(location, unsafeMarkers, GEOFENCE_RADIUS_KM);
    
    if (!dangerZone) {
      return;
    }
    
    const zoneKey = `${dangerZone.id}`;
    const now = Date.now();
    
    if (lastAlertTime[zoneKey] && (now - lastAlertTime[zoneKey]) < ALERT_COOLDOWN_MS) {
      return;
    }
    
    lastAlertTime[zoneKey] = now;
    
    await sendLocalNotification(
      'Unsafe Area Detected',
      `You are ${(dangerZone.distance * 1000).toFixed(0)}m from an unsafe zone. ${dangerZone.note || 'Please stay cautious.'}`,
      { type: 'danger_zone', markerId: dangerZone.id }
    );
    
    try {
      await createSafetyAlert({
        type: 'Unsafe Zone Entry',
        message: `Entered within ${(dangerZone.distance * 1000).toFixed(0)}m of marked unsafe area`,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: 'Current Location',
        },
        severity: 'high',
      });
    } catch (alertError) {
      console.warn('Error creating safety alert:', alertError.message);
    }
  } catch (error) {
    console.error('Error checking danger zone:', error);
  }
};

/**
 * Start foreground location monitoring (CRASH-PROOF)
 */
export const startForegroundLocationMonitoring = async (onDangerDetected) => {
  let locationSubscription = null;
  let unsubscribeMarkers = null;
  
  try {
    console.log('Starting foreground location monitoring...');
    
    const hasPermissions = await requestLocationPermissions(false);
    if (!hasPermissions) {
      console.warn('Location permissions not granted');
      return {
        remove: () => {
          console.log('No monitoring to stop (permissions denied)');
        }
      };
    }
    
    console.log('Waiting before requesting notification permissions...');
    await new Promise(resolve => setTimeout(resolve, PERMISSION_REQUEST_DELAY));
    
    try {
      const hasNotifPermissions = await requestNotificationPermissions();
      if (!hasNotifPermissions) {
        console.warn('Notification permissions not granted - alerts may not work');
      }
    } catch (notifError) {
      console.warn('Failed to request notification permissions:', notifError.message);
    }
    
    try {
      const markers = await getMarkersByStatus('unsafe');
      unsafeMarkersCache = Array.isArray(markers) ? markers : [];
      console.log(`Loaded ${unsafeMarkersCache.length} unsafe markers`);
    } catch (markerError) {
      console.warn('Failed to load unsafe markers:', markerError.message);
      unsafeMarkersCache = [];
    }
    
    try {
      unsubscribeMarkers = subscribeToSafetyMarkers((markers) => {
        try {
          if (!Array.isArray(markers)) {
            return;
          }
          unsafeMarkersCache = markers.filter(m => m && m.status === 'unsafe');
        } catch (filterError) {
          unsafeMarkersCache = [];
        }
      });
    } catch (subscribeError) {
      console.warn('Failed to subscribe to markers:', subscribeError.message);
      unsubscribeMarkers = () => {};
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      locationSubscription = await watchLocation(async (location) => {
        try {
          await checkDangerZone(location, unsafeMarkersCache);
          
          if (onDangerDetected && typeof onDangerDetected === 'function') {
            try {
              const dangerZone = isLocationInDangerZone(location, unsafeMarkersCache, GEOFENCE_RADIUS_KM);
              if (dangerZone) {
                onDangerDetected(dangerZone);
              }
            } catch (callbackError) {
              console.error('Error in danger detected callback:', callbackError);
            }
          }
        } catch (checkError) {
          console.error('Error checking danger zone:', checkError);
        }
      });
    } catch (watchError) {
      console.warn('Failed to start location watching:', watchError.message);
      return {
        remove: () => {
          if (unsubscribeMarkers) {
            try { unsubscribeMarkers(); } catch (e) {}
          }
        }
      };
    }
    
    console.log('Foreground location monitoring started successfully');
    
    return {
      remove: () => {
        try {
          if (locationSubscription) {
            locationSubscription.remove();
          }
          if (unsubscribeMarkers) {
            unsubscribeMarkers();
          }
          console.log('Location monitoring stopped');
        } catch (removeError) {
          console.warn('Error stopping monitoring:', removeError.message);
        }
      }
    };
    
  } catch (error) {
    console.error('Critical error starting foreground location monitoring:', error);
    
    return {
      remove: () => {
        try {
          if (locationSubscription) locationSubscription.remove();
          if (unsubscribeMarkers) unsubscribeMarkers();
        } catch (e) {}
      }
    };
  }
};

/**
 * Initialize background location tracking
 */
export const startBackgroundLocationTracking = async () => {
  try {
    console.log('Starting background location tracking...');
    
    const hasPermissions = await requestLocationPermissions(true);
    if (!hasPermissions) {
      throw new Error('Location permissions not granted');
    }
    
    const hasNotifPermissions = await requestNotificationPermissions();
    if (!hasNotifPermissions) {
      console.warn('Notification permissions not granted - alerts may not work');
    }
    
    const markers = await getMarkersByStatus('unsafe');
    unsafeMarkersCache = markers;
    console.log(`Loaded ${unsafeMarkersCache.length} unsafe markers`);
    
    subscribeToSafetyMarkers((markers) => {
      unsafeMarkersCache = markers.filter(m => m.status === 'unsafe');
    });
    
    console.log('Background location tracking initialized');
    console.log('Note: Full background tracking requires a development build');
    
    return true;
  } catch (error) {
    console.error('Error starting background location tracking:', error);
    return false;
  }
};

/**
 * Stop background location tracking
 */
export const stopBackgroundLocationTracking = async () => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Background location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping background location tracking:', error);
  }
};
