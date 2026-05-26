require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');
const { errorHandler } = require('./src/middleware/error.middleware');
const authRoutes = require('./src/routes/auth.routes');
const workspaceRoutes = require('./src/routes/workspace.routes');
const taskRoutes = require('./src/routes/task.routes');
const activityRoutes = require('./src/routes/activity.routes');

const app = express();

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ─── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // HTTP request logger in dev
}

// ─── Rate Limiter (Auth routes only) ──────────────────────────────────────────
// Req 5: Prevent brute-force attacks on login/register
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX) || 10,                          // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Task routes are nested under workspaces: /api/workspaces/:workspaceId/tasks
app.use('/api/workspaces/:workspaceId/tasks', taskRoutes);

// Activity routes: /api/workspaces/:workspaceId/activity
app.use('/api/workspaces/:workspaceId/activity', activityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'TeamFlow API is running', env: process.env.NODE_ENV });
});

// 404 handler — catch all unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;
