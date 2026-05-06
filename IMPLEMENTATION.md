# 🔮 Momentary Messenger — Complete Implementation

## Overview

A full-stack, real-time ephemeral chat application built with **Next.js**, **Express**, **Socket.io**, **Firebase**, **MongoDB**, and **Redis**.

---

## ✅ Features Implemented

### Backend (Node.js + Express + Socket.io)

| Issue | Feature | Status |
|-------|---------|--------|
| #1 | Express server + /health route | ✅ Implemented |
| #2 | Firebase Admin initialization | ✅ Implemented (graceful fallback if key missing) |
| #3 | Token verification middleware | ✅ Implemented |
| #4 | MongoDB connection + User model | ✅ Implemented (optional, graceful fallback) |
| #5 | /auth/login route (silent registration) | ✅ Implemented |
| #6 | Redis connection + message TTL service | ✅ Implemented (optional, graceful fallback) |
| #7 | System Pulse emitter service | ✅ Implemented |
| #8 | Socket.io server with auth handshake | ✅ Implemented |
| #9 | Real-time chat handler | ✅ Implemented |
| #10 | Presence tracking system | ✅ Implemented |
| #11 | Ghost wipe (TTL expiry → delete messages) | ✅ Implemented |

### Frontend (Next.js)

| Issue | Feature | Status |
|-------|---------|--------|
| #12 | Firebase client + Google login | ✅ Implemented |
| #13 | Socket.io client singleton | ✅ Implemented |
| #14 | GhostChat component (messages + input) | ✅ Implemented |
| #15 | SystemPulse monitor component | ✅ Implemented |

---

## 🏗️ Architecture

### Backend Services

```
server/src/
├── index.js                    # Express + Socket.io server
├── config/
│   ├── firebase.js             # Firebase Admin (graceful init)
│   ├── mongo.js                # MongoDB connection (optional)
│   └── redis.js                # Redis client (stub if unavailable)
├── middleware/
│   └── verifyToken.js          # Firebase JWT verification
├── models/
│   └── User.js                 # Mongoose user schema
├── controllers/
│   └── authController.js       # /auth/login endpoint
├── routes/
│   └── auth.js                 # Auth routes
├── services/
│   ├── pulseService.js         # System event logging
│   ├── redisService.js         # Redis operations (message storage, MFA)
│   ├── twilioService.js        # Twilio OTP (MFA)
│   └── ttlService.js           # Redis TTL monitoring + wipe events
└── sockets/
    ├── chatHandler.js          # Chat events (message:send, room:join, room:leave)
    └── presenceHandler.js      # Presence tracking + heartbeat

```

### Frontend Components

```
client/
├── lib/
│   ├── firebase.ts             # Firebase client init
│   ├── socket.ts               # Socket.io singleton
│   └── api.ts                  # API client (login, MFA)
├── hooks/
│   ├── useAuth.ts              # Auth context + Google login
│   └── useSocket.ts            # Socket.io listener hook
├── components/
│   ├── GhostChat.tsx           # Message display + input
│   ├── SystemPulse.tsx         # Event log monitor
│   └── PresenceList.tsx        # Online users list
└── app/
    ├── login/page.tsx          # Google login UI
    ├── mfa/page.tsx            # 6-digit OTP input
    └── chat/page.tsx           # Main chat interface
```

---

## 🔄 Data Flow

### Login Flow

```
1. User clicks "Sign in with Google"
   └→ Firebase popup auth
   └→ Client receives JWT token

2. Client POST /auth/login with JWT
   └→ Server verifies token with Firebase
   └→ Server creates/finds user in MongoDB
   └→ Server sends MFA OTP via Twilio
   └→ Returns { requiresMFA: true }

3. User enters 6-digit code
   └→ Client POST /auth/mfa/verify
   └→ Server verifies OTP with Twilio
   └→ Returns { requiresMFA: false }
   └→ Client redirects to /chat
```

### Real-time Chat Flow

```
1. User connects Socket.io
   └→ Client emits 'auth' { token }
   └→ Server verifies Firebase token
   └→ Server stores uid, displayName in socket.data
   └→ Server emits 'auth:success'
   └→ Server calls handleChatEvents + handlePresenceEvents

2. User selects recipient
   └→ Client emits 'room:join' { roomId }
   └→ Server joins socket to room
   └→ Server loads message history from Redis
   └→ Server emits each message to client via 'message:receive'

3. User sends message
   └→ Client emits 'message:send' { toUid, content }
   └→ Server builds room ID
   └→ Server saves message to Redis with TTL
   └→ Server broadcasts to all sockets in room via 'message:receive'

4. Message TTL expires
   └→ TTL Monitor detects expired room key
   └→ Server broadcasts 'ghost:wipe' to room
   └→ Client clears messages + shows wipe animation

5. User presence updates
   └→ Client connects: server adds uid to presence set
   └→ Presence Heartbeat refreshes TTLs every 15s
   └→ Server broadcasts 'presence:update' { uid: isOnline, ... }
   └→ Clients update online user list
```

