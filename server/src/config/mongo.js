const mongoose = require('mongoose');

let mongoConnected = false;

const connectMongo = async () => {
  const mongoUri = process.env.MONGO_URI;

  // MONGO_URI is REQUIRED
  if (!mongoUri) {
    console.error('[MONGO]: ❌ MONGO_URI not set in .env');
    process.exit(1);
  }

  console.log('[MONGO]: Attempting connection to', mongoUri.split('?')[0]); // Hide credentials in logs

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    mongoConnected = true;
    console.log('[MONGO]: ✅ Connected to MongoDB');
  } catch (err) {
    mongoConnected = false;
    console.error('[MONGO]: ❌ Connection failed —', err.message);
    console.error('[MONGO]: Ensure MongoDB is running at', mongoUri.split('?')[0]);
    process.exit(1);
  }
};

module.exports = connectMongo;
module.exports.isConnected = () => mongoConnected;