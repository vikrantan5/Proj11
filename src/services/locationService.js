import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { createSafetyAlert } from './safetyAlertService';
import { isLocationInDangerZone, subscribeToSafetyMarkers, getMarkersByStatus } from './safetyMapService';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_RADIUS_KM = 0.5; // 500 meters

let unsafeMarkersCache = [];
let lastAlertTime = {};
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown between alerts for same zone

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

/**
 * Request location permissions
 * @param {boolean} background - Whether to request background permission
 * @returns {Promise<boolean>} - True if granted
 */
export const requestLocationPermissions = async (background = false) => {
  try {
    // Request foreground permission first
    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('Foreground location permission denied');
      return false;
    }

    console.log('✅ Foreground location permission granted');

    // Request background permission if needed
    if (background) {
      const bgPermission = await Location.requestBackgroundPermissionsAsync();
      if (bgPermission.status !== 'granted') {
        console.warn('Background location permission denied');
        return false;
      }
      console.log('✅ Background location permission granted');
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
};

/**
 * Request notification permissions
 * @returns {Promise<boolean>} - True if granted
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
      console.warn('Notification permission denied');
      return false;
    }

    console.log('✅ Notification permission granted');
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get current location
 * @returns {Promise<Object>} - {latitude, longitude}
 */
export const getCurrentLocation = async () => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
};

/**
 * Watch location changes
 * @param {Function} callback - Called with location updates
 * @returns {Promise<Object>} - Subscription object with remove() method
 */
export const watchLocation = async (callback) => {
  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds
        distanceInterval: 50, // Or every 50 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );
    
    return subscription;
  } catch (error) {
    console.error('Error watching location:', error);
    throw error;
  }
};

/**
 * Send local notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 */
export const sendLocalNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // Send immediately
    });
    console.log('✅ Notification sent:', title);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

/**
 * Check if location is in danger zone and send alert if needed
 * @param {Object} location - {latitude, longitude}
 * @param {Array} unsafeMarkers - Array of unsafe markers
 */
const checkDangerZone = async (location, unsafeMarkers) => {
  const dangerZone = isLocationInDangerZone(location, unsafeMarkers, GEOFENCE_RADIUS_KM);
  
  if (dangerZone) {
    const zoneKey = `${dangerZone.id}`;
    const now = Date.now();
    
    // Check if we've recently alerted for this zone (cooldown)
    if (lastAlertTime[zoneKey] && (now - lastAlertTime[zoneKey]) < ALERT_COOLDOWN_MS) {
      console.log('Alert cooldown active for zone:', zoneKey);
      return;
    }
    
    lastAlertTime[zoneKey] = now;
    
    // Send notification
    await sendLocalNotification(
      '⚠️ Unsafe Area Detected',
      `You are ${(dangerZone.distance * 1000).toFixed(0)}m from an unsafe zone. ${dangerZone.note || 'Please stay cautious.'}`,
      { type: 'danger_zone', markerId: dangerZone.id }
    );
    
    // Create safety alert record
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
    } catch (error) {
      console.error('Error creating safety alert:', error);
    }
  }
};

/**
 * Initialize background location monitoring
 * Note: This requires expo-task-manager which may not work in Expo Go
 * For production, this would need a development build
 */
export const startBackgroundLocationTracking = async () => {
  try {
    console.log('Starting background location tracking...');
    
    // Check permissions
    const hasPermissions = await requestLocationPermissions(true);
    if (!hasPermissions) {
      throw new Error('Location permissions not granted');
    }
    
    const hasNotifPermissions = await requestNotificationPermissions();
    if (!hasNotifPermissions) {
      console.warn('Notification permissions not granted - alerts may not work');
    }
    
    // Load unsafe markers into cache
    const markers = await getMarkersByStatus('unsafe');
    unsafeMarkersCache = markers;
    console.log(`Loaded ${unsafeMarkersCache.length} unsafe markers`);
    
    // Subscribe to marker updates
    subscribeToSafetyMarkers((markers) => {
      unsafeMarkersCache = markers.filter(m => m.status === 'unsafe');
      console.log(`Updated unsafe markers cache: ${unsafeMarkersCache.length} markers`);
    });
    
    console.log('✅ Background location tracking initialized');
    console.log('⚠️ Note: Full background tracking requires a development build, not available in Expo Go');
    
    return true;
  } catch (error) {
    console.error('Error starting background location tracking:', error);
    return false;
  }
};

/**
 * Start foreground location monitoring (works in Expo Go)
 * @param {Function} onDangerDetected - Callback when danger zone entered
 * @returns {Promise<Object>} - Subscription object
 */
export const startForegroundLocationMonitoring = async (onDangerDetected) => {
  try {
    console.log('Starting foreground location monitoring...');
    
    // Check permissions
    const hasPermissions = await requestLocationPermissions(false);
    if (!hasPermissions) {
      throw new Error('Location permissions not granted');
    }
    
    const hasNotifPermissions = await requestNotificationPermissions();
    if (!hasNotifPermissions) {
      console.warn('Notification permissions not granted - alerts may not work');
    }
    
    // Load unsafe markers into cache
    const markers = await getMarkersByStatus('unsafe');
    unsafeMarkersCache = markers;
    console.log(`Loaded ${unsafeMarkersCache.length} unsafe markers`);
    
    // Subscribe to marker updates
    const unsubscribeMarkers = subscribeToSafetyMarkers((markers) => {
      unsafeMarkersCache = markers.filter(m => m.status === 'unsafe');
      console.log(`Updated unsafe markers cache: ${unsafeMarkersCache.length} markers`);
    });
    
    // Watch location and check for danger zones
    const locationSubscription = await watchLocation(async (location) => {
      await checkDangerZone(location, unsafeMarkersCache);
      if (onDangerDetected) {
        const dangerZone = isLocationInDangerZone(location, unsafeMarkersCache, GEOFENCE_RADIUS_KM);
        if (dangerZone) {
          onDangerDetected(dangerZone);
        }
      }
    });
    
    console.log('✅ Foreground location monitoring started');
    
    return {
      remove: () => {
        locationSubscription.remove();
        unsubscribeMarkers();
        console.log('Location monitoring stopped');
      }
    };
  } catch (error) {
    console.error('Error starting foreground location monitoring:', error);
    throw error;
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
      console.log('✅ Background location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping background location tracking:', error);
  }
};
