let _io = null;

const init = (io) => { _io = io; };

const pulse = (socketId, tag, message) => {
  if (!_io) return;
  const event = { tag: tag.toUpperCase(), message, ts: new Date().toISOString() };
  _io.to(socketId).emit('pulse', event);
  console.log(`[${event.tag}]: ${message}`);
};

const pulseRoom = (roomId, tag, message) => {
  if (!_io) return;
  const event = { tag: tag.toUpperCase(), message, ts: new Date().toISOString() };
  _io.to(roomId).emit('pulse', event);
  console.log(`[${event.tag}]: ${message}`);
};

module.exports = { init, pulse, pulseRoom };