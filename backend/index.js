const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001; // ganti ke 5001 untuk hindari konflik Windows

// Import routes
const parkingSessionsRoutes = require('./routes/parkingSessions');
const transactionsRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const liveMonitorRoutes = require('./routes/liveMonitor');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const usersRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');

// Middleware
app.use(cors()); // Handle CORS + preflight requests otomatis
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  if (req.method === 'POST') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// ============ API ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Parking Sessions routes
app.use('/api/parking-sessions', parkingSessionsRoutes);

// Transactions routes
app.use('/api/transactions', transactionsRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// Settings routes
app.use('/api/settings', settingsRoutes);

// Users routes (User management - Admin only)
app.use('/api/users', usersRoutes);

app.use('/api', liveMonitorRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route tidak ditemukan' });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 Backend running at http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
});