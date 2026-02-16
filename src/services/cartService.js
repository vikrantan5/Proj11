import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Get user's cart
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Cart data
 */
export const getCart = async (userId) => {
  try {
    const cartRef = doc(db, 'carts', userId);
    const cartSnap = await getDoc(cartRef);
    
    if (cartSnap.exists()) {
      return {
        id: cartSnap.id,
        ...cartSnap.data(),
      };
    } else {
      // Return empty cart
      return {
        id: userId,
        items: [],
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('❌ Error getting cart:', error);
    throw error;
  }
};

/**
 * Add item to cart
 * @param {string} userId - User ID
 * @param {Object} item - Item to add {productId, quantity}
 * @returns {Promise<void>}
 */
export const addToCart = async (userId, item) => {
  try {
    const cartRef = doc(db, 'carts', userId);
    const cart = await getCart(userId);
    
    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (i) => i.productId === item.productId
    );
    
    let updatedItems;
    if (existingItemIndex >= 0) {
      // Update quantity if item exists
      updatedItems = [...cart.items];
      updatedItems[existingItemIndex].quantity += item.quantity;
    } else {
      // Add new item
      updatedItems = [...cart.items, item];
    }
    
    await setDoc(cartRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Item added to cart');
  } catch (error) {
    console.error('❌ Error adding to cart:', error);
    throw error;
  }
};

/**
 * Update item quantity in cart
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @param {number} quantity - New quantity
 * @returns {Promise<void>}
 */
export const updateCartItem = async (userId, productId, quantity) => {
  try {
    const cartRef = doc(db, 'carts', userId);
    const cart = await getCart(userId);
    
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      await removeFromCart(userId, productId);
      return;
    }
    
    const updatedItems = cart.items.map((item) =>
      item.productId === productId ? { ...item, quantity } : item
    );
    
    await setDoc(cartRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Cart item updated');
  } catch (error) {
    console.error('❌ Error updating cart item:', error);
    throw error;
  }
};

/**
 * Remove item from cart
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export const removeFromCart = async (userId, productId) => {
  try {
    const cartRef = doc(db, 'carts', userId);
    const cart = await getCart(userId);
    
    const updatedItems = cart.items.filter(
      (item) => item.productId !== productId
    );
    
    await setDoc(cartRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Item removed from cart');
  } catch (error) {
    console.error('❌ Error removing from cart:', error);
    throw error;
  }
};

/**
 * Clear entire cart
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const clearCart = async (userId) => {
  try {
    const cartRef = doc(db, 'carts', userId);
    await setDoc(cartRef, {
      items: [],
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Cart cleared');
  } catch (error) {
    console.error('❌ Error clearing cart:', error);
    throw error;
  }
};

/**
 * Get cart item count
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Total items in cart
 */
export const getCartItemCount = async (userId) => {
  try {
    const cart = await getCart(userId);
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  } catch (error) {
    console.error('❌ Error getting cart count:', error);
    return 0;
  }
};
