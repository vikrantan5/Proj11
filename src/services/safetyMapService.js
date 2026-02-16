import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';

/**
 * Create a new safety marker with attributes
 * @param {Object} markerData - Marker data
 * @param {Object} markerData.coordinates - {latitude, longitude}
 * @param {string} markerData.status - 'safe', 'caution', or 'unsafe'
 * @param {string} markerData.note - Optional description
 * @param {Object} markerData.attributes - Safety attributes
 * @returns {Promise<string>} - Document ID of created marker
 */
export const createSafetyMarker = async (markerData) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to create a safety marker');
    }

    // Default attributes if not provided
    const defaultAttributes = {
      streetLighting: null, // 'good', 'poor', 'none'
      networkConnectivity: null, // 'excellent', 'good', 'poor', 'none'
      areaType: null, // 'residential', 'commercial', 'slum', 'isolated'
      policeSecurity: null, // 'present', 'absent'
      crowdActivity: null, // 'crowded', 'moderate', 'deserted'
    };

    const marker = {
      userId: currentUser.uid,
      coordinates: markerData.coordinates,
      status: markerData.status, // 'safe', 'caution', 'unsafe'
      note: markerData.note || '',
      attributes: markerData.attributes || defaultAttributes,
      timestamp: serverTimestamp(),
      upvotes: 0,
      upvoters: [],
      verified: false,
      verificationCount: 0,
      verifications: [], // Array of {userId, timestamp, attributes}
      safetyScore: calculateSafetyScore(markerData.status, markerData.attributes || defaultAttributes),
      verificationStatus: 'pending', // 'pending', 'verified', 'disputed'
    };

    console.log('Creating safety marker:', marker);

    const docRef = await addDoc(collection(db, 'safety_markers'), marker);
    console.log('✅ Safety marker created successfully with ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating safety marker:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time safety markers updates
 * @param {Function} callback - Callback function that receives markers array
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToSafetyMarkers = (callback) => {
  try {
    const q = query(
      collection(db, 'safety_markers'),
      orderBy('timestamp', 'desc')
    );

    console.log('📡 Subscribing to safety markers...');

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const markers = [];
        querySnapshot.forEach((doc) => {
          markers.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          });
        });
        
        console.log(`✅ Received ${markers.length} safety markers from Firestore`);
        callback(markers);
      },
      (error) => {
        console.error('❌ Error in safety markers subscription:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up safety markers subscription:', error);
    return () => {};
  }
};

/**
 * Upvote a safety marker (atomic operation)
 * @param {string} markerId - Marker document ID
 * @returns {Promise<void>}
 */
export const upvoteSafetyMarker = async (markerId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to upvote');
    }

    const markerRef = doc(db, 'safety_markers', markerId);

    await runTransaction(db, async (transaction) => {
      const markerDoc = await transaction.get(markerRef);
      
      if (!markerDoc.exists()) {
        throw new Error('Marker does not exist');
      }

      const markerData = markerDoc.data();
      const upvoters = markerData.upvoters || [];
      const currentUpvotes = markerData.upvotes || 0;

      if (upvoters.includes(currentUser.uid)) {
        // Remove upvote
        transaction.update(markerRef, {
          upvotes: currentUpvotes - 1,
          upvoters: upvoters.filter(uid => uid !== currentUser.uid),
          verified: (currentUpvotes - 1) >= 5,
        });
        console.log('👎 Removed upvote from marker:', markerId);
      } else {
        // Add upvote
        transaction.update(markerRef, {
          upvotes: currentUpvotes + 1,
          upvoters: [...upvoters, currentUser.uid],
          verified: (currentUpvotes + 1) >= 5,
        });
        console.log('👍 Added upvote to marker:', markerId);
      }
    });

    console.log('✅ Upvote transaction completed successfully');
  } catch (error) {
    console.error('❌ Error upvoting marker:', error);
    throw error;
  }
};

/**
 * Check if current user has upvoted a marker
 * @param {Array} upvoters - Array of user IDs who upvoted
 * @returns {boolean}
 */
export const hasUserUpvotedMarker = (upvoters) => {
  const currentUser = auth.currentUser;
  if (!currentUser || !upvoters) return false;
  return upvoters.includes(currentUser.uid);
};

/**
 * Get markers by status
 * @param {string} status - 'safe', 'caution', or 'unsafe'
 * @returns {Promise<Array>}
 */
export const getMarkersByStatus = async (status) => {
  try {
    const q = query(
      collection(db, 'safety_markers'),
      where('status', '==', status)
    );
    
    const querySnapshot = await getDocs(q);
    const markers = [];
    querySnapshot.forEach((doc) => {
      markers.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      });
    });
    
    return markers;
  } catch (error) {
    console.error('Error getting markers by status:', error);
    return [];
  }
};

/**
 * Calculate if a location is within danger zone
 * @param {Object} location - {latitude, longitude}
 * @param {Array} unsafeMarkers - Array of unsafe markers
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object|null} - Returns closest unsafe marker if within radius
 */
export const isLocationInDangerZone = (location, unsafeMarkers, radiusKm = 0.5) => {
  for (const marker of unsafeMarkers) {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      marker.coordinates.latitude,
      marker.coordinates.longitude
    );
    
    if (distance <= radiusKm) {
      return { ...marker, distance };
    }
  }
  return null;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} - Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Calculate safety score based on attributes (0-100)
 * @param {string} status - 'safe', 'caution', 'unsafe'
 * @param {Object} attributes - Safety attributes
 * @returns {number} Safety score (0-100)
 */
