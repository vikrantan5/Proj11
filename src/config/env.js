/**
 * Environment Configuration Helper
 * This file provides a centralized way to access environment variables
 * Works with both Expo (using Constants.expoConfig.extra) and web environments
 */

import Constants from 'expo-constants';

// Helper function to get environment variables
const getEnvVar = (key, fallback = '') => {
  // Try to get from expo config extra first
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // Fallback to process.env for web
  if (process.env[key]) {
    return process.env[key];
  }
  
  // Log warning if not found
  if (!fallback) {
    console.warn(`Environment variable ${key} is not defined`);
  }
  
  return fallback;
};

// Export all environment variables
export const ENV = {
  // Firebase Configuration
  FIREBASE_API_KEY: getEnvVar('firebaseApiKey') || process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: getEnvVar('firebaseAuthDomain') || process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: getEnvVar('firebaseProjectId') || process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: getEnvVar('firebaseStorageBucket') || process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: getEnvVar('firebaseMessagingSenderId') || process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: getEnvVar('firebaseAppId') || process.env.FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID: getEnvVar('firebaseMeasurementId') || process.env.FIREBASE_MEASUREMENT_ID,
  
  // Google Maps API Key
  GOOGLE_MAPS_API_KEY: getEnvVar('googleMapsApiKey') || process.env.GOOGLE_MAPS_API_KEY,
  
  // Razorpay Configuration
  RAZORPAY_KEY_ID: getEnvVar('razorpayKeyId') || process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: getEnvVar('razorpayKeySecret') || process.env.RAZORPAY_KEY_SECRET,
};

export default ENV;
