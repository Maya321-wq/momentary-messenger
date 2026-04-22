const redis = require('../config/redis');

const TTL = parseInt(process.env.REDIS_TTL_SECONDS) || 120;

const getRoomKey = (uid1, uid2) => {
  const sorted = [uid1, uid2].sort();
  return `chat:${sorted[0]}_${sorted[1]}`;
};

// Signature changed to (roomId, message) to match issue #6 spec
const saveMessage = async (roomId, message) => {
  await redis.lpush(roomId, JSON.stringify(message));
  await redis.expire(roomId, TTL);
  return { key: roomId, ttl: TTL };
};

const getMessages = async (roomId) => {
  const raw = await redis.lrange(roomId, 0, -1);
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