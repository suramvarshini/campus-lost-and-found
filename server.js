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
const { getDbStatus } = require('./config/db');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend files and uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Core API Routes
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/auth', authRoutes);

// Comprehensive Health & Database Status Route
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStatus();
  const statusCode = dbStatus.connected ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus.connected ? 'online' : 'degraded',
    system: 'Campus Lost and Found API',
    database: {
      connected: dbStatus.connected,
      state: dbStatus.state,
      storageType: dbStatus.storageType,
      isPermanent: dbStatus.isPermanent,
      host: dbStatus.host,
      name: dbStatus.name
    },
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
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  const dbConnected = await connectDB();

  // Requirement 6: Do not start the production server with a failed database connection
  if (isProduction && !dbConnected) {
    console.error('[Server Fatal] Permanent MongoDB Atlas connection failed in production. Refusing to start server.');
    process.exit(1);
  }

  // Safely ensure administrator exists without modifying or resetting items
  if (dbConnected) {
    try {
      const User = require('./models/User');
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@campus.edu';
        const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? require('crypto').randomBytes(8).toString('hex') : 'admin123');
        
        console.log(`[Server] No admin user detected. Initializing administrator (${adminEmail})...`);
        await User.create({
          name: 'Campus System Admin',
          email: adminEmail,
          password: adminPassword,
          role: 'admin'
        });
        if (isProduction && !process.env.ADMIN_PASSWORD) {
          console.warn(`[Security Notice] Generated random admin password: ${adminPassword} (Set ADMIN_PASSWORD in environment variables to customize)`);
        } else {
          console.log(`[Server] Administrator initialized: ${adminEmail}`);
        }
      }
    } catch (adminErr) {
      console.warn('[Server Warning] Admin check failed:', adminErr.message);
    }
  }

  // Requirement 7 & 8: Never auto-seed in production
  if (!isProduction && process.env.AUTO_SEED === 'true') {
    try {
      const Item = require('./models/Item');
      const itemCount = await Item.countDocuments();
      if (itemCount === 0) {
        console.log('[Server Dev] Auto-seeding initial development demo data...');
        const seedDB = require('./seed');
        await seedDB(false);
      }
    } catch (seedErr) {
      console.warn('[Server Warning] Dev seed check failed:', seedErr.message);
    }
  }

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
