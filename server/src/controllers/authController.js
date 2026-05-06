const User = require('../models/User');
const { pulse } = require('../services/pulseService');
const { storeMfaSid, deleteMfaSid } = require('../services/redisService');
const { sendOTP, verifyOTP } = require('../services/twilioService');

const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new Error('Phone number is required and must be a string');
  }

  let cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');

  // If it doesn't start with +, assume it's a local number and add country code
  if (!cleaned.startsWith('+')) {
    // Handle common formats:
    // - If starts with 0 (Egypt), convert to +20
    if (cleaned.startsWith('0')) {
      cleaned = '+20' + cleaned.substring(1);
    }
    // - If starts with 1 (US), convert to +1
    else if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = '+1' + cleaned;
    }
    // - Otherwise, assume international format is missing +
    else {
      cleaned = '+' + cleaned;
    }
  }

  // Validate E.164 format: + followed by country code and number
  if (!cleaned.startsWith('+') || cleaned.length < 10) {
    throw new Error('Phone number must be in E.164 format (+[country code][number]) and at least 10 digits');
  }

  // Additional validation: ensure it contains only digits after +
  const digitsOnly = cleaned.substring(1);
  if (!/^\d+$/.test(digitsOnly)) {
    throw new Error('Phone number can only contain digits after the +');
  }

  return cleaned;
};

const login = async (req, res) => {
  const { uid, email, name, picture } = req.user;
  const socketId = req.headers['x-socket-id'] || null;

  console.log('[AUTH]: Incoming login request for uid:', uid);

  try {
    let user = null;
    let mongoAvailable = true;
    let requiresPhone = false;
    
    // Try to find or create user in MongoDB
    try {
      user = await User.findOne({ uid });

      if (!user) {
        // New user: create with Firebase data
        user = await User.create({
          uid,
          email: email || '',
          displayName: name || uid.slice(0, 10),
          photoURL: picture || '',
          phoneNumber: null, // Will be set later
          mfaEnabled: true,
          mfaVerified: false,
        });
        console.log('[AUTH]: ✅ New user created —', uid);
        if (socketId) pulse(socketId, 'AUTH', `New user registered — ${uid}`);
      } else {
        console.log('[AUTH]: ✅ Existing user found —', uid);
        if (socketId) pulse(socketId, 'AUTH', `Token verified for ${uid}`);
      }
    } catch (mongoErr) {
      mongoAvailable = false;
      console.warn('[AUTH]: ⚠️  MongoDB unavailable —', mongoErr.message);
      console.warn('[AUTH]: Continuing without user storage, using session auth only');
      
      // Create temporary user object for response
      user = {
        uid,
        email: email || '',
        displayName: name || uid.slice(0, 10),
        photoURL: picture || '',
        phoneNumber: null,
        mfaEnabled: true,
        mfaVerified: false,
      };
      
      if (socketId) pulse(socketId, 'AUTH', 'MongoDB unavailable — continuing in session mode');
    }

    // Check if user has phone number set
    if (!user.phoneNumber) {
      requiresPhone = true;
      console.log('[AUTH]: ⚠️  User phone number not set —', uid);
      if (socketId) pulse(socketId, 'AUTH', 'Phone number required for MFA');
      
      return res.status(200).json({
        requiresPhone: true,
        uid: user.uid,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
        mongoAvailable,
      });
    }

    // Phone is set, check if MFA is enabled and not yet verified
    let requiresMFA = false;
    if (user.mfaEnabled && !user.mfaVerified) {
      console.log('[MFA DEBUG] Sending OTP to existing user phone:', user.phoneNumber);
      const sid = await sendOTP(user.phoneNumber, socketId);
      await storeMfaSid(uid, sid);
      requiresMFA = true;
      console.log('[AUTH]: ✅ MFA OTP sent to', user.phoneNumber);
      if (socketId) pulse(socketId, 'AUTH', 'Awaiting SMS code verification');
    } else if (!user.mfaEnabled) {
      console.log('[AUTH]: ℹ️  MFA disabled for user —', uid);
      if (socketId) pulse(socketId, 'AUTH', 'MFA disabled — proceeding to secure session');
    } else if (user.mfaVerified) {
      console.log('[AUTH]: ℹ️  User already verified MFA —', uid);
      if (socketId) pulse(socketId, 'AUTH', 'MFA previously verified — session secure');
    }

    return res.status(200).json({
      requiresPhone: false,
      requiresMFA,
      uid: user.uid,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        mfaEnabled: user.mfaEnabled,
        mfaVerified: user.mfaVerified,
      },
      mongoAvailable,
    });
  } catch (err) {
    console.error('[AUTH]: ❌ Login error —', err.message);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
};

