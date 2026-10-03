import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import followupRoutes from './routes/followupRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { getMe } from './controllers/authController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local development and deployed frontend origins
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
app.use('/api', generalLimiter);

// Health & Root Status Check
app.get(['/', '/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'Parul LeadDesk API',
    version: '1.0.0',
    endpoint: '/api',
    timestamp: new Date().toISOString(),
  });
});

// Direct specification route: GET /api/me (Section 42)
app.get('/api/me', authenticate, getMe);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/follow-ups', followupRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Requested API endpoint does not exist',
    code: 'NOT_FOUND',
  });
});

// Global Error Handler
app.use(errorHandler);

import { startFollowUpScheduler } from './services/followupScheduler.js';

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 PARUL LEADDESK API Server running on port ${PORT}`);
    console.log(`📍 Endpoint: http://localhost:${PORT}/api`);
    console.log(`🌐 Client Origin: ${CLIENT_ORIGIN}`);
    console.log(`==================================================\n`);

    // Start background push notification scheduler (runs every minute in IST)
    startFollowUpScheduler();
  });
}

export default app;
