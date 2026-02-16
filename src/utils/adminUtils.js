import { db, auth } from '@/config/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Check if the current user is an admin
 * @returns {Promise<boolean>}
 */
export const isAdmin = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.isAdmin === true;
    }

    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Check if user is admin synchronously (requires userData to be passed)
 * @param {Object} userData - User data object
 * @returns {boolean}
 */
export const isAdminSync = (userData) => {
  return userData?.isAdmin === true;
};

/**
 * Promote a user to admin role
 * Note: This should only be called by existing admins or through Firebase Console
 * @param {string} userId - User ID to promote
 * @returns {Promise<boolean>}
 */
export const promoteToAdmin = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isAdmin: true,
    });
    console.log(`✅ User ${userId} promoted to admin`);
    return true;
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return false;
  }
};

/**
 * Remove admin privileges from a user
 * @param {string} userId - User ID to demote
 * @returns {Promise<boolean>}
 */
export const removeAdminRole = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isAdmin: false,
    });
    console.log(`✅ Admin role removed from user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error removing admin role:', error);
    return false;
  }
};
