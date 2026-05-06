const redis = require('../config/redis');
const { pulseRoom } = require('../services/pulseService');

// In-memory set of online UIDs (fallback when Redis is unavailable)
let onlineUsers = new Map(); // uid -> { displayName, photoURL }

const handlePresenceEvents = (socket, io) => {
  const uid = socket.data?.uid;
  const displayName = socket.data?.displayName;
  const photoURL = socket.data?.photoURL;

  if (!uid) return;

  /**
   * Track user online on connect
   */
  const addOnlineUser = async () => {
    try {
      // Always add to memory
      onlineUsers.set(uid, { displayName, photoURL });

      // Try to add to Redis with TTL (user auto-expires after 30s of inactivity)
      const isRedisAvailable = redis.isAvailable?.() ?? true;
      if (isRedisAvailable) {
        try {
          await redis.setex(`presence:${uid}`, 30, JSON.stringify({ displayName, photoURL }));
        } catch (redisErr) {
          console.warn('[PRESENCE]: Redis operation failed, using memory tracking only');
        }
      } else {
        console.warn('[PRESENCE]: Redis unavailable, using memory tracking only');
      }

      // Broadcast updated presence to all clients
      broadcastPresence(io);
      console.log(`[PRESENCE]: ${uid} online`);
    } catch (err) {
      console.error('[PRESENCE]: Error adding online user —', err.message);
    }
  };

  /**
   * Track user offline on disconnect
   */
  const removeOnlineUser = async () => {
    try {
      // Remove from memory
      onlineUsers.delete(uid);

      // Remove from Redis
      const isRedisAvailable = redis.isAvailable?.() ?? true;
      if (isRedisAvailable) {
        try {
          await redis.del(`presence:${uid}`);
        } catch (redisErr) {
          console.warn('[PRESENCE]: Redis unavailable');
        }
      }

      // Broadcast updated presence
      broadcastPresence(io);
      console.log(`[PRESENCE]: ${uid} offline`);
    } catch (err) {
      console.error('[PRESENCE]: Error removing online user —', err.message);
    }
  };

  // Register handlers
  socket.once('disconnect', removeOnlineUser);

  // Add to presence on first auth success
  addOnlineUser();
};

/**
 * Broadcast current presence map to all connected clients.
 * Format: { [uid]: isOnline }
 */
const broadcastPresence = async (io) => {
  try {
    let presenceMap = {};
    
    // Try to load from Redis first (ground truth)
    const isRedisAvailable = redis.isAvailable?.() ?? true;
    if (isRedisAvailable) {
      try {
        const keys = await redis.keys('presence:*').catch(() => []);
        for (const key of keys) {
          const uid = key.replace('presence:', '');
          presenceMap[uid] = true;
        }
      } catch (redisErr) {
        // Fallback to memory
        console.warn('[PRESENCE]: Redis unavailable, falling back to memory');
        for (const uid of onlineUsers.keys()) {
          presenceMap[uid] = true;
        }
      }
    } else {
      // Redis not available, use memory only
      for (const uid of onlineUsers.keys()) {
        presenceMap[uid] = true;
      }
    }

    // Emit to all connected clients
    io.emit('presence:update', presenceMap);
  } catch (err) {
    console.error('[PRESENCE]: Error broadcasting presence —', err.message);
  }
};

/**
 * Heartbeat: periodically refresh presence TTLs and broadcast
 * (ensures users stay online while their socket is connected)
 */
const startPresenceHeartbeat = (io, intervalMs = 15000) => {
  setInterval(async () => {
    try {
      const isRedisAvailable = redis.isAvailable?.() ?? true;
      if (isRedisAvailable) {
        // Refresh all Redis presence keys
        const keys = await redis.keys('presence:*').catch(() => []);
        for (const key of keys) {
          try {
            await redis.expire(key, 30);
          } catch (err) {
            // Redis may be down; continue
          }
        }
      }
      // Always re-broadcast (from Redis or memory)
      broadcastPresence(io);
    } catch (err) {
      console.error('[PRESENCE]: Heartbeat error —', err.message);
    }
  }, intervalMs);
};

module.exports = { handlePresenceEvents, broadcastPresence, startPresenceHeartbeat };
