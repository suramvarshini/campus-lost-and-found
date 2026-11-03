/**
 * Campus Lost and Found System - Server Entry Point
 * Express REST API server for lost and found listings, claim verification,
 * and administrator workflow management.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files and uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Core API Routes
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/auth', authRoutes);

// Health Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Campus Lost and Found API',
    timestamp: new Date().toISOString()
  });
});

// Friendly HTML Route Fallbacks
app.get('/post-item', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/post-item.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin-login.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin-dashboard.html'));
});

// Fallback for SPA/Static routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Route Not Found' });
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  console.log('[Server] Initializing Campus Lost and Found System...');
  await connectDB();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` 🔍 Campus Lost & Found Server running!`);
    console.log(` 🌐 Public Web App:     http://localhost:${PORT}`);
    console.log(` 📢 Report Item:        http://localhost:${PORT}/post-item.html`);
    console.log(` 🛡️ Admin Portal:       http://localhost:${PORT}/admin-login.html`);
    console.log(` ⚡ Health Status:       http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
};

startServer();
