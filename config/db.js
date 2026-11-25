/**
 * Campus Lost and Found System - Database Configuration
 * Connects to MongoDB Atlas / Permanent MongoDB cluster.
 * Strictly disables temporary in-memory storage in production to ensure
 * data is never wiped during server restarts or deployments.
 */

const mongoose = require('mongoose');

let isMemoryDB = false;
let dbError = null;

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const connStr = process.env.MONGO_URI || (isProduction ? null : 'mongodb://127.0.0.1:27017/campus_lost_and_found');

  if (isProduction && (!process.env.MONGO_URI || !process.env.MONGO_URI.startsWith('mongodb'))) {
    const errorMsg = '[Database Fatal Error] MONGO_URI is missing or invalid in production! A permanent MongoDB Atlas connection string (mongodb+srv://...) is strictly required.';
    console.error(errorMsg);
    dbError = errorMsg;
    // In production, NEVER fall back to MongoMemoryServer
    return false;
  }

  try {
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 15000, // 15 seconds for MongoDB Atlas TLS handshakes
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000
    });
    isMemoryDB = false;
    dbError = null;
    console.log(`[Database] Connected successfully to permanent MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return true;
  } catch (error) {
    dbError = error.message;
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);

    if (isProduction) {
      console.error('[Database Critical] In-Memory fallback is DISABLED in production. All records must be stored permanently.');
      return false;
    }

    // Local Development Fallback ONLY (never used in production)
    console.log('[Database Dev Notice] Local MongoDB not reachable. Initializing MongoMemoryServer for offline development only...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();

      const conn = await mongoose.connect(memUri);
      isMemoryDB = true;
      dbError = null;
      console.log(`[Database Dev] MongoMemoryServer connected for offline development at ${memUri}`);
      return true;
    } catch (memError) {
      dbError = memError.message;
      console.error('[Database Error] Failed to initialize MongoMemoryServer:', memError.message);
      return false;
    }
  }
};

const getDbStatus = () => {
  const stateMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateCode = mongoose.connection.readyState;
  const isConnected = stateCode === 1;

  // Sanitize host to never expose credentials
  let safeHost = null;
  if (isConnected && mongoose.connection.host) {
    safeHost = mongoose.connection.host.replace(/.*@/, ''); // remove any user/pass prefix if present
  }

  return {
    connected: isConnected,
    state: stateMap[stateCode] || 'unknown',
    storageType: isMemoryDB ? 'Temporary In-Memory (Dev Only)' : 'Permanent MongoDB Storage',
    isPermanent: !isMemoryDB && isConnected,
    host: safeHost,
    name: isConnected ? mongoose.connection.name : null,
    error: dbError
  };
};

module.exports = connectDB;
module.exports.getDbStatus = getDbStatus;
