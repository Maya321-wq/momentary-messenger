const admin = require('firebase-admin');
const path = require('path');

let serviceAccount;
try {
  const keyPath = path.resolve(__dirname, '..', '..', 'serviceAccountKey.json');
  serviceAccount = require(keyPath);
} catch (err) {
  console.error('[FIREBASE]: Could not load service account —', err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;