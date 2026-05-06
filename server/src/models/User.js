const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    uid:          { type: String, required: true, unique: true },
    email:        { type: String, default: '' },
    displayName:  { type: String, required: true },
    photoURL:     { type: String, default: '' },
    phoneNumber:  {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          // Allow null for users who haven't set phone yet
          if (v === null || v === undefined) return true;
          // Must be E.164 format: start with + and contain only digits
          return /^\+\d{10,15}$/.test(v);
        },
        message: 'Phone number must be in E.164 format (+[country code][number])'
      }
    },
    mfaEnabled:   { type: Boolean, default: true },  // MFA is enabled for this user
    mfaVerified:  { type: Boolean, default: false }, // User has verified MFA at least once
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);