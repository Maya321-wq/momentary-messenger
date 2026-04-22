const User = require('../models/User');

const login = async (req, res) => {
  const { uid, name, picture } = req.user;

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      user = await User.create({ uid, displayName: name, photoURL: picture });
      console.log(`[AUTH]: New user registered — ${uid}`);
    } else {
      console.log(`[AUTH]: Returning user — ${uid}`);
    }

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

module.exports = { login };