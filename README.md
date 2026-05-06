# 🔮 Momentary Messenger

> **Ephemeral real-time chat with automatic message expiration**

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![Tests](https://img.shields.io/badge/tests-all%20passing-blue)
![Docs](https://img.shields.io/badge/docs-complete-success)

---

## ✨ Features

- 🔐 **Google Firebase Authentication** — Secure login with JWT tokens
- 🔒 **MFA Security** — Optional SMS verification with Twilio
- 💬 **Real-time Chat** — Instant messaging via Socket.io WebSockets
- 👥 **Presence Tracking** — See who's online in real-time
- 🚀 **Ephemeral Messages** — Auto-delete after 120 seconds
- 👻 **Ghost Wipe** — Dramatic message expiration animation
- 📊 **System Monitor** — Real-time event logging dashboard
- 💾 **No Persistence** — Messages never stored permanently
- 🛡️ **Graceful Degradation** — Works without MongoDB/Redis/Twilio
- ⚡ **Production Ready** — Full error handling and logging

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure

**Server** — Edit `server/.env`:
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
# Optional: MONGO_URI, REDIS_URL, Firebase/Twilio credentials
```

**Client** — Edit `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
# Firebase credentials from console
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Run

**Terminal 1: Backend**
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2: Frontend**
```bash
cd client
npm run dev
# Runs on http://localhost:3000
```

### 4. Open Browser
```
http://localhost:3000
→ Click "Sign in with Google"
→ Complete authentication
→ Start chatting!
```

See [QUICK_START.md](QUICK_START.md) for detailed setup.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](QUICK_START.md) | 5-minute setup guide |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Complete technical documentation |
| [COMPLETION_REPORT.md](COMPLETION_REPORT.md) | What was built and why |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guide |

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express
- Socket.io (real-time)
- Firebase Admin (auth)
- MongoDB (optional user storage)
- Redis (optional message cache)
- Twilio (optional MFA)

**Frontend:**
- Next.js 14 (React)
- TypeScript
- Socket.io Client
- Firebase SDK
- Tailwind CSS (custom UI)

### Data Flow

```
User Login
    ↓
Firebase Google Auth
    ↓
JWT Token Generated
    ↓
POST /auth/login (verify token)
    ↓
Create/Find User
    ↓
Send MFA OTP (optional)
    ↓
POST /auth/mfa/verify (if needed)
    ↓
Socket.io Connect
    ↓
emit 'auth' { token }
    ↓
Server Verifies Token
    ↓
Socket Authenticated
    ↓
Real-time Chat Ready
```

---

## 💬 Socket.io Events

### Client → Server

| Event | Payload | Purpose |
|-------|---------|---------|
| `auth` | `{ token }` | Authenticate socket connection |
| `message:send` | `{ toUid, content }` | Send message |
| `room:join` | `{ roomId }` | Join chat room |
| `room:leave` | `{ roomId }` | Leave chat room |

### Server → Client

| Event | Payload | Purpose |
|-------|---------|---------|
| `auth:success` | `{ uid, displayName, photoURL }` | Auth successful |
| `auth:error` | `{ message }` | Auth failed |
| `message:receive` | `ChatMessage` | New message |
| `presence:update` | `{ uid: isOnline, ... }` | Online users |
| `ghost:wipe` | (empty) | Messages expired |
| `pulse:event` | `{ tag, message, ts }` | System event |

---

## 📊 Database Schemas

### MongoDB: User
```js
{
  uid: String,          // Firebase UID (unique)
  displayName: String,
  photoURL: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Redis: Messages
```
Key: chat:<uid1>_<uid2>
Type: List (JSON)
TTL: 120 seconds
```

### Redis: Presence
```
Key: presence:<uid>
Type: String (JSON)
TTL: 30 seconds (refreshed every 15s)
```

---

## 🔒 Security

- ✅ Firebase JWT verification on every connection
- ✅ Token-based authentication (no sessions)
- ✅ CORS configured for your domain
- ✅ No persistent message storage
- ✅ Automatic session expiry (MFA OTP: 5 min)
- ✅ Rate limiting ready (implement as needed)
- ✅ Error handling without exposing internals

---

## 🛠️ Configuration

### Environment Variables

See `.env.example` files in `server/` and `client/` directories.

**Most Important:**
- `NEXT_PUBLIC_API_URL` — Backend URL (frontend)
- `CLIENT_URL` — Frontend URL (backend)
- Firebase credentials (both)
- Optional: MongoDB, Redis, Twilio

### Message TTL

**Default:** 120 seconds

To change:
1. Backend: `REDIS_TTL_SECONDS=<seconds>` in `.env`
2. Frontend: `NEXT_PUBLIC_CHAT_TTL_SECONDS=<seconds>` in `.env.local`

---

## 📊 System Events

All system events logged to **System Pulse Monitor**:

| Tag | Color | Examples |
|-----|-------|----------|
| AUTH | 🔵 Blue | Login, token verified, MFA sent |
| SOCKET | 🟡 Yellow | Connected, reconnecting, authenticated |
| REDIS | 🔴 Red | Cache hit, TTL set, presence update |
| GHOST | 🟣 Purple | Message wipe, TTL expired |
| TWILIO | 🟠 Orange | OTP sent, verified, failed |
| ERROR | 🔴 Red | Connection failed, auth failed, server error |
| SYSTEM | 🟢 Green | Server startup, health checks |

---

## 🧪 Testing

### Manual Testing
1. Open two browser windows
2. Login with different Google accounts
3. Send messages between them
4. Watch messages expire after 120s
5. Monitor System Pulse for events

### Automated Testing
```bash
cd server
npm test

cd ../client
npm test
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to fetch" | Verify server on port 5000, check CORS |
| Socket timeout | Check API URL, verify frontend/backend ports |
| Google login fails | Verify Firebase credentials in `.env.local` |
| MongoDB errors | Errors are safe; app runs without MongoDB |
| Redis errors | Errors are safe; messages stored in memory |

See [QUICK_START.md](QUICK_START.md#troubleshooting) for more.

---

## 📈 Deployment

### Local Development
```bash
npm run dev  # Runs on localhost:3000 + :5000
```

### Production
See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Heroku deployment
- AWS EC2 setup
- DigitalOcean App Platform
- Vercel/Netlify (frontend)
- Database configuration
- SSL/TLS setup
- Monitoring & logging

---

## 📁 Project Structure

```
momentary-messenger/
├── server/
│   ├── src/
│   │   ├── index.js              # Express + Socket.io
│   │   ├── config/               # Firebase, MongoDB, Redis
│   │   ├── sockets/              # Chat, Presence handlers
│   │   ├── services/             # Pulse, TTL, Twilio
│   │   └── controllers/          # Auth logic
│   └── package.json
│
├── client/
│   ├── app/
│   │   ├── chat/page.tsx         # Main chat interface
│   │   ├── login/page.tsx        # Google login
│   │   └── mfa/page.tsx          # OTP verification
│   ├── components/               # UI components
│   ├── hooks/                    # Auth, Socket logic
│   ├── lib/                      # Firebase, Socket config
│   └── package.json
│
├── QUICK_START.md                # Setup guide
├── IMPLEMENTATION.md             # Technical docs
├── COMPLETION_REPORT.md          # What was built
├── DEPLOYMENT.md                 # Production guide
└── README.md                     # This file
```

---

## 🔄 Git Workflow

```bash
# Develop
git checkout -b feature/my-feature

# Test locally
npm run dev

# Commit
git commit -am "Add my feature"

# Push
git push origin feature/my-feature

# Create Pull Request
# Review, test, merge

# Deploy to production
git push production main
```

---

## 📞 Support

**Documentation:**
- Read [IMPLEMENTATION.md](IMPLEMENTATION.md) for technical details
- Check [QUICK_START.md](QUICK_START.md#troubleshooting) for common issues
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

**Debugging:**
1. Check browser console for errors
2. Check server logs for `[TAG]:` messages
3. Use System Pulse Monitor to watch events in real-time
4. Verify environment variables are set correctly

---

## 📜 License

MIT License — Feel free to use for personal or commercial projects.

---

## 🎓 Learning Resources

- **Socket.io**: https://socket.io/docs/
- **Next.js**: https://nextjs.org/docs
- **Firebase**: https://firebase.google.com/docs
- **Express**: https://expressjs.com/

---

## 🚀 Future Enhancements

- [ ] Group chat support
- [ ] Image/file sharing
- [ ] End-to-end encryption
- [ ] Message search
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] Dark mode toggle
- [ ] Custom emoji reactions

---

## 🙏 Credits

Built with ❤️ using:
- Node.js
- Next.js
- Socket.io
- Firebase
- MongoDB
- Redis
- Twilio

---

**Ready to chat? Start with [QUICK_START.md](QUICK_START.md)! 🚀**
