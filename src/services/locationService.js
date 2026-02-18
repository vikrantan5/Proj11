import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { createSafetyAlert } from './safetyAlertService';
import { isLocationInDangerZone, subscribeToSafetyMarkers, getMarkersByStatus } from './safetyMapService';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_RADIUS_KM = 0.5;
const PERMISSION_REQUEST_DELAY = 1500; // Increased delay for Android
const LOCATION_TIMEOUT_MS = 15000;

let unsafeMarkersCache = [];
let lastAlertTime = {};
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

// ✅ Configure notifications safely
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

/**
 * ✅ FIXED: Create notification channels for Android 8+
 * CRITICAL for location monitoring to work in release builds
 */
export const createNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    try {
      // Safety alerts channel (HIGH priority)
      await Notifications.setNotificationChannelAsync('safety-alerts', {
        name: 'Safety Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // Location service channel (LOW priority for background)
      await Notifications.setNotificationChannelAsync('location-service', {
        name: 'Location Monitoring',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        vibrationPattern: [0],
        showBadge: false,
      });

      console.log('✅ Notification channels created successfully');
      return true;
    } catch (error) {
      console.error('⚠️ Failed to create notification channels:', error);
      // Don't crash, just log
      return false;
    }
  }
  return true;
};

/**
 * ✅ FIXED: Request location permissions with proper delays
 * Prevents Android crash from rapid permission requests
 */
export const requestLocationPermissions = async (background = false) => {
  try {
    console.log('🔐 Requesting location permissions...');
    
    // Check current permission status first
    const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
    
    if (currentStatus === 'granted') {
      console.log('✅ Foreground location permission already granted');
      
      if (background) {
        // Add delay before requesting background permission
        await new Promise(resolve => setTimeout(resolve, PERMISSION_REQUEST_DELAY));
        
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
          console.log('✅ Background location permission already granted');
          return true;
        }
        
        // Request background permission
        const bgPermission = await Location.requestBackgroundPermissionsAsync();
        if (bgPermission.status !== 'granted') {
          console.warn('⚠️ Background location permission denied');
          return false;
        }
        console.log('✅ Background location permission granted');
      }
      
      return true;
    }
    
    // Request foreground permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('⚠️ Foreground location permission denied');
      return false;
    }

    console.log('✅ Foreground location permission granted');

    // Request background permission if needed (with delay)
    if (background) {
      await new Promise(resolve => setTimeout(resolve, PERMISSION_REQUEST_DELAY));
      
      const bgPermission = await Location.requestBackgroundPermissionsAsync();
      if (bgPermission.status !== 'granted') {
        console.warn('⚠️ Background location permission denied');
        return false;
      }
      console.log('✅ Background location permission granted');
    }

    return true;
  } catch (error) {
    console.error('❌ Error requesting location permissions:', error);
    // Don't crash - return false instead
    return false;
  }
};

/**
 * ✅ FIXED: Request notification permissions with error handling
 */
export const requestNotificationPermissions = async () => {
  try {
    // Create notification channels first (Android 8+)
    await createNotificationChannels();
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      return false;
    }

    console.log('✅ Notification permission granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    // Don't crash - return false instead
    return false;
  }
};

/**
 * ✅ FIXED: Get current location with timeout and retry
 * @returns {Promise<Object>} - {latitude, longitude}
 */