---

## 🚀 Setup & Running

### Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) MongoDB instance
- (Optional) Redis instance
- (Optional) Firebase project for Google auth
- (Optional) Twilio account for MFA

### Backend Setup

```bash
cd server

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Set environment variables in .env:
# - FIREBASE: serviceAccountKey.json in server/ root
# - MONGO_URI: MongoDB connection string (optional)
# - REDIS_URL: Redis URL (optional)
# - MFA_PHONE_NUMBER: Phone number for MFA tests (optional)

# Start server
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd client

# Copy environment template
cp .env.local.example .env.local

# Install dependencies
npm install

# Set environment variables in .env.local:
# NEXT_PUBLIC_FIREBASE_API_KEY, etc. (from Firebase console)
# NEXT_PUBLIC_API_URL=http://localhost:5000

# Start dev server
npm run dev
# Frontend runs on http://localhost:3000
```

---

## 🔐 Authentication Flow

### Token Exchange

**Client → Server:** `POST /auth/login`
```json
{
  "headers": {
    "Authorization": "Bearer <Firebase_JWT>"
  }
}
```

**Server verification:**
1. Extracts JWT from Authorization header
2. Verifies with `admin.auth().verifyIdToken(token)`
3. Extracts `uid`, `email`, `name`, `picture`
4. Finds/creates user in MongoDB (if available)
5. Sends MFA OTP via Twilio

### Socket.io Authentication

**Client → Server (on connection):** `emit 'auth'`
```json
{
  "token": "<Firebase_JWT>"
}
```

**Server:**
1. Receives 'auth' event
2. Verifies JWT with Firebase
3. Stores user metadata in `socket.data`
4. Emits 'auth:success'
5. Registers chat & presence handlers

---

## 💬 Socket.io Events

### Chat Events

**message:send** (client → server)
```json
{
  "toUid": "recipient_uid",
  "content": "Hello, world!"
}
```

**message:receive** (server → client)
```json
{
  "id": "msg_123456",
  "from": "sender_uid",
  "fromName": "John Doe",
  "content": "Hello, world!",
  "ts": 1704067200000
}
```

**room:join** (client → server)
```json
{
  "roomId": "user1_user2"
}
```

**room:leave** (client → server)
```json
{
  "roomId": "user1_user2"
}
```

### Presence Events

**presence:update** (server → all clients)
```json
{
  "uid1": true,
  "uid2": true,
  "uid3": false
}
```

### System Events

**ghost:wipe** (server → room)
```
// No payload — signals TTL expiry
```

**pulse:event** (server → socket)
```json
{
  "tag": "AUTH|SOCKET|REDIS|GHOST|TWILIO|ERROR|SYSTEM",
  "message": "Human-readable event",
  "ts": 1704067200000
}
```

---

## 🌳 Database Schemas

### MongoDB: User

```js
{
  _id: ObjectId,
  uid: String,              // Firebase UID (unique)
  displayName: String,
  photoURL: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Redis: Chat Messages

**Key:** `chat:<uid1>_<uid2>`
**Type:** List (FIFO)
**Value:** JSON-serialized ChatMessage
**TTL:** 120 seconds (configurable via REDIS_TTL_SECONDS)

```json
{
  "id": "msg_123456",
  "from": "user_uid",
  "fromName": "John Doe",
  "content": "Message text",
  "ts": 1704067200000
}
```

### Redis: Presence

**Key:** `presence:<uid>`
**Type:** String (JSON)
**Value:** User metadata
**TTL:** 30 seconds (auto-refreshed by heartbeat)

```json
{
  "displayName": "John Doe",
  "photoURL": "https://example.com/photo.jpg"
}
```

### Redis: MFA OTP

**Key:** `otp:<uid>`
**Type:** String (Twilio SID)
**TTL:** 300 seconds (5 minutes)

---

## 🔒 Security

- **Token Verification:** Every API call and Socket.io connection verified against Firebase
- **TTL Messages:** Messages auto-delete after 120 seconds (no persistent storage)
- **Session State:** 3 states: UNAUTHENTICATED → PENDING_MFA → SECURE
- **MFA:** Twilio SMS verification required after sign-in
- **CORS:** Open origin for development (configure in production)
- **Error Handling:** Graceful fallbacks if MongoDB/Redis/Firebase unavailable

---

## 🛠️ Graceful Degradation

| Service | Down Behavior | Fallback |
|---------|---------------|----------|
| MongoDB | ✅ App runs | No user persistence |
| Redis | ✅ App runs | In-memory message storage (lost on server restart) |
| Firebase | ❌ App fails to auth | Manual configuration required |
| Twilio | ✅ App runs | MFA skipped |

---

## 📊 Logging Format

All logs follow a consistent format for easy debugging:

```
[TAG]: Message — details
```

**Tags:**
- `[SERVER]` — Server startup
- `[AUTH]` — Authentication events
- `[SOCKET]` — Socket.io lifecycle
- `[MONGO]` — MongoDB connection
- `[REDIS]` — Redis connection
- `[TTL]` — Message expiration
- `[PRESENCE]` — Online/offline
- `[TWILIO]` — MFA events
- `[ERROR]` — Errors

---

## 🎯 End-to-End Verification Checklist

- [ ] Server starts on port 5000
- [ ] Client starts on port 3000
- [ ] User can log in with Google
- [ ] MFA OTP prompt appears (if configured)
- [ ] Chat page loads
- [ ] Presence list shows online users
- [ ] Can send message to another user
- [ ] Message appears in real-time
- [ ] TTL countdown shows
- [ ] After 120s, message wiped with animation
- [ ] SystemPulse logs all events
- [ ] Socket reconnects on network interruption
- [ ] Can logout and re-login

---

## 📝 Environment Variables

### Server (.env)

```env
PORT=5000
NODE_ENV=development