/**
 * Save user's phone number
 * POST /auth/save-phone
 * Body: { uid, phoneNumber }
 */
const savePhone = async (req, res) => {
  const { uid } = req.user;
  const { phoneNumber } = req.body;
  const socketId = req.headers['x-socket-id'] || null;

  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  console.log('[AUTH]: Save phone request for uid:', uid);

  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    console.log('[MFA DEBUG] Normalized phone number:', normalizedPhone);

    console.log('[MFA DEBUG] Normalized phone number:', normalizedPhone);

    let user = null;

    // Try to update user in MongoDB
    try {
      user = await User.findOneAndUpdate(
        { uid },
        { phoneNumber: normalizedPhone },
        { new: true }
      );

      if (!user) {
        console.warn('[AUTH]: ⚠️  User not found for uid:', uid);
        return res.status(404).json({ error: 'User not found' });
      }

      console.log('[AUTH]: ✅ Phone number saved for —', uid);
      if (socketId) pulse(socketId, 'AUTH', `Phone number verified: ${normalizedPhone}`);
    } catch (mongoErr) {
      console.warn('[AUTH]: ⚠️  MongoDB error saving phone —', mongoErr.message);
      return res.status(503).json({ error: 'Could not save phone number' });
    }

    let requiresMFA = false;
    if (user.mfaEnabled && !user.mfaVerified) {
      console.log('[MFA DEBUG] Sending OTP after phone save to:', user.phoneNumber);
      const sid = await sendOTP(user.phoneNumber, socketId);
      await storeMfaSid(uid, sid);
      requiresMFA = true;
      console.log('[AUTH]: ✅ MFA OTP sent after phone save to', user.phoneNumber);
      if (socketId) pulse(socketId, 'AUTH', 'Awaiting SMS code verification');
    }

    return res.status(200).json({
      success: true,
      requiresMFA,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (err) {
    console.error('[AUTH]: ❌ Save phone error —', err.message);
    return res.status(500).json({ error: 'Failed to save phone number: ' + err.message });
  }
};

const verifyMfa = async (req, res) => {
  const { uid } = req.user;
  const { code } = req.body;
  const socketId = req.headers['x-socket-id'] || null;

  if (!code) {
    return res.status(400).json({ error: 'OTP code is required' });
  }

  console.log('[MFA]: Verify request for uid:', uid);

  try {
    // Get user from database to get their phone number
    let user = null;
    try {
      user = await User.findOne({ uid });
    } catch (mongoErr) {
      console.warn('[MFA]: ⚠️  MongoDB error retrieving user —', mongoErr.message);
      return res.status(503).json({ error: 'Could not verify MFA' });
    }

    if (!user) {
      console.warn('[MFA]: ❌ User not found for uid:', uid);
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.phoneNumber) {
      console.warn('[MFA]: ❌ User has no phone number set —', uid);
      return res.status(400).json({ error: 'Phone number not set' });
    }

    // If MFA is disabled, skip verification
    if (!user.mfaEnabled) {
      console.log('[MFA]: ⚠️  MFA disabled for user —', uid);
      if (socketId) pulse(socketId, 'AUTH', `Session SECURE for ${uid}`);
      return res.status(200).json({ requiresMFA: false });
    }

    // Verify OTP with user's phone number
    console.log('[MFA DEBUG] Verifying OTP for user phone:', user.phoneNumber);
    const approved = await verifyOTP(user.phoneNumber, code, socketId);

    if (!approved) {
      console.warn('[MFA]: ❌ Invalid or expired OTP for uid:', uid);
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark user as MFA verified
    try {
      await User.findOneAndUpdate(
        { uid },
        { mfaVerified: true }
      );
      console.log('[MFA]: ✅ MFA verified, user marked as verified —', uid);
    } catch (mongoErr) {
      console.warn('[MFA]: ⚠️  Could not update MFA verified flag —', mongoErr.message);
    }

    // Try to delete from Redis
    try {
      await deleteMfaSid(uid);
    } catch (redisErr) {
      console.warn('[MFA]: ⚠️  Could not delete MFA sid from Redis —', redisErr.message);
    }

    console.log('[MFA]: ✅ Session SECURE for uid:', uid);
    if (socketId) pulse(socketId, 'AUTH', `Session SECURE for ${uid}`);

    return res.status(200).json({ requiresMFA: false });
  } catch (err) {
    console.error('[MFA]: ❌ Verification error —', err.message);
    return res.status(500).json({ error: 'MFA verification failed' });
  }
};

module.exports = { login, savePhone, verifyMfa };