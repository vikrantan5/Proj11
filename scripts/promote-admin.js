/**
 * Script to promote a user to admin
 * 
 * Usage from Firebase Console or Cloud Functions:
 * 1. Go to Firebase Console > Firestore Database
 * 2. Find the user document in 'users' collection
 * 3. Add a field: isAdmin = true
 * 
 * OR
 * 
 * Run this script with Node.js (requires Firebase Admin SDK):
 * node promote-admin.js <user-email>
 */

// This is a reference implementation
// In production, you would use Firebase Admin SDK

const instructions = `
╔════════════════════════════════════════════════════════════╗
║          HOW TO MAKE A USER AN ADMIN                        ║
╚════════════════════════════════════════════════════════════╝

OPTION 1: Using Firebase Console (Recommended)
──────────────────────────────────────────────────────────────
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Firestore Database
4. Find the 'users' collection
5. Find the user document (by user ID or email)
6. Click on the document
7. Add a new field:
   - Field name: isAdmin
   - Field type: boolean
   - Field value: true
8. Save the changes

The user will now see the Admin tab in the app!

──────────────────────────────────────────────────────────────

OPTION 2: Using Firebase Admin SDK (For Developers)
──────────────────────────────────────────────────────────────
1. Install Firebase Admin SDK:
   npm install firebase-admin

2. Initialize Admin SDK with service account:
   
   const admin = require('firebase-admin');
   const serviceAccount = require('./serviceAccountKey.json');
   
   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount)
   });
   
   const db = admin.firestore();

3. Promote user to admin:
   
   async function promoteToAdmin(userId) {
     await db.collection('users').doc(userId).update({
       isAdmin: true
     });
     console.log('User promoted to admin!');
   }
   
   // Get user ID from email
   async function getUserIdByEmail(email) {
     const userRecord = await admin.auth().getUserByEmail(email);
     return userRecord.uid;
   }
   
   // Usage
   const email = 'admin@example.com';
   const userId = await getUserIdByEmail(email);
   await promoteToAdmin(userId);

──────────────────────────────────────────────────────────────

EXAMPLE USER DOCUMENT STRUCTURE:
{
  "userId": "abc123xyz",
  "name": "John Doe",
  "email": "john@example.com",
  "address": "123 Main St",
  "occupation": "Software Engineer",
  "emergencyContacts": [...],
  "isAdmin": true,              ← Add this field
  "installDate": "timestamp",
  "lastActive": "timestamp"
}

──────────────────────────────────────────────────────────────
`;

console.log(instructions);

// Export for documentation
module.exports = {
  instructions,
};
