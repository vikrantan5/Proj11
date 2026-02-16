import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Add a new product to Firestore
 * @param {Object} productData - Product data
 * @returns {Promise<string>} - Product ID
 */
export const addProduct = async (productData) => {
  try {
    const productsRef = collection(db, 'products');
    const newProductRef = doc(productsRef);
    
    await setDoc(newProductRef, {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Product added successfully:', newProductRef.id);
    return newProductRef.id;
  } catch (error) {
    console.error('❌ Error adding product:', error);
    throw error;
  }
};

/**
 * Get all products
 * @returns {Promise<Array>} - Array of products
 */
export const getAllProducts = async () => {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    console.log('✅ Retrieved products:', products.length);
    return products;
  } catch (error) {
    console.error('❌ Error getting products:', error);
    throw error;
  }
};

/**
 * Get products by category
 * @param {string} category - Product category
 * @returns {Promise<Array>} - Array of products
 */
export const getProductsByCategory = async (category) => {
  try {
    const productsRef = collection(db, 'products');
    const q = query(
      productsRef, 
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return products;
  } catch (error) {
    console.error('❌ Error getting products by category:', error);
    throw error;
  }
};

/**
 * Get a single product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object|null>} - Product data
 */
export const getProductById = async (productId) => {
  try {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    
    if (productSnap.exists()) {
      return {
        id: productSnap.id,
        ...productSnap.data(),
      };
    } else {
      console.log('No product found with ID:', productId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting product:', error);
    throw error;
  }
};

/**
 * Update a product
 * @param {string} productId - Product ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
export const updateProduct = async (productId, updateData) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Product updated successfully');
  } catch (error) {
    console.error('❌ Error updating product:', error);
    throw error;
  }
};

/**
 * Delete a product
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (productId) => {
  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
    
    console.log('✅ Product deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    throw error;
  }
};

/**
 * Check if product is in stock
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to check
 * @returns {Promise<boolean>} - True if in stock
 */
export const checkStock = async (productId, quantity = 1) => {
  try {
    const product = await getProductById(productId);
    if (!product) return false;
    
    return product.stock >= quantity;
  } catch (error) {
    console.error('❌ Error checking stock:', error);
    return false;
  }
};

/**
 * Update product stock
 * @param {string} productId - Product ID
 * @param {number} quantityChange - Positive to add, negative to subtract
 * @returns {Promise<void>}
 */
export const updateStock = async (productId, quantityChange) => {
  try {
    const product = await getProductById(productId);
    if (!product) throw new Error('Product not found');
    
    const newStock = product.stock + quantityChange;
    if (newStock < 0) throw new Error('Insufficient stock');
    
    await updateProduct(productId, { stock: newStock });
    console.log('✅ Stock updated successfully');
  } catch (error) {
    console.error('❌ Error updating stock:', error);
    throw error;
  }
};
