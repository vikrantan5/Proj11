import { db, auth } from '@/config/firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  increment,
  getDoc,
} from 'firebase/firestore';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Analytics Event Types
 */
export const ANALYTICS_EVENTS = {
  APP_INSTALLED: 'APP_INSTALLED',
  APP_OPENED: 'APP_OPENED',
  USER_REGISTERED: 'USER_REGISTERED',
  SOS_TRIGGERED: 'SOS_TRIGGERED',
  LOUD_ALARM_TRIGGERED: 'LOUD_ALARM_TRIGGERED',
  USER_LOGIN: 'USER_LOGIN',
  EMERGENCY_CONTACT_ADDED: 'EMERGENCY_CONTACT_ADDED',
  FAKE_CALL_USED: 'FAKE_CALL_USED',
};

/**
 * Get device information
 */
const getDeviceInfo = () => {
  return {
    deviceType: Device.deviceType,
    deviceName: Device.deviceName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    platform: Platform.OS,
    modelName: Device.modelName,
    brand: Device.brand,
  };
};

/**
 * Track an analytics event
 * @param {string} eventType - Type of event from ANALYTICS_EVENTS
 * @param {Object} metadata - Additional event data
 */
export const trackEvent = async (eventType, metadata = {}) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('⚠️ No user logged in, skipping analytics event');
      return null;
    }

    const eventData = {
      eventType,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      timestamp: serverTimestamp(),
      deviceInfo: getDeviceInfo(),
      metadata: metadata || {},
    };

    // Add event to analytics_events collection
    const eventRef = await addDoc(collection(db, 'analytics_events'), eventData);
    
    // Update daily summary
    await updateDailySummary(eventType);

    // Update user last active
    await updateUserLastActive(currentUser.uid);

    console.log(`✅ Analytics event tracked: ${eventType}`);
    return eventRef.id;
  } catch (error) {
    console.error('❌ Error tracking analytics event:', error);
    // Don't throw error - analytics should not break app functionality
    return null;
  }
};

/**
 * Update daily summary aggregates
 * @param {string} eventType
 */
const updateDailySummary = async (eventType) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const summaryRef = doc(db, 'analytics_summary', today);

    const updateData = {
      date: today,
      lastUpdated: serverTimestamp(),
    };

    // Increment specific counters based on event type
    switch (eventType) {
      case ANALYTICS_EVENTS.APP_INSTALLED:
        updateData.appInstalls = increment(1);
        break;
      case ANALYTICS_EVENTS.APP_OPENED:
        updateData.appOpens = increment(1);
        break;
      case ANALYTICS_EVENTS.USER_REGISTERED:
        updateData.newUsers = increment(1);
        break;
      case ANALYTICS_EVENTS.SOS_TRIGGERED:
        updateData.sosActivations = increment(1);
        break;
      case ANALYTICS_EVENTS.LOUD_ALARM_TRIGGERED:
        updateData.alarmActivations = increment(1);
        break;
      case ANALYTICS_EVENTS.USER_LOGIN:
        updateData.logins = increment(1);
        break;
      default:
        break;
    }

    await setDoc(summaryRef, updateData, { merge: true });
  } catch (error) {
    console.error('Error updating daily summary:', error);
  }
};

/**
 * Update user's last active timestamp
 * @param {string} userId
 */
const updateUserLastActive = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      lastActive: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user last active:', error);
  }
};

/**
 * Track app installation (call this on first launch)
 */
export const trackAppInstall = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || !userDoc.data().installDate) {
      await updateDoc(userRef, {
        installDate: serverTimestamp(),
      });
      await trackEvent(ANALYTICS_EVENTS.APP_INSTALLED);
    }
  } catch (error) {
    console.error('Error tracking app install:', error);
  }
};

/**
 * Track SOS activation
 * @param {Object} sosResult - Result from SOS trigger
 */
export const trackSOSActivation = async (sosResult) => {
  return trackEvent(ANALYTICS_EVENTS.SOS_TRIGGERED, {
    success: sosResult.success,
    smsSent: sosResult.sms?.success,
    callMade: sosResult.call?.success,
    photoUploaded: !!sosResult.imageUrl,
    contactsCount: sosResult.contactsCount,
  });
};

/**
 * Track Loud Alarm activation
 */
export const trackAlarmActivation = async () => {
  return trackEvent(ANALYTICS_EVENTS.LOUD_ALARM_TRIGGERED, {
    triggeredAt: new Date().toISOString(),
  });
};
