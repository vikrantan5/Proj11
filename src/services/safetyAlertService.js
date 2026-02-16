import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';

/**
 * Create a new safety alert
 * @param {Object} alertData - Alert data
 * @param {string} alertData.type - Type of alert
 * @param {string} alertData.message - Alert message
 * @param {Object} alertData.location - {latitude, longitude, address}
 * @param {string} alertData.severity - 'low', 'medium', 'high'
 * @returns {Promise<string>} - Document ID of created alert
 */
export const createSafetyAlert = async (alertData) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to create a safety alert');
    }

    const alert = {
      userId: currentUser.uid,
      type: alertData.type,
      message: alertData.message,
      location: alertData.location,
      severity: alertData.severity,
      timestamp: serverTimestamp(),
      read: false,
    };

    console.log('Creating safety alert:', alert);

    const docRef = await addDoc(collection(db, 'safety_alerts'), alert);
    console.log('✅ Safety alert created successfully with ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating safety alert:', error);
    throw error;
  }
};

/**
 * Subscribe to user's safety alerts
 * @param {Function} callback - Callback function that receives alerts array
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToUserAlerts = (callback) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('No user logged in for alerts subscription');
      return () => {};
    }

    const q = query(
      collection(db, 'safety_alerts'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    console.log('📡 Subscribing to safety alerts...');

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const alerts = [];
        querySnapshot.forEach((doc) => {
          alerts.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          });
        });
        
        console.log(`✅ Received ${alerts.length} safety alerts from Firestore`);
        callback(alerts);
      },
      (error) => {
        console.error('❌ Error in safety alerts subscription:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up safety alerts subscription:', error);
    return () => {};
  }
};

/**
 * Get user's alert count
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of alerts for user
 */
export const getUserAlertCount = async (userId) => {
  try {
    if (!userId) return 0;
    
    const q = query(
      collection(db, 'safety_alerts'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting user alert count:', error);
    return 0;
  }
};

/**
 * Get unread alerts count
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of unread alerts
 */
export const getUnreadAlertCount = async (userId) => {
  try {
    if (!userId) return 0;
    
    const q = query(
      collection(db, 'safety_alerts'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread alert count:', error);
    return 0;
  }
};
