require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

require('./config/firebase');
require('./config/redis');

const connectMongo = require('./config/mongo');
const pulseService = require('./services/pulseService');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});

app.set('io', io);
pulseService.init(io);

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

io.on('connection', (socket) => {
  console.log(`[SOCKET]: Client connected — ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[SOCKET]: Client disconnected — ${socket.id}`);
  });
});

connectMongo().then(() => {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`[SERVER]: Running on port ${PORT}`);
  });
});

module.exports = { app, httpServer, io };