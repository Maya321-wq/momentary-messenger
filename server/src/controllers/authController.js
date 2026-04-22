const User = require('../models/User');
const { pulse } = require('../services/pulseService');
const { storeMfaSid, deleteMfaSid } = require('../services/redisService');
const { sendOTP, verifyOTP } = require('../services/twilioService');

const login = async (req, res) => {
  const { uid, name, picture } = req.user;
  const socketId = req.headers['x-socket-id'] || null;

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      user = await User.create({ uid, displayName: name, photoURL: picture });
      if (socketId) pulse(socketId, 'AUTH', `New user registered — ${uid}`);
    } else {
      if (socketId) pulse(socketId, 'AUTH', `Token verified for ${uid}`);
    }

    const phone = process.env.MFA_PHONE_NUMBER;
    const sid = await sendOTP(phone);
    await storeMfaSid(uid, sid);

    if (socketId) pulse(socketId, 'TWILIO', `MFA challenge dispatched to ${phone}`);
    if (socketId) pulse(socketId, 'AUTH', 'Awaiting SMS code verification');

    return res.status(200).json({
      status: 'PENDING_MFA',
      user: {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (err) {
    console.error('[AUTH]: Login error —', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyMfa = async (req, res) => {
  const { uid } = req.user;
  const { code } = req.body;
  const socketId = req.headers['x-socket-id'] || null;

  if (!code) return res.status(400).json({ error: 'OTP code is required' });

  try {
    const phone = process.env.MFA_PHONE_NUMBER;
    const approved = await verifyOTP(phone, code);

    if (!approved) return res.status(401).json({ error: 'Invalid or expired OTP' });

    await deleteMfaSid(uid);

    if (socketId) pulse(socketId, 'TWILIO', 'SMS code verified. Session promoted to SECURE');
    if (socketId) pulse(socketId, 'AUTH', `Session SECURE for ${uid}`);

    return res.status(200).json({ status: 'SECURE' });
  } catch (err) {
    console.error('[MFA]: Verification error —', err.message);
    return res.status(500).json({ error: 'MFA verification failed' });
  }
};

module.exports = { login, verifyMfa };