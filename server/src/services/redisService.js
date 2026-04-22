const redis = require('../config/redis');

const TTL = parseInt(process.env.REDIS_TTL_SECONDS) || 120;

const getRoomKey = (uid1, uid2) => {
  const sorted = [uid1, uid2].sort();
  return `chat:${sorted[0]}_${sorted[1]}`;
};

const saveMessage = async (uid1, uid2, message) => {
  const key = getRoomKey(uid1, uid2);
  await redis.lpush(key, JSON.stringify(message));
  await redis.expire(key, TTL);
  return { key, ttl: TTL };
};

const getMessages = async (uid1, uid2) => {
  const key = getRoomKey(uid1, uid2);
  const raw = await redis.lrange(key, 0, -1);
  return raw.map((m) => JSON.parse(m)).reverse();
};

const storeMfaSid = async (uid, sid) => {
  await redis.set(`otp:${uid}`, sid, 'EX', 300);
};

const getMfaSid = async (uid) => {
  return await redis.get(`otp:${uid}`);
};

const deleteMfaSid = async (uid) => {
  await redis.del(`otp:${uid}`);
};

module.exports = {
  getRoomKey,
  saveMessage,
  getMessages,
  storeMfaSid,
  getMfaSid,
  deleteMfaSid,
};