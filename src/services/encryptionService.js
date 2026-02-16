import CryptoJS from 'crypto-js';

// Encryption key - In production, this should be stored securely
// For SOS messages, we use a predefined key for emergency access
const ENCRYPTION_KEY = 'SAHELI_SOS_SECURE_KEY_2025';

/**
 * Encrypt sensitive data
 * @param {string} data - Data to encrypt
 * @returns {string} Encrypted data
 */
export const encryptData = (data) => {
  try {
    if (!data) return '';
    
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      ENCRYPTION_KEY
    ).toString();
    
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data
 * @returns {Object} Decrypted data
 */
export const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return null;
    
    const decrypted = CryptoJS.AES.decrypt(
      encryptedData,
      ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash sensitive data (one-way)
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
export const hashData = (data) => {
  try {
    if (!data) return '';
    
    const hashed = CryptoJS.SHA256(data).toString();
    return hashed;
  } catch (error) {
    console.error('Hashing error:', error);
    throw new Error('Failed to hash data');
  }
};

/**
 * Encrypt location data for SMS
 * @param {Object} location - Location object with latitude and longitude
 * @returns {string} Encrypted location string
 */
export const encryptLocation = (location) => {
  try {
    if (!location || !location.latitude || !location.longitude) {
      return '';
    }
    
    const locationData = {
      lat: location.latitude,
      lng: location.longitude,
      timestamp: location.timestamp || new Date().toISOString(),
    };
    
    return encryptData(locationData);
  } catch (error) {
    console.error('Location encryption error:', error);
    return '';
  }
};

/**
 * Decrypt location data
 * @param {string} encryptedLocation - Encrypted location string
 * @returns {Object|null} Location object
 */
export const decryptLocation = (encryptedLocation) => {
  try {
    if (!encryptedLocation) return null;
    return decryptData(encryptedLocation);
  } catch (error) {
    console.error('Location decryption error:', error);
    return null;
  }
};
