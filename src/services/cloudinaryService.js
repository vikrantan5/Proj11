
import { Platform } from 'react-native';
import ENV from '../config/env';

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = ENV.CLOUDINARY_CLOUD_NAME || 'dmwj4h3i4';
const CLOUDINARY_API_KEY = ENV.CLOUDINARY_API_KEY || '165684144277855';

// Backend URL for server-side uploads
const BACKEND_URL = ENV.BACKEND_URL || '';

/**
 * XMLHttpRequest-based file upload that works with React Native FormData.
 * This bypasses Expo's custom fetch which doesn't support {uri, type, name} FormData parts.
 */
const xhrUpload = (url, formData, headers = {}, timeoutMs = 60000) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    // Set headers
    Object.keys(headers).forEach(key => {
      xhr.setRequestHeader(key, headers[key]);
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out'));
    };

    xhr.timeout = timeoutMs;
    xhr.send(formData);
  });
};

/**
 * Get a signed upload signature from the backend.
 * This allows authenticated uploads directly to Cloudinary without exposing API secret.
 */
const getSignedUploadParams = async (folder, resourceType) => {
  try {
    if (!BACKEND_URL) return null;

    const response = await fetch(`${BACKEND_URL}/api/sos/sign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ folder, resource_type: resourceType }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to get signed upload params:', error.message);
    return null;
  }
};

/**
 * Upload a file directly to Cloudinary using XMLHttpRequest with SIGNED upload.
 * Falls back to unsigned upload if signing fails.
 * @param {string} fileUri - Local file URI
 * @param {string} resourceType - 'image', 'video' (audio uses 'video'), or 'raw'
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<Object>} Upload result with secure_url
 */
export const uploadToCloudinary = async (fileUri, resourceType = 'image', folder = 'sos') => {
  try {
    if (!fileUri) {
      throw new Error('No file URI provided');
    }

    const cloudName = CLOUDINARY_CLOUD_NAME;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    // Determine file extension and mime type
    let fileName = fileUri.split('/').pop() || 'file';
    let fileType = 'application/octet-stream';

    if (resourceType === 'image') {
      fileType = 'image/jpeg';
      if (!fileName.includes('.')) fileName += '.jpg';
    } else if (resourceType === 'video') {
      fileType = 'audio/m4a';
      if (!fileName.includes('.')) fileName += '.m4a';
    }

    // Build form data using React Native compatible format
    const formData = new FormData();

    formData.append('file', {
      uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
      type: fileType,
      name: fileName,
    });

    // Try signed upload first (more reliable, no preset needed)
    const signedParams = await getSignedUploadParams(folder, resourceType);

    if (signedParams) {
      formData.append('signature', signedParams.signature);
      formData.append('timestamp', String(signedParams.timestamp));
      formData.append('api_key', signedParams.api_key);
      formData.append('folder', folder);
      console.log(`Using signed Cloudinary upload for ${resourceType}`);
    } else {
      // Fallback to unsigned upload with preset
      formData.append('upload_preset', 'sos_emergency');
      formData.append('folder', folder);
      formData.append('api_key', CLOUDINARY_API_KEY);
      console.log(`Using unsigned Cloudinary upload for ${resourceType}`);
    }

    // Use XMLHttpRequest instead of fetch to avoid Expo's FormData issues
    // Image uploads get longer timeout (120s) since they're larger
    const timeout = resourceType === 'image' ? 120000 : 60000;
    const result = await xhrUpload(uploadUrl, formData, {
      'Accept': 'application/json',
    }, timeout);

    console.log(`Cloudinary ${resourceType} upload success:`, result.secure_url);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error(`Cloudinary ${resourceType} upload failed:`, error);
    throw error;
  }
};

/**
 * Upload file via backend server using XMLHttpRequest (FormData with file URI)
 * Primary upload method - routes through backend for reliability
 * @param {string} fileUri - Local file URI
 * @param {string} fileType - 'image' or 'audio'
 * @param {string} userId - User ID
 * @returns {Promise<string>} URL of uploaded file
 */
const uploadViaBackend = async (fileUri, fileType, userId) => {
  if (!BACKEND_URL) {
    throw new Error('Backend URL not configured');
  }

  const formData = new FormData();
  formData.append('user_id', userId);

  const fileName = fileUri.split('/').pop() || 'file';
  const uri = Platform.OS === 'android' ? fileUri : fileUri.replace('file://', '');

  if (fileType === 'image') {
    formData.append('image_file', {
      uri: uri,
      type: 'image/jpeg',
      name: fileName,
    });
  } else {
    formData.append('audio_file', {
      uri: uri,
      type: 'audio/m4a',
      name: fileName,
    });
  }

  // Use XHR instead of fetch to avoid Expo's FormData issue
  // Images get longer timeout
  const timeout = fileType === 'image' ? 120000 : 60000;
  const result = await xhrUpload(`${BACKEND_URL}/api/sos/upload`, formData, {
    'Accept': 'application/json',
  }, timeout);

  return fileType === 'image' ? result.image_url : result.audio_url;
};

/**
 * Upload file via backend using base64 encoding (most reliable fallback)
 * Avoids all FormData/XHR binary issues by reading file as base64 via fetch blob
 * @param {string} fileUri - Local file URI
 * @param {string} fileType - 'image' or 'audio'
 * @param {string} userId - User ID
 * @returns {Promise<string>} URL of uploaded file
 */
const uploadViaBackendBase64 = async (fileUri, fileType, userId) => {
  if (!BACKEND_URL) {
    throw new Error('Backend URL not configured');
  }

  // Read file as base64 using fetch + blob + FileReader (works on all Expo versions)
  const base64Data = await readFileAsBase64(fileUri);

  const fileName = fileUri.split('/').pop() || 'file';

  const payload = {
    user_id: userId,
  };

  if (fileType === 'image') {
    payload.image_base64 = base64Data;
    payload.image_filename = fileName;
  } else {
    payload.audio_base64 = base64Data;
    payload.audio_filename = fileName;
  }

  // Use XHR with JSON body (no FormData - avoids the Expo issue entirely)
  const jsonBody = JSON.stringify(payload);

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}/api/sos/upload-base64`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('Invalid JSON response from server'));
        }
      } else {
        reject(new Error(`Base64 upload failed: ${xhr.status} - ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during base64 upload'));
    xhr.ontimeout = () => reject(new Error('Base64 upload timed out'));
    xhr.timeout = 120000; // 2 min timeout for large base64 payloads
    xhr.send(jsonBody);
  });

  return fileType === 'image' ? result.image_url : result.audio_url;
};

/**
 * Read a local file URI as base64 string using fetch + blob + FileReader.
 * This method works across ALL Expo SDK versions without deprecated APIs.
 * @param {string} fileUri - Local file URI (file:///...)
 * @returns {Promise<string>} Base64 encoded string (without data: prefix)
 */
const readFileAsBase64 = (fileUri) => {
  return new Promise(async (resolve, reject) => {
    try {
      // fetch() can read local file:// URIs in React Native
      const response = await fetch(fileUri);
      const blob = await response.blob();

      const reader = new FileReader();
      reader.onloadend = () => {
        // Result is: \"data:image/jpeg;base64,/9j/4AAQ...\"
        // We only need the base64 part after the comma
        const base64 = reader.result;
        if (base64 && typeof base64 === 'string') {
          const commaIndex = base64.indexOf(',');
          if (commaIndex > -1) {
            resolve(base64.substring(commaIndex + 1));
          } else {
            resolve(base64);
          }
        } else {
          reject(new Error('FileReader returned empty result'));
        }
      };
      reader.onerror = () => {
        reject(new Error('FileReader error'));
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(new Error(`Failed to read file as base64: ${error.message}`));
    }
  });
};

/**
 * Upload SOS image with 3-tier fallback:
 * 1. Direct Cloudinary via XHR FormData with SIGNED upload (fastest, most reliable)
 * 2. Backend via XHR FormData (server-side signed upload)
 * 3. Backend via base64 JSON (ultimate fallback - uses fetch+blob, no deprecated APIs)
 */
export const uploadSOSImageToCloudinary = async (imageUri, userId = 'unknown') => {
  // Tier 1: Try direct Cloudinary upload via XHR with signed params
  try {
    console.log('Attempting direct Cloudinary image upload (signed XHR)...');
    const result = await uploadToCloudinary(imageUri, 'image', `sos/images/${userId}`);
    if (result.url) {
      console.log('Image uploaded directly to Cloudinary:', result.url);
      return result.url;
    }
  } catch (error) {
    console.warn('Direct Cloudinary image upload failed:', error.message);
  }

  // Tier 2: Try backend upload via XHR
  try {
    console.log('Attempting image upload via backend (XHR)...');
    const url = await uploadViaBackend(imageUri, 'image', userId);
    if (url) {
      console.log('Image uploaded via backend:', url);
      return url;
    }
  } catch (error) {
    console.warn('Backend XHR image upload failed:', error.message);
  }

  // Tier 3: Try base64 upload via backend (uses fetch+blob, no deprecated expo-file-system)
  try {
    console.log('Attempting image upload via backend (base64 via fetch+blob)...');
    const url = await uploadViaBackendBase64(imageUri, 'image', userId);
    if (url) {
      console.log('Image uploaded via backend base64:', url);
      return url;
    }
  } catch (error) {
    console.error('All image upload methods failed:', error.message);
    throw new Error('Failed to upload image after all retry attempts');
  }
};

/**
 * Upload SOS audio with 3-tier fallback
 */
export const uploadSOSAudioToCloudinary = async (audioUri, userId = 'unknown') => {
  // Tier 1: Try direct Cloudinary upload via XHR (fastest - uses signed upload)
  try {
    console.log('Attempting direct Cloudinary audio upload (signed XHR)...');
    const result = await uploadToCloudinary(audioUri, 'video', `sos/audio/${userId}`);
    if (result.url) {
      console.log('Audio uploaded directly to Cloudinary:', result.url);
      return result.url;
    }
  } catch (error) {
    console.warn('Direct Cloudinary audio upload failed:', error.message);
  }

  // Tier 2: Try backend upload via XHR
  try {
    console.log('Attempting audio upload via backend (XHR)...');
    const url = await uploadViaBackend(audioUri, 'audio', userId);
    if (url) {
      console.log('Audio uploaded via backend:', url);
      return url;
    }
  } catch (error) {
    console.warn('Backend XHR audio upload failed:', error.message);
  }

  // Tier 3: Try base64 upload via backend
  try {
    console.log('Attempting audio upload via backend (base64 via fetch+blob)...');
    const url = await uploadViaBackendBase64(audioUri, 'audio', userId);
    if (url) {
      console.log('Audio uploaded via backend base64:', url);
      return url;
    }
  } catch (error) {
    console.error('All audio upload methods failed:', error.message);
    throw new Error('Failed to upload audio after all retry attempts');
  }
};

/**
 * Upload all SOS files in parallel (optimized for speed)
 * @param {Object} params - { imageUri, audioUri, userId }
 * @returns {Promise<Object>} { imageUrl, audioUrl }
 */
export const uploadAllSOSFiles = async ({ imageUri, audioUri, userId }) => {
  const uploads = [];
  let imageUrl = null;
  let audioUrl = null;

  if (imageUri) {
    uploads.push(
      uploadSOSImageToCloudinary(imageUri, userId)
        .then(url => { imageUrl = url; })
        .catch(err => { console.error('Image upload error:', err.message); })
    );
  }

  if (audioUri) {
    uploads.push(
      uploadSOSAudioToCloudinary(audioUri, userId)
        .then(url => { audioUrl = url; })
        .catch(err => { console.error('Audio upload error:', err.message); })
    );
  }

  await Promise.allSettled(uploads);

  return { imageUrl, audioUrl };
};
