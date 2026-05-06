require('dotenv').config();

// ==================== ENVIRONMENT VALIDATION ====================
const requiredEnvVars = [
  'PORT',
  'CLIENT_URL',
  'MONGO_URI',
  'REDIS_URL',
  'FIREBASE_SERVICE_ACCOUNT_PATH',
];

console.log('[STARTUP]: Validating environment variables...');
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`[STARTUP]: ❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}
console.log('[STARTUP]: ✅ All required environment variables present');

// Log startup config (hide sensitive values)
console.log('[STARTUP]: Configuration:');
console.log(`  PORT: ${process.env.PORT}`);
console.log(`  CLIENT_URL: ${process.env.CLIENT_URL}`);
console.log(`  MONGO_URI: ${process.env.MONGO_URI.split('?')[0]}`);
console.log(`  REDIS_URL: ${process.env.REDIS_URL}`);

// ==================== INITIALIZE SERVICES ====================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const { isInitialized: firebaseInitialized } = require('./config/firebase');
require('./config/redis'); // Starts connection immediately

const connectMongo = require('./config/mongo');
const pulseService = require('./services/pulseService');

const app = express();
const httpServer = http.createServer(app);

// Configure Socket.io with stable settings
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: false,
    methods: ["GET", "POST"],
    allowEIO3: true,
  },
  transports: ["websocket", "polling"],  // WebSocket primary, polling fallback
  pingInterval: 25000,
  pingTimeout: 20000,
  perMessageDeflate: false,
});

app.set('io', io);
pulseService.init(io);

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      firebase: firebaseInitialized ? '✅' : '❌',
    }
  });
});

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  console.error(`[ERROR]: 404 Not Found — ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR]: ${err.status || 500} — ${err.message}`);
  console.error(`[ERROR]: ${req.method} ${req.path}`);
  if (err.stack) console.error(`[ERROR]: Stack —`, err.stack);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

// ==================== SOCKET.IO HANDLERS ====================
io.on('connection', (socket) => {
  console.log(`[SOCKET]: Client connected — ${socket.id}`);

  // Log all socket errors
  socket.on('error', (error) => {
    console.error(`[SOCKET]: Error on socket ${socket.id} —`, error);
  });

  /**
   * Authentication handshake:
   * Client MUST emit 'auth' with { token } before any messages are processed.
   * This extracts user metadata and stores it in socket.data for later use.
   */
  socket.on('auth', async (data) => {
    const { token } = data;

    if (!token) {
      socket.emit('auth:error', { message: 'Token required' });
      socket.disconnect();
      return;
    }

    try {
      const { admin, isInitialized } = require('./config/firebase');

      if (!isInitialized) {
        socket.emit('auth:error', { message: 'Firebase not initialized' });
        socket.disconnect();
        return;
      }

      // Verify the Firebase token
      const decoded = await admin.auth().verifyIdToken(token);
      const { uid, email, name, picture } = decoded;

      // Store user metadata in socket
      socket.data.uid = uid;
      socket.data.email = email;
      socket.data.displayName = name || email || uid.slice(0, 10);
      socket.data.photoURL = picture || '';

      // Confirm auth success to client
      socket.emit('auth:success', {
        uid,
        displayName: socket.data.displayName,
        photoURL: socket.data.photoURL,
      });

      console.log(`[AUTH]: Socket ${socket.id} authenticated as ${uid}`);

      // Now that socket is authenticated, register event handlers
      const { handleChatEvents } = require('./sockets/chatHandler');
      const { handlePresenceEvents } = require('./sockets/presenceHandler');
      handleChatEvents(socket, io);
      handlePresenceEvents(socket, io);
    } catch (err) {
      console.error(`[AUTH]: Token verification failed — ${err.message}`);
      socket.emit('auth:error', { message: 'Invalid token' });
      socket.disconnect();
    }
  });

  socket.on('disconnect', (reason) => {
    const uid = socket.data?.uid || 'unknown';
    console.log(`[SOCKET]: Client disconnected — ${socket.id} (${uid}) — Reason: ${reason}`);
  });
});

// Start presence heartbeat to keep user presence fresh
const { startPresenceHeartbeat } = require('./sockets/presenceHandler');
startPresenceHeartbeat(io);

// Start TTL monitor to handle message expiration
const { startTTLMonitor } = require('./services/ttlService');
startTTLMonitor(io);

// ==================== STARTUP ====================
connectMongo().then(() => {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`[SERVER]: ✅ Running on port ${PORT}`);
    console.log(`[SERVER]: Ready to accept connections`);
  });
}).catch((err) => {
  console.error(`[SERVER]: Fatal startup error —`, err.message);
  process.exit(1);
});

module.exports = { app, httpServer, io };
module.exports = { app, httpServer, io };