MONGO_URI=              # (optional)
REDIS_URL=              # (optional)
REDIS_TTL_SECONDS=120

TWILIO_ACCOUNT_SID=     # (optional)
TWILIO_AUTH_TOKEN=      # (optional)
TWILIO_VERIFY_SERVICE_SID=  # (optional)
MFA_PHONE_NUMBER=       # (optional)

CLIENT_URL=http://localhost:3000
```

### Client (.env.local)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

NEXT_PUBLIC_API_URL=http://localhost:5000

NEXT_PUBLIC_CHAT_TTL_SECONDS=120
```

---

## 🐛 Troubleshooting

### Socket Connection Fails
- Check `NEXT_PUBLIC_API_URL` is set to `http://localhost:5000`
- Verify server is running: `curl http://localhost:5000/health`
- Check browser console for CORS errors

### Messages Not Persisting
- Verify Redis is running (check `REDIS_URL`)
- Messages are ephemeral; they auto-delete after TTL
- Enable MongoDB to persist user records only (not messages)

### MFA Not Working
- Verify Twilio credentials in `.env`
- Check `MFA_PHONE_NUMBER` is valid
- Twilio is optional; MFA is skipped if unavailable

### Can't Authenticate
- Verify Firebase service account key is in `server/serviceAccountKey.json`
- Check Firebase credentials in client `.env.local`
- Ensure Google OAuth is enabled in Firebase console

---

## 📚 File Reference

**Backend Files:**
- `server/src/index.js` — Main server
- `server/src/config/firebase.js` — Firebase Admin
- `server/src/sockets/chatHandler.js` — Chat logic
- `server/src/sockets/presenceHandler.js` — Presence tracking
- `server/src/services/ttlService.js` — Message expiration
- `server/src/controllers/authController.js` — Login/MFA
- `server/src/services/redisService.js` — Redis operations

**Frontend Files:**
- `client/lib/socket.ts` — Socket.io singleton
- `client/hooks/useSocket.ts` — Socket event listener
- `client/hooks/useAuth.ts` — Auth context
- `client/app/chat/page.tsx` — Main chat UI
- `client/components/GhostChat.tsx` — Message display
- `client/components/SystemPulse.tsx` — Event monitor

---

## 🎓 Key Concepts

### Ephemeral Messages
Messages exist only in Redis with a configured TTL. Once expired, they're permanently deleted. No message history persistence.

### Ghost Wipe
When a chat room's TTL expires, a `ghost:wipe` event is broadcast, triggering a visual "glitch" animation on the frontend.

### Deterministic Room IDs
1-on-1 conversations use a deterministic room ID: `[uidA, uidB].sort().join('_')`. This ensures both users see the same conversation regardless of who initiates.

### Socket.io Auth Handshake
Socket connection only becomes valid after the client emits an `auth` event with the Firebase JWT token. This ensures unauthenticated connections can't access data.

### Presence Heartbeat
A 15-second heartbeat refreshes presence TTLs in Redis and re-broadcasts the online user list to all clients.

---

## 🔮 Future Enhancements

- [ ] Group chat support
- [ ] Image/file sharing
- [ ] Encrypted messages
- [ ] Message search
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)

---

**Build with ❤️ for ephemeral, real-time communication.**