export const calculateSafetyScore = (status, attributes) => {
  let score = 50; // Base score
  
  // Adjust base score by status
  if (status === 'safe') score = 70;
  else if (status === 'caution') score = 50;
  else if (status === 'unsafe') score = 30;
  
  // Adjust based on attributes
  if (attributes.streetLighting === 'good') score += 10;
  else if (attributes.streetLighting === 'poor') score -= 5;
  else if (attributes.streetLighting === 'none') score -= 15;
  
  if (attributes.networkConnectivity === 'excellent') score += 5;
  else if (attributes.networkConnectivity === 'good') score += 3;
  else if (attributes.networkConnectivity === 'poor') score -= 3;
  else if (attributes.networkConnectivity === 'none') score -= 10;
  
  if (attributes.areaType === 'residential') score += 10;
  else if (attributes.areaType === 'commercial') score += 5;
  else if (attributes.areaType === 'slum') score -= 10;
  else if (attributes.areaType === 'isolated') score -= 15;
  
  if (attributes.policeSecurity === 'present') score += 15;
  else if (attributes.policeSecurity === 'absent') score -= 10;
  
  if (attributes.crowdActivity === 'crowded') score += 10;
  else if (attributes.crowdActivity === 'moderate') score += 5;
  else if (attributes.crowdActivity === 'deserted') score -= 15;
  
  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
};

/**
 * Submit verification for a safety marker
 * @param {string} markerId - Marker document ID
 * @param {boolean} isVerifying - true if verifying, false if disputing
 * @param {Object} userAttributes - User's observation of safety attributes
 * @returns {Promise<void>}
 */
export const verifySafetyMarker = async (markerId, isVerifying, userAttributes = null) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be logged in to verify');
    }

    const markerRef = doc(db, 'safety_markers', markerId);

    await runTransaction(db, async (transaction) => {
      const markerDoc = await transaction.get(markerRef);
      
      if (!markerDoc.exists()) {
        throw new Error('Marker does not exist');
      }

      const markerData = markerDoc.data();
      const verifications = markerData.verifications || [];
      const verificationCount = markerData.verificationCount || 0;

      // Check if user already verified
      const existingVerification = verifications.find(v => v.userId === currentUser.uid);
      
      if (existingVerification) {
        throw new Error('You have already verified this marker');
      }

      // Add new verification
      const newVerification = {
        userId: currentUser.uid,
        timestamp: new Date().toISOString(),
        isVerifying,
        attributes: userAttributes,
      };

      const updatedVerifications = [...verifications, newVerification];
      const newVerificationCount = verificationCount + (isVerifying ? 1 : 0);

      // Update verification status
      let verificationStatus = 'pending';
      if (newVerificationCount >= 2) {
        verificationStatus = 'verified';
      }

      // Recalculate safety score if attributes provided
      let newSafetyScore = markerData.safetyScore;
      if (userAttributes) {
        newSafetyScore = calculateSafetyScore(markerData.status, userAttributes);
      }

      transaction.update(markerRef, {
        verifications: updatedVerifications,
        verificationCount: newVerificationCount,
        verificationStatus,
        verified: verificationStatus === 'verified',
        safetyScore: newSafetyScore,
      });

      console.log(`✅ Verification ${isVerifying ? 'added' : 'disputed'} for marker:`, markerId);
    });
  } catch (error) {
    console.error('❌ Error verifying marker:', error);
    throw error;
  }
};

/**
 * Check if current user has verified a marker
 * @param {Array} verifications - Array of verification objects
 * @returns {boolean}
 */
export const hasUserVerifiedMarker = (verifications) => {
  const currentUser = auth.currentUser;
  if (!currentUser || !verifications) return false;
  return verifications.some(v => v.userId === currentUser.uid);
};

/**
 * Get markers pending verification near a location
 * @param {Object} location - {latitude, longitude}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Promise<Array>} Array of markers pending verification
 */
export const getPendingVerificationMarkers = async (location, radiusKm = 0.5) => {
  try {
    const q = query(
      collection(db, 'safety_markers'),
      where('verificationStatus', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    const markers = [];
    
    querySnapshot.forEach((doc) => {
      const markerData = doc.data();
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        markerData.coordinates.latitude,
        markerData.coordinates.longitude
      );
      
      if (distance <= radiusKm) {
        markers.push({
          id: doc.id,
          ...markerData,
          distance,
          timestamp: markerData.timestamp?.toDate() || new Date(),
        });
      }
    });
    
    return markers.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error getting pending verification markers:', error);
    return [];
  }
};

/**
 * Get safety score category label
 * @param {number} score - Safety score (0-100)
 * @returns {Object} Category with label and color
 */
export const getSafetyScoreCategory = (score) => {
  if (score >= 90) return { label: 'Very Safe', color: '#10B981', emoji: '✅' };
  if (score >= 70) return { label: 'Moderately Safe', color: '#3B82F6', emoji: '✔️' };
  if (score >= 50) return { label: 'Unsafe', color: '#F59E0B', emoji: '⚠️' };
  return { label: 'Dangerous', color: '#EF4444', emoji: '🚨' };
};


const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};
