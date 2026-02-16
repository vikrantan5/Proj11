import ENV from './env';

// Razorpay Configuration
export const RAZORPAY_CONFIG = {
  key_id: ENV.RAZORPAY_KEY_ID,
  key_secret: ENV.RAZORPAY_KEY_SECRET,
  currency: 'INR',
  name: 'Maitri Store',
  description: 'Safety Gadgets for Women',
  theme: {
    color: '#EC4899', // Pink color matching Maitri theme
  },
};
