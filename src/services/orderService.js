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
 * Create a new order
 * @param {Object} orderData - Order data
 * @returns {Promise<string>} - Order ID
 */
export const createOrder = async (orderData) => {
  try {
    const ordersRef = collection(db, 'orders');
    const newOrderRef = doc(ordersRef);
    
    await setDoc(newOrderRef, {
      ...orderData,
      paymentStatus: 'pending',
      deliveryStatus: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Order created successfully:', newOrderRef.id);
    return newOrderRef.id;
  } catch (error) {
    console.error('❌ Error creating order:', error);
    throw error;
  }
};

/**
 * Get user's orders
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of orders
 */
export const getUserOrders = async (userId) => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    console.log('✅ Retrieved user orders:', orders.length);
    return orders;
  } catch (error) {
    console.error('❌ Error getting user orders:', error);
    throw error;
  }
};

/**
 * Get all orders (Admin only)
 * @returns {Promise<Array>} - Array of all orders
 */
export const getAllOrders = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    console.log('✅ Retrieved all orders:', orders.length);
    return orders;
  } catch (error) {
    console.error('❌ Error getting all orders:', error);
    throw error;
  }
};

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} - Order data
 */
export const getOrderById = async (orderId) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (orderSnap.exists()) {
      return {
        id: orderSnap.id,
        ...orderSnap.data(),
      };
    } else {
      console.log('No order found with ID:', orderId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting order:', error);
    throw error;
  }
};

/**
 * Update order payment status
 * @param {string} orderId - Order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} status - Payment status ('paid', 'failed')
 * @returns {Promise<void>}
 */
export const updateOrderPaymentStatus = async (orderId, paymentId, status) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      razorpayPaymentId: paymentId,
      paymentStatus: status,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Order payment status updated');
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    throw error;
  }
};

/**
 * Update order delivery status
 * @param {string} orderId - Order ID
 * @param {string} status - Delivery status ('pending', 'packed', 'shipped', 'delivered')
 * @returns {Promise<void>}
 */
export const updateOrderDeliveryStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      deliveryStatus: status,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Order delivery status updated');
  } catch (error) {
    console.error('❌ Error updating delivery status:', error);
    throw error;
  }
};

/**
 * Get orders by payment status
 * @param {string} status - Payment status
 * @returns {Promise<Array>} - Array of orders
 */
export const getOrdersByPaymentStatus = async (status) => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('paymentStatus', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return orders;
  } catch (error) {
    console.error('❌ Error getting orders by status:', error);
    throw error;
  }
};

/**
 * Calculate order statistics (Admin)
 * @returns {Promise<Object>} - Order statistics
 */
export const getOrderStatistics = async () => {
  try {
    const orders = await getAllOrders();
    
    const stats = {
      totalOrders: orders.length,
      paidOrders: orders.filter(o => o.paymentStatus === 'paid').length,
      pendingOrders: orders.filter(o => o.paymentStatus === 'pending').length,
      totalRevenue: orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, order) => sum + order.totalAmount, 0),
      deliveredOrders: orders.filter(o => o.deliveryStatus === 'delivered').length,
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error calculating order statistics:', error);
    throw error;
  }
};