export const getCurrentLocation = async () => {
  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📍 Getting current location (attempt ${attempt}/${maxRetries})...`);
      
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        throw new Error('Location services are disabled. Please enable GPS.');
      }
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Location request timeout')), LOCATION_TIMEOUT_MS)
      );
      
      // Create location promise
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: attempt === 1 ? Location.Accuracy.High : Location.Accuracy.Balanced,
        maximumAge: 10000, // Accept cached location up to 10 seconds old
        timeout: LOCATION_TIMEOUT_MS,
      });
      
      // Race between timeout and location
      const location = await Promise.race([locationPromise, timeoutPromise]);
      
      // Validate location data
      if (!location || !location.coords) {
        throw new Error('Invalid location data received');
      }
      
      const { latitude, longitude } = location.coords;
      
      // Validate coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Invalid coordinate values');
      }
      
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Coordinates out of valid range');
      }
      
      console.log(`✅ Location obtained: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      
      return { latitude, longitude };
      
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Location attempt ${attempt} failed:`, error.message);
      
      // Don't retry on permission errors
      if (error.message && error.message.includes('permission')) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // All retries failed
  console.error('❌ Failed to get location after all retries:', lastError);
  throw lastError || new Error('Unable to get current location');
};

/**
 * ✅ FIXED: Watch location changes with comprehensive error handling
 */
export const watchLocation = async (callback) => {
  try {
    // Validate callback
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    console.log('👁️ Starting location watch...');
    
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds
        distanceInterval: 50, // Or every 50 meters
      },
      (location) => {
        try {
          // Validate location before callback
          if (!location || !location.coords) {
            console.warn('⚠️ Invalid location in watch callback');
            return;
          }
          
          const { latitude, longitude } = location.coords;
          
          // Validate coordinates
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            console.warn('⚠️ Invalid coordinate types in watch');
            return;
          }
          
          // Call user callback with validated data
          callback({ latitude, longitude });
          
        } catch (callbackError) {
          console.error('❌ Error in location callback:', callbackError);
          // Don't crash, just log the error
        }
      }
    );
    
    console.log('✅ Location watch started successfully');
    return subscription;
    
  } catch (error) {
    console.error('❌ Error watching location:', error);
    throw error;
  }
};

/**
 * ✅ FIXED: Send local notification with error handling
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
        ...(Platform.OS === 'android' && {
          channelId: 'safety-alerts', // Use our custom channel
        }),
      },
      trigger: null, // Send immediately
    });
    console.log('✅ Notification sent:', title);
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    // Don't crash - notifications are nice-to-have
  }
};

/**
 * ✅ FIXED: Check danger zone with null safety
 */
const checkDangerZone = async (location, unsafeMarkers) => {
  try {
    // Validate inputs
    if (!location || !location.latitude || !location.longitude) {
      console.warn('⚠️ Invalid location for danger zone check');
      return;
    }
    
    if (!Array.isArray(unsafeMarkers) || unsafeMarkers.length === 0) {
      // No unsafe markers to check
      return;
    }
    
    const dangerZone = isLocationInDangerZone(location, unsafeMarkers, GEOFENCE_RADIUS_KM);
    
    if (!dangerZone) {
      // Not in danger zone
      return;
    }
    
    const zoneKey = `${dangerZone.id}`;
    const now = Date.now();
    
    // Check cooldown
    if (lastAlertTime[zoneKey] && (now - lastAlertTime[zoneKey]) < ALERT_COOLDOWN_MS) {
      console.log('⏳ Alert cooldown active for zone:', zoneKey);
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
    } catch (alertError) {
      console.error('⚠️ Error creating safety alert:', alertError);
      // Don't crash if alert creation fails
    }
  } catch (error) {
    console.error('❌ Error checking danger zone:', error);
    // Don't crash - this is a background operation
  }
};

/**
 * ✅ FIXED: Start foreground location monitoring (CRASH-PROOF)
 * This is the main function that was causing crashes
 */
export const startForegroundLocationMonitoring = async (onDangerDetected) => {
  let locationSubscription = null;
  let unsubscribeMarkers = null;
  
  try {
    console.log('🚀 Starting foreground location monitoring...');
    
    // Step 1: Check permissions (with delay to prevent crash)
    const hasPermissions = await requestLocationPermissions(false);
    if (!hasPermissions) {
      console.warn('⚠️ Location permissions not granted');
      // Return dummy subscription instead of crashing
      return {
        remove: () => {
          console.log('🛑 No monitoring to stop (permissions denied)');
        }
      };
    }
    
    // Step 2: Add delay before requesting notification permissions
    // This prevents Android from crashing due to rapid permission requests
    console.log('⏳ Waiting before requesting notification permissions...');
    await new Promise(resolve => setTimeout(resolve, PERMISSION_REQUEST_DELAY));
    
    // Step 3: Request notification permissions (wrapped in try-catch)
    try {
      const hasNotifPermissions = await requestNotificationPermissions();
      if (!hasNotifPermissions) {
        console.warn('⚠️ Notification permissions not granted - alerts may not work');
        // Continue anyway - notifications are optional
      }
    } catch (notifError) {
      console.warn('⚠️ Failed to request notification permissions:', notifError);
      // Don't crash if notification permissions fail
    }
    
    // Step 4: Load unsafe markers (with error handling)
    try {
      const markers = await getMarkersByStatus('unsafe');
      unsafeMarkersCache = Array.isArray(markers) ? markers : [];
      console.log(`✅ Loaded ${unsafeMarkersCache.length} unsafe markers`);
    } catch (markerError) {
      console.error('⚠️ Failed to load unsafe markers:', markerError);
      unsafeMarkersCache = [];
      // Continue even if markers can't be loaded
    }
    
    // Step 5: Subscribe to marker updates (with error handling)
    try {
      unsubscribeMarkers = subscribeToSafetyMarkers((markers) => {
        try {
          if (!Array.isArray(markers)) {
            console.warn('⚠️ Invalid markers received in subscription');
            return;
          }
          unsafeMarkersCache = markers.filter(m => m && m.status === 'unsafe');
          console.log(`✅ Updated unsafe markers cache: ${unsafeMarkersCache.length} markers`);
        } catch (filterError) {
          console.error('⚠️ Error filtering markers:', filterError);
          unsafeMarkersCache = [];
        }
      });
    } catch (subscribeError) {
      console.error('⚠️ Failed to subscribe to markers:', subscribeError);
      unsubscribeMarkers = () => {}; // Dummy unsubscribe
    }
    
    // Step 6: Add delay before starting location watching
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 7: Watch location and check for danger zones (with comprehensive error handling)
    try {
      locationSubscription = await watchLocation(async (location) => {
        try {
          // Check danger zone
          await checkDangerZone(location, unsafeMarkersCache);
          
          // Call user callback if provided
          if (onDangerDetected && typeof onDangerDetected === 'function') {
            try {
              const dangerZone = isLocationInDangerZone(location, unsafeMarkersCache, GEOFENCE_RADIUS_KM);
              if (dangerZone) {
                onDangerDetected(dangerZone);
              }
            } catch (callbackError) {
              console.error('⚠️ Error in danger detected callback:', callbackError);
            }
          }
        } catch (checkError) {
          console.error('⚠️ Error checking danger zone:', checkError);
          // Don't crash, just log the error
        }
      });
    } catch (watchError) {
      console.error('⚠️ Failed to start location watching:', watchError);
      // Return a subscription object even if watching fails
      return {
        remove: () => {
          if (unsubscribeMarkers) {
            try {
              unsubscribeMarkers();
            } catch (e) {
              console.error('⚠️ Error unsubscribing markers:', e);
            }
          }
          console.log('🛑 Partial monitoring stopped');
        }
      };
    }
    
    console.log('✅ Foreground location monitoring started successfully');
    
    // Return subscription object
    return {
      remove: () => {
        try {
          if (locationSubscription) {
            locationSubscription.remove();
            console.log('🛑 Location subscription removed');
          }
          if (unsubscribeMarkers) {
            unsubscribeMarkers();
            console.log('🛑 Markers subscription removed');
          }
          console.log('✅ Location monitoring stopped');
        } catch (removeError) {
          console.error('⚠️ Error stopping monitoring:', removeError);
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Critical error starting foreground location monitoring:', error);
    
    // Return a safe object instead of crashing
    return {
      remove: () => {
        try {
          if (locationSubscription) locationSubscription.remove();
          if (unsubscribeMarkers) unsubscribeMarkers();
        } catch (e) {
          console.error('⚠️ Error in cleanup:', e);
        }
      }
    };
  }
};

/**
 * Initialize background location tracking
 */
export const startBackgroundLocationTracking = async () => {
  try {
    console.log('🌙 Starting background location tracking...');
    
    const hasPermissions = await requestLocationPermissions(true);
    if (!hasPermissions) {
      throw new Error('Location permissions not granted');
    }
    
    const hasNotifPermissions = await requestNotificationPermissions();
    if (!hasNotifPermissions) {
      console.warn('⚠️ Notification permissions not granted - alerts may not work');
    }
    
    const markers = await getMarkersByStatus('unsafe');
    unsafeMarkersCache = markers;
    console.log(`✅ Loaded ${unsafeMarkersCache.length} unsafe markers`);
    
    subscribeToSafetyMarkers((markers) => {
      unsafeMarkersCache = markers.filter(m => m.status === 'unsafe');
      console.log(`✅ Updated unsafe markers cache: ${unsafeMarkersCache.length} markers`);
    });
    
    console.log('✅ Background location tracking initialized');
    console.log('⚠️ Note: Full background tracking requires a development build');
    
    return true;
  } catch (error) {
    console.error('❌ Error starting background location tracking:', error);
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
      console.log('✅ Background location tracking stopped');
    }
  } catch (error) {
    console.error('❌ Error stopping background location tracking:', error);
  }
};
