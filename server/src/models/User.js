const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    uid:         { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    photoURL:    { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);