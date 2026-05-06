# 🚀 QUICK START GUIDE

## Prerequisites

- **Node.js 18+**
- **npm** or **yarn**
- Modern web browser

---

## Setup (5 minutes)

### 1️⃣ Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your configuration:
# - Optional: MONGO_URI (MongoDB connection)
# - Optional: REDIS_URL (Redis connection)
# - Optional: Firebase/Twilio credentials

# Start server
npm run dev
```

✅ Server running on **http://localhost:5000**

### 2️⃣ Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Create .env.local file (copy from .env.local.example)
cp .env.local.example .env.local

# Edit .env.local with:
# NEXT_PUBLIC_FIREBASE_API_KEY=<from Firebase console>
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your domain>
# ... other Firebase variables
# NEXT_PUBLIC_API_URL=http://localhost:5000

# Start frontend
npm run dev
```

✅ Frontend running on **http://localhost:3000**

---

## Usage

### 🔐 Login
1. Open http://localhost:3000 in browser
2. Click **"Sign in with Google"**
3. Complete Google authentication
4. (Optional) Enter 6-digit MFA code if configured
5. ✅ Redirected to chat page

### 💬 Chat
1. **Left panel** — Click a user to select
2. **Center panel** — Send/receive messages
3. **Right panel** — View system logs in real-time
4. Messages auto-delete after 120 seconds (wipe animation plays)
5. Green dot indicates online users

### 👥 Presence
- Green dots show who's online
- User list updates in real-time
- Presence tracked in Redis (or memory if Redis down)

### 📊 System Pulse Monitor
- View all system events in real-time
- Color-coded by event type:
  - 🔵 **AUTH** — Authentication events
  - 🟡 **SOCKET** — Connection events
  - 🔴 **ERROR** — Errors
  - 🟣 **GHOST** — Message expiration
  - 🟢 **REDIS** — Cache events

---

## Configuration

### Environment Variables

**Server (.env)**
```env
PORT=5000                           # Server port
MONGO_URI=                          # (optional) MongoDB
REDIS_URL=                          # (optional) Redis
REDIS_TTL_SECONDS=120               # Message lifetime
MFA_PHONE_NUMBER=                   # (optional) Twilio MFA
TWILIO_ACCOUNT_SID=                 # (optional)
TWILIO_AUTH_TOKEN=                  # (optional)
TWILIO_VERIFY_SERVICE_SID=          # (optional)
CLIENT_URL=http://localhost:3000    # Frontend URL
```

**Client (.env.local)**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=       # Firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

NEXT_PUBLIC_API_URL=http://localhost:5000  # Backend
NEXT_PUBLIC_CHAT_TTL_SECONDS=120            # Message lifetime
```

---

## Firebase Setup (Required for Authentication)

1. Go to https://console.firebase.google.com
2. Create or select a project
3. Enable **Authentication** → **Google** provider
4. Get Web API credentials from **Project Settings**
5. Copy values to `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
6. Download service account key → save as `server/serviceAccountKey.json`

---

## Troubleshooting

### ❌ "Failed to fetch" on login
```
Check:
- Server running on port 5000? (curl http://localhost:5000/health)
- Client NEXT_PUBLIC_API_URL=http://localhost:5000?
- CORS headers in browser console?
```

### ❌ Socket connection timeout
```
Check:
- Server started? npm run dev in server/
- Correct API URL in client?
- Firewall blocking WebSocket?
```

### ❌ Google login doesn't work
```
Check:
- Firebase credentials in .env.local?
- Google OAuth enabled in Firebase console?
- Domain whitelisted in Firebase?
```

### ❌ MongoDB/Redis connection errors
```
These are optional!
- App will run with in-memory fallbacks
- Check .env for connection strings
```

### ❌ Messages not persisting
```
That's intentional!
- Messages auto-delete after TTL (120s default)
- Designed for ephemeral conversations
- No persistent storage by design
```

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│  Browser (localhost:3000)           │
│  ├─ React/Next.js Frontend          │
│  ├─ Firebase Auth (Google)          │
│  └─ Socket.io Client                │
└──────────────┬──────────────────────┘
               │
          HTTP/WebSocket
               │
