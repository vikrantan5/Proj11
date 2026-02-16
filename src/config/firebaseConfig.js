import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import ENV from './env';

// Firebase configuration
const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID,
  measurementId: ENV.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App (only once)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
} else {
  app = getApp();
  console.log('Using existing Firebase app instance');
}

// Initialize Auth with robust error handling
let auth;
try {
  // For React Native (Android/iOS), use AsyncStorage persistence
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      console.log('Firebase Auth initialized for React Native with AsyncStorage');
    } catch (error) {
      // If already initialized, get the existing instance
      if (error.code === 'auth/already-initialized') {
        auth = getAuth(app);
        console.log('Using existing Firebase Auth instance');
      } else {
        throw error;
      }
    }
  } else {
    // For web platform
    auth = getAuth(app);
    console.log('Firebase Auth initialized for Web');
  }
} catch (error) {
  console.error('Firebase Auth initialization error:', error);
  // Fallback: try to get existing auth instance
  try {
    auth = getAuth(app);
    console.log('Fallback: Retrieved existing Auth instance');
  } catch (fallbackError) {
    console.error('Fatal: Could not initialize Firebase Auth:', fallbackError);
    throw new Error('Firebase Authentication could not be initialized. Please check your Firebase configuration.');
  }
}

// Initialize Firestore with React Native optimized settings
let db;
try {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    // For React Native: Initialize with offline persistence and cache settings
    db = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: true // Use long polling for better mobile compatibility
    });
    console.log('Firestore initialized for React Native with offline support');
  } else {
    // For Web: Use standard initialization
    db = getFirestore(app);
    console.log('Firestore initialized for Web');
  }
} catch (error) {
  // If Firestore is already initialized, get existing instance
  if (error.code === 'failed-precondition') {
    db = getFirestore(app);
    console.log('Using existing Firestore instance');
  } else {
    console.error('Firestore initialization error:', error);
    console.error('Please make sure Firestore is enabled in Firebase Console:');
    console.error('1. Go to Firebase Console > Firestore Database');
    console.error('2. Click "Create database"');
    console.error('3. Choose "Start in production mode" or "Start in test mode"');
    throw new Error('Firestore could not be initialized. Please enable Firestore Database in Firebase Console.');
  }
}

// Verify auth is properly initialized
if (!auth) {
  throw new Error('Firebase Auth is not initialized. Please check your Firebase Console settings and ensure Email/Password authentication is enabled.');
}

// Initialize Firebase Storage
let storage;
try {
  storage = getStorage(app);
  console.log('Firebase Storage initialized successfully');
} catch (error) {
  console.error('Firebase Storage initialization error:', error);
  console.warn('Storage features may not be available');
}

export { auth, db, storage };
export default app;
