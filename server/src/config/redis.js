const Redis = require('ioredis');

let redis;
let redisConnected = false;
let redisAvailable = true;

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('[REDIS]: ❌ REDIS_URL not set in .env');
  process.exit(1);
}

console.log('[REDIS]: Attempting connection to', REDIS_URL);

redis = new Redis(REDIS_URL, {
  enableReadyCheck: false,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    // Fail after 5 retry attempts, then use memory fallback
    if (times > 5) {
      console.warn('[REDIS]: ❌ Failed to connect after 5 attempts. Continuing in MEMORY mode.');
      redisAvailable = false;
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 2000);
    console.warn(`[REDIS]: Retry attempt ${times}, waiting ${delay}ms...`);
    return delay;
  },
});

redis.on('connect', () => {
  redisConnected = true;
  redisAvailable = true;
  console.log('[REDIS]: ✅ Connected');
});

redis.on('ready', () => {
  redisAvailable = true;
  console.log('[REDIS]: ✅ Ready to accept commands');
});

redis.on('error', (err) => {
  redisConnected = false;
  console.error('[REDIS]: ❌ Error —', err.message);
});

redis.on('close', () => {
  redisConnected = false;
  console.warn('[REDIS]: Connection closed');
});

redis.on('reconnecting', () => {
  console.log('[REDIS]: Attempting to reconnect...');
});

redis.on('end', () => {
  redisAvailable = false;
  console.warn('[REDIS]: Connection ended - using MEMORY fallback');
});

module.exports = redis;
module.exports.isConnected = () => redisConnected;
module.exports.isAvailable = () => redisAvailable;
module.exports.setAvailable = (val) => { redisAvailable = val; };