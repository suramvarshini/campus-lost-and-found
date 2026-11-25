/**
 * Campus Lost and Found System - File Upload Middleware
 * Uses memory storage to process uploads directly in memory so they can be
 * saved permanently as Base64 Data URIs in MongoDB Atlas, avoiding Render's
 * ephemeral filesystem wipeouts on container restarts.
 */

const multer = require('multer');
const path = require('path');

// Memory Storage: buffers file in RAM for permanent storage in MongoDB
const storage = multer.memoryStorage();

// File filter supporting common images and PDF documents for proof
const fileFilter = (req, file, cb) => {
  const allowedExts = /jpeg|jpg|png|webp|gif|pdf/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isMimeValid = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';

  if (allowedExts.test(ext) || isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload an image (JPG, PNG, WEBP) or PDF proof.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per image
  fileFilter: fileFilter
});

module.exports = upload;
