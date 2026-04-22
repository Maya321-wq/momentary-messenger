const mongoose = require('mongoose');

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[MONGO]: Connected to MongoDB');
  } catch (err) {
    console.error('[MONGO]: Connection failed —', err.message);
    process.exit(1);
  }
};

module.exports = connectMongo;