const { admin, isInitialized } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  if (!isInitialized) {
    console.error('[AUTH]: Firebase not initialized');
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || decoded.email || '',
      picture: decoded.picture || '',
    };
    console.log('[AUTH]: Token verified for uid:', decoded.uid);
    next();
  } catch (err) {
    console.error('[AUTH]: Token verification failed —', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;