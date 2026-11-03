/**
 * Campus Lost and Found System - Database Configuration
 * Connects to MongoDB with automatic fallback to MongoMemoryServer if offline.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus_lost_and_found';

  try {
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] Connected to local MongoDB: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.log('[Database Notice] Local MongoDB service not active on port 27017.');
    console.log('[Database Notice] Starting MongoMemoryServer (Zero-Config Mode)...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();

      const conn = await mongoose.connect(memUri);
      console.log(`[Database] In-Memory MongoDB connected at ${memUri}`);
    } catch (memError) {
      console.error('[Database Error] Failed to initialize MongoMemoryServer:', memError.message);
    }
  }
};

module.exports = connectDB;
