/**
 * Campus Lost and Found System - Auth Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', authController.loginAdmin);
router.get('/me', protect, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
