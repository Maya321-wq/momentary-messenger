const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => console.log('[REDIS]: Connected to Redis'));
redis.on('error', (err) => console.error('[REDIS]: Error —', err.message));

module.exports = redis;