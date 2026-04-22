require('dotenv').config();
require('./config/firebase');
require('./config/redis');

const connectMongo = require('./config/mongo');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const authRoutes = require('./routes/auth');

const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
// httpServer.listen(PORT, () => {
//   console.log(`[SERVER]: Running on port ${PORT}`);
// });

connectMongo().then(() => {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`[SERVER]: Running on port ${PORT}`);
  });
});

module.exports = { app, httpServer };