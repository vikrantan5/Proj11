import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Save user details to Firestore
 * @param {string} uid - User ID from Firebase Auth
 * @param {Object} userData - User data object
 * @returns {Promise<void>}
 */
export const saveUserDetails = async (uid, userData) => {
  try {
    console.log('💾 Attempting to save user details to Firestore...');
    console.log('UID:', uid);
    console.log('Data:', userData);
    
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      name: userData.name,
      address: userData.address,
      occupation: userData.occupation,
      emergencyContacts: userData.emergencyContacts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log('✅ User details saved successfully to Firestore!');
  } catch (error) {
    console.error('❌ Error saving user details:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'unavailable') {
      throw new Error('Cannot connect to Firestore. Please check your internet connection and ensure Firestore is enabled in Firebase Console.');
    } else if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore security rules.');
    }
    
    throw error;
  }
};

/**
 * Get user details from Firestore
 * @param {string} uid - User ID from Firebase Auth
 * @returns {Promise<Object|null>}
 */
export const getUserDetails = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.log('User details retrieved successfully');
      return userSnap.data();
    } else {
      console.log('No user details found for uid:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error getting user details:', error);
    
    // Handle offline/connection errors gracefully
    if (error.code === 'unavailable') {
      console.warn('Firestore unavailable - user may be offline or Firestore not enabled');
      return null; // Return null instead of throwing to allow app to continue
    } else if (error.code === 'permission-denied') {
      console.error('Permission denied when fetching user details');
      return null;
    }
    
    // For other errors, return null to allow graceful degradation
    return null;
  }
};

/**
 * Update user details in Firestore
 * @param {string} uid - User ID from Firebase Auth
 * @param {Object} userData - User data object to update
 * @returns {Promise<void>}
 */
export const updateUserDetails = async (uid, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...userData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('User details updated successfully');
  } catch (error) {
    console.error('Error updating user details:', error);
    
    // Provide helpful error messages
    if (error.code === 'unavailable') {
      throw new Error('Cannot connect to Firestore. Please check your internet connection.');
    } else if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore security rules.');
    }
    
    throw error;
  }
};

/**
 * Set user role (admin or user)
 * @param {string} uid - User ID from Firebase Auth
 * @param {string} role - Role ('admin' or 'user')
 * @returns {Promise<void>}
 */
export const setUserRole = async (uid, role) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      role: role,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('User role updated successfully to:', role);
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
};