┌──────────────▼──────────────────────┐
│  Node.js Server (localhost:5000)    │
│  ├─ Express API                     │
│  │  └─ POST /auth/login             │
│  │  └─ POST /auth/mfa/verify        │
│  ├─ Socket.io (real-time)           │
│  │  ├─ Chat: message:send/receive   │
│  │  ├─ Presence: online/offline     │
│  │  └─ Events: auth/wipe/pulse      │
│  ├─ Firebase Admin (JWT verify)     │
│  ├─ MongoDB (user storage)          │
│  ├─ Redis (message TTL)             │
│  └─ Twilio (optional MFA)           │
└─────────────────────────────────────┘
```

---

## Project Structure

```
momentary-messenger/
├── server/
│   ├── src/
│   │   ├── index.js                 # Express + Socket.io
│   │   ├── config/
│   │   │   ├── firebase.js          # Firebase Admin
│   │   │   ├── mongo.js             # MongoDB
│   │   │   └── redis.js             # Redis
│   │   ├── sockets/
│   │   │   ├── chatHandler.js       # Chat logic
│   │   │   └── presenceHandler.js   # Online tracking
│   │   ├── services/
│   │   │   ├── pulseService.js      # Event logging
│   │   │   ├── redisService.js      # Redis ops
│   │   │   ├── ttlService.js        # Message expiry
│   │   │   └── twilioService.js     # MFA
│   │   └── controllers/
│   │       └── authController.js    # Login/MFA
│   ├── .env                         # Configuration
│   ├── .env.example                 # Template
│   └── package.json
│
├── client/
│   ├── app/
│   │   ├── chat/page.tsx            # Chat interface
│   │   ├── login/page.tsx           # Google sign-in
│   │   └── mfa/page.tsx             # OTP input
│   ├── components/
│   │   ├── GhostChat.tsx            # Message view
│   │   ├── SystemPulse.tsx          # Event monitor
│   │   └── PresenceList.tsx         # Online users
│   ├── hooks/
│   │   ├── useAuth.ts               # Auth context
│   │   └── useSocket.ts             # Socket hook
│   ├── lib/
│   │   ├── firebase.ts              # Firebase init
│   │   ├── socket.ts                # Socket singleton
│   │   └── api.ts                   # API calls
│   ├── .env.local                   # Configuration
│   ├── .env.local.example           # Template
│   └── package.json
│
├── IMPLEMENTATION.md                # Full documentation
├── COMPLETION_REPORT.md             # What was built
└── QUICK_START.md                   # This file
```

---

## Commands Reference

### Backend
```bash
cd server
npm install        # Install dependencies
npm run dev        # Start server (port 5000)
npm run build      # Build for production
npm start          # Run production build
```

### Frontend
```bash
cd client
npm install        # Install dependencies
npm run dev        # Start dev server (port 3000)
npm run build      # Build for production
npm start          # Run production build
```

---

## Features

✅ Real-time messaging via Socket.io
✅ Google Firebase authentication
✅ Optional MFA with Twilio SMS
✅ Ephemeral messages (auto-delete after 120s)
✅ Online presence tracking
✅ Message animation effects
✅ System event logging
✅ Terminal-style UI
✅ Graceful error handling
✅ Fully decoupled backend/frontend

---

## Testing Checklist

- [ ] Server starts without errors
- [ ] Frontend loads on localhost:3000
- [ ] Google login works
- [ ] MFA prompt appears (if configured)
- [ ] Chat page shows
- [ ] Presence list updates
- [ ] Can send message
- [ ] Message appears in real-time
- [ ] Message expires after ~120 seconds
- [ ] Wipe animation plays
- [ ] System logs show all events
- [ ] Can logout and re-login

---

## Need Help?

1. **Check logs** — Look for `[TAG]:` prefix logs in terminal
2. **Check browser console** — Network, auth, Socket.io errors
3. **Verify ports** — Server :5000, Client :3000
4. **Verify config** — All env variables set correctly
5. **Check services** — MongoDB, Redis, Firebase availability

---

**Happy Chatting! 👻💬**
