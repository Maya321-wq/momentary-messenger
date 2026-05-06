const { pulse, pulseRoom } = require('../services/pulseService');
const { saveMessage, getMessages } = require('../services/redisService');

const handleChatEvents = (socket, io) => {
  // Track which rooms this socket has joined
  const joinedRooms = new Set();

  /**
   * message:send { toUid, content }
   * Sends a message to a specific user (1-on-1 conversation).
   * Backend saves to Redis and broadcasts to recipient.
   */
  socket.on('message:send', async (data) => {
    const { toUid, content } = data;
    const fromUid = socket.data?.uid;

    if (!fromUid || !toUid || !content) {
      console.warn('[SOCKET]: Invalid message:send payload', { fromUid, toUid, content });
      return;
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return;
    }

    try {
      // Build room ID (deterministic: sort UIDs)
      const roomId = [fromUid, toUid].sort().join('_');

      // Construct message object
      const message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        from: fromUid,
        fromName: socket.data?.displayName || fromUid.slice(0, 10),
        content: content.trim(),
        ts: Date.now(),
      };

      // Save to Redis with TTL
      await saveMessage(roomId, message);

      // Emit to all users in the room (including sender for local echo confirmation)
      io.to(roomId).emit('message:receive', message);

      console.log(`[SOCKET]: Message sent from ${fromUid} to ${toUid} in room ${roomId}`);
    } catch (err) {
      console.error('[SOCKET]: message:send error —', err.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  /**
   * room:join { roomId }
   * User joins a 1-on-1 conversation room.
   * Loads message history and notifies others in the room.
   */
  socket.on('room:join', async (data) => {
    const { roomId } = data;
    const uid = socket.data?.uid;

    if (!roomId || !uid) {
      console.warn('[SOCKET]: Invalid room:join payload', { roomId, uid });
      return;
    }

    try {
      socket.join(roomId);
      joinedRooms.add(roomId);

      // Load message history from Redis
      const messages = await getMessages(roomId);

      // Emit each historical message individually to this socket
      // This way they appear naturally in the chat history
      for (const msg of messages) {
        socket.emit('message:receive', msg);
      }

      pulseRoom(roomId, 'SOCKET', `${uid.slice(0, 10)} joined room`);
      console.log(`[SOCKET]: ${uid} joined room ${roomId}. Loaded ${messages.length} messages.`);
    } catch (err) {
      console.error('[SOCKET]: room:join error —', err.message);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  /**
   * room:leave { roomId }
   * User explicitly leaves a room.
   */
  socket.on('room:leave', (data) => {
    const { roomId } = data;
    const uid = socket.data?.uid;

    if (!roomId) return;

    socket.leave(roomId);
    joinedRooms.delete(roomId);

    pulseRoom(roomId, 'SOCKET', `${uid?.slice(0, 10)} left room`);
    console.log(`[SOCKET]: ${uid} left room ${roomId}`);
  });

  /**
   * Cleanup on disconnect
   */
  socket.on('disconnect', () => {
    const uid = socket.data?.uid;
    console.log(`[SOCKET]: ${uid || 'unknown'} disconnected`);
    // Rooms are auto-cleaned by Socket.io
  });
};

module.exports = { handleChatEvents };
