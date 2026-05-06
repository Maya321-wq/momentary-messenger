const redis = require('../config/redis');

const TTL = parseInt(process.env.REDIS_TTL_SECONDS) || 120;

// In-memory message storage fallback
const memoryMessageStore = new Map(); // roomId -> [messages]

/**
 * Build a deterministic room key from two UIDs
 * Format: "roomId" (already in correct format from chatHandler)
 */
const getRoomKey = (roomId) => {
  // roomId is passed directly from chatHandler as [uid1, uid2].sort().join('_')
  // No need to rebuild it
  return roomId;
};

/**
 * Save a message to Redis with TTL, fallback to memory if Redis unavailable
 */
const saveMessage = async (roomId, message) => {
  const key = getRoomKey(roomId);
  
  try {
    const isRedisAvailable = redis.isAvailable?.() ?? true;
    if (isRedisAvailable) {
      await redis.lpush(key, JSON.stringify(message));
      await redis.expire(key, TTL);
      return { key, ttl: TTL, storage: 'redis' };
    } else {
      throw new Error('Redis unavailable');
    }
  } catch (err) {
    console.warn(`[REDIS]: Failed to save to Redis, using memory fallback —`, err.message);
    // Fallback to memory
    if (!memoryMessageStore.has(key)) {
      memoryMessageStore.set(key, []);
    }
    memoryMessageStore.get(key).unshift(message);
    
    // Set expiration timer for memory storage
    setTimeout(() => {
      memoryMessageStore.delete(key);
      console.log(`[MEMORY]: Message room ${key} expired`);
    }, TTL * 1000);
    
    return { key, ttl: TTL, storage: 'memory' };
  }
};

/**
 * Load all messages from a room (in chronological order)
 */
const getMessages = async (roomId) => {
  const key = getRoomKey(roomId);
  
  try {
    const isRedisAvailable = redis.isAvailable?.() ?? true;
    if (isRedisAvailable) {
      const raw = await redis.lrange(key, 0, -1).catch(() => []);
      return raw.map((m) => JSON.parse(m)).reverse();
    } else {
      throw new Error('Redis unavailable');
    }
  } catch (err) {
    console.warn(`[REDIS]: Failed to load from Redis, using memory fallback —`, err.message);
    // Fallback to memory
    const messages = memoryMessageStore.get(key) || [];
    return [...messages].reverse();
  }
};

/**
 * Store MFA OTP SID with 5-minute expiry
 */
const storeMfaSid = async (uid, sid) => {
  try {
    const isRedisAvailable = redis.isAvailable?.() ?? true;
    if (isRedisAvailable) {
      await redis.set(`otp:${uid}`, sid, 'EX', 300);
    } else {
      // Memory fallback for MFA
      memoryMessageStore.set(`otp:${uid}`, sid);
      setTimeout(() => {
        memoryMessageStore.delete(`otp:${uid}`);
      }, 300000); // 5 minutes
    }
  } catch (err) {
    console.error('[REDIS]: Failed to store MFA SID —', err.message);
    throw err;
  }
};

/**
 * Retrieve MFA OTP SID
 */
const getMfaSid = async (uid) => {
  try {
    const isRedisAvailable = redis.isAvailable?.() ?? true;
    if (isRedisAvailable) {
      return await redis.get(`otp:${uid}`).catch(() => null);
    } else {
      return memoryMessageStore.get(`otp:${uid}`) || null;
    }
  } catch (err) {
    console.error('[REDIS]: Failed to retrieve MFA SID —', err.message);
    return null;
  }
};

/**
 * Delete MFA OTP SID
 */
const deleteMfaSid = async (uid) => {
  try {
    const isRedisAvailable = redis.isAvailable?.() ?? true;
    if (isRedisAvailable) {
      await redis.del(`otp:${uid}`).catch(() => {});
    } else {
      memoryMessageStore.delete(`otp:${uid}`);
    }
  } catch (err) {
    console.error('[REDIS]: Failed to delete MFA SID —', err.message);
  }
};

module.exports = {
  getRoomKey,
  saveMessage,
  getMessages,
  storeMfaSid,
  getMfaSid,
  deleteMfaSid,
};