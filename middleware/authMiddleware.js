/**
 * Campus Lost and Found System - Authentication Middleware
 * Protects administrative verification and item moderation endpoints using JWT.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'campus_lost_and_found_jwt_secret_key_2026';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No authentication token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User account no longer exists'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: Invalid or expired token'
    });
  }
};

const protectAdmin = async (req, res, next) => {
  await protect(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Insufficient administrative privileges'
    });
  });
};

module.exports = {
  protect,
  protectAdmin,
  JWT_SECRET
};
