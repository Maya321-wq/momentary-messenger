const admin = require('firebase-admin');
const path = require('path');

let firebaseInitialized = false;

try {
  const keyPath = path.resolve(__dirname, '..', '..', 'serviceAccountKey.json');
  const serviceAccount = require(keyPath);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('[FIREBASE]: Initialized successfully');
  }
} catch (err) {
  console.warn('[FIREBASE]: Could not load service account —', err.message);
  console.warn('[FIREBASE]: Continuing without Firebase (authentication will fail)');
}

module.exports = {
  admin,
  isInitialized: firebaseInitialized,
};