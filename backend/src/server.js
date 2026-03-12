require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');

const { testConnection } = require('./config/db');
const { redis }          = require('./config/redis');
const routes             = require('./routes/index');
const { errorHandler, generalLimiter } = require('./middleware/errorHandler');
const logger             = require('./utils/logger');

const app = express();

// ─── Ensure logs directory ────────────────────────────────────────────────────
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving images
}));

app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    if (!origin || allowed.includes(origin)) return cb(null, true);
    console.log(allowed);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Request Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ─── Static files (attendance capture images) ────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
};

start();
