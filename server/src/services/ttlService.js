const redis = require('../config/redis');
const { pulse, pulseRoom } = require('./pulseService');

/**
 * Redis TTL Wipe Service
 * 
 * Monitors Redis keys for expiration and emits ghost:wipe events
 * when chat room TTLs are reached.
 * 
 * Note: Since Redis keys expire passively/actively, we use a polling strategy
 * to check for wipes and notify connected clients.
 */

let pollIntervalId = null;
const POLL_INTERVAL = 5000; // Check every 5 seconds
const wipeCallbacks = new Set();
const trackedRooms = new Set(); // Track which rooms we've seen

/**
 * Register a callback to be notified when a room is wiped
 */
const onWipe = (callback) => {
  wipeCallbacks.add(callback);
  return () => wipeCallbacks.delete(callback);
};

/**
 * Start the TTL monitoring service
 */
const startTTLMonitor = (io) => {
  if (pollIntervalId) {
    console.warn('[TTL]: Monitor already running');
    return;
  }

  console.log('[TTL]: Starting TTL monitor service');

  pollIntervalId = setInterval(async () => {
    try {
      const isRedisAvailable = redis.isAvailable?.() ?? true;
      
      if (!isRedisAvailable) {
        // Redis not available, skip monitoring
        return;
      }

      // Query all chat room keys (format: "uid1_uid2")
      const roomKeys = await redis.keys('*_*').catch(() => []);
      
      // Filter to only include room keys (exclude presence, otp, etc)
      const chatRoomKeys = roomKeys.filter(key => !key.startsWith('presence:') && !key.startsWith('otp:'));

      // Check for rooms that were tracked but no longer exist
      for (const trackedRoom of trackedRooms) {
        if (!chatRoomKeys.includes(trackedRoom)) {
          // Room was wiped
          notifyWipe(trackedRoom, io);
          trackedRooms.delete(trackedRoom);
        }
      }

      // Update tracked rooms
      for (const roomKey of chatRoomKeys) {
        trackedRooms.add(roomKey);
      }
    } catch (err) {
      console.error('[TTL]: Monitor error —', err.message);
    }
  }, POLL_INTERVAL);
};

/**
 * Notify that a room has been wiped
 */
const notifyWipe = (roomKey, io) => {
  console.log(`[TTL]: Room ${roomKey} wiped (TTL expired)`);

  // Emit to all clients in that room
  io.to(roomKey).emit('ghost:wipe');

  // Call registered callbacks
  for (const callback of wipeCallbacks) {
    try {
      callback(roomKey);
    } catch (err) {
      console.error('[TTL]: Wipe callback error —', err.message);
    }
  }
};

/**
 * Stop the TTL monitor
 */
const stopTTLMonitor = () => {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
    console.log('[TTL]: TTL monitor stopped');
  }
};

module.exports = {
  startTTLMonitor,
  stopTTLMonitor,
  onWipe,
  notifyWipe,
};
