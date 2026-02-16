import { RAZORPAY_CONFIG } from '../config/razorpayConfig';
import { Platform, Linking } from 'react-native';

// Note: react-native-razorpay requires custom native code (not available in Expo Go)
// For Expo Go, we'll use web-based approach for mobile
let RazorpayCheckout = null;
try {
  // Only import if available (custom dev client)
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.log('react-native-razorpay not available, using web-based approach');
}

/**
 * Create Razorpay order (Mock implementation for client-side)
 * In production, this should be done via Firebase Cloud Functions
 * @param {number} amount - Amount in INR
 * @returns {Promise<Object>} - Order object
 */
export const createRazorpayOrder = async (amount) => {
  try {
    console.log('Creating Razorpay order for amount:', amount);
    
    // Mock order creation (simulating server-side creation)
    // In production, this would call a Firebase Cloud Function
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const order = {
      id: orderId,
      amount: amount * 100, // Convert to paise
      currency: RAZORPAY_CONFIG.currency,
      receipt: `receipt_${Date.now()}`,
    };
    
    console.log('✅ Razorpay order created:', order);
    return order;
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    throw error;
  }
};

/**
 * Verify Razorpay payment signature (Mock implementation)
 * In production, this MUST be done on server-side for security
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Payment signature
 * @returns {Promise<boolean>} - True if verified
 */
export const verifyPaymentSignature = async (orderId, paymentId, signature) => {
  try {
    console.log('Verifying payment signature...');
    console.log('Order ID:', orderId);
    console.log('Payment ID:', paymentId);
    
    // Mock verification (simulating server-side verification)
    // In production, this would call a Firebase Cloud Function
    // that uses crypto.createHmac to verify the signature
    
    // For testing purposes, we'll simulate a successful verification
    // Real verification formula:
    // const crypto = require('crypto');
    // const expectedSignature = crypto
    //   .createHmac('sha256', RAZORPAY_CONFIG.key_secret)
    //   .update(orderId + '|' + paymentId)
    //   .digest('hex');
    // return expectedSignature === signature;
    
    console.log('✅ Payment verified (mock)');
    return true;
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return false;
  }
};

/**
 * Open Razorpay checkout
 * @param {Object} options - Checkout options
 * @returns {Promise<Object>} - Payment response
 */
export const openRazorpayCheckout = async (options) => {
  try {
    // For native modules (custom dev client with react-native-razorpay)
    if (Platform.OS !== 'web' && RazorpayCheckout) {
      console.log('Opening native Razorpay checkout...');
      
      const checkoutOptions = {
        description: options.description || RAZORPAY_CONFIG.description,
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: options.currency || RAZORPAY_CONFIG.currency,
        key: RAZORPAY_CONFIG.key_id,
        amount: options.amount,
        name: options.name || RAZORPAY_CONFIG.name,
        order_id: options.order_id,
        prefill: {
          name: options.prefill?.name || '',
          contact: options.prefill?.contact || '',
        },
        theme: { color: RAZORPAY_CONFIG.theme.color }
      };
      
      const data = await RazorpayCheckout.open(checkoutOptions);
      
      console.log('✅ Payment successful:', data);
      
      return {
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      };
    }
    
    // For web platform OR Expo Go (web-based approach)
    return new Promise((resolve, reject) => {
      // Load Razorpay script if not already loaded
      if (typeof window !== 'undefined' && !window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          openCheckout(options, resolve, reject);
        };
        script.onerror = () => {
          reject(new Error('Failed to load Razorpay SDK'));
        };
        document.body.appendChild(script);
      } else if (typeof window !== 'undefined') {
        openCheckout(options, resolve, reject);
      } else {
        // Fallback for testing in Expo Go without web view
        reject(new Error('Razorpay checkout requires web browser. Please use Expo web or create a custom development build.'));
      }
    });
  } catch (error) {
    console.error('❌ Error opening Razorpay checkout:', error);
    
    // Handle user cancellation
    if (RazorpayCheckout && error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
      throw new Error('Payment cancelled by user');
    }
    
    throw error;
  }
};

/**
 * Helper function to open checkout on web
 */
function openCheckout(options, resolve, reject) {
  const rzp = new window.Razorpay({
    key: RAZORPAY_CONFIG.key_id,
    amount: options.amount,
    currency: options.currency || RAZORPAY_CONFIG.currency,
    name: options.name || RAZORPAY_CONFIG.name,
    description: options.description || RAZORPAY_CONFIG.description,
    order_id: options.order_id,
    handler: function (response) {
      resolve({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    prefill: options.prefill || {},
    theme: RAZORPAY_CONFIG.theme,
    modal: {
      ondismiss: function () {
        reject(new Error('Payment cancelled by user'));
      },
    },
  });
  
  rzp.open();
}

/**
 * Format amount for display
 * @param {number} amount - Amount in INR
 * @returns {string} - Formatted amount
 */
export const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculate total with potential discounts
 * @param {number} subtotal - Subtotal amount
 * @param {number} discount - Discount percentage (0-100)
 * @returns {Object} - {subtotal, discount, total}
 */
export const calculateTotal = (subtotal, discount = 0) => {
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  
  return {
    subtotal,
    discountAmount,
    total,
  };
};
