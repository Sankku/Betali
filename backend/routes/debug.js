const express = require('express');
const DebugController = require('../controllers/DebugController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();
const debugController = new DebugController();

// Debug routes (only enable in development)
if (process.env.NODE_ENV === 'development') {
  router.get('/auth', authenticateUser, debugController.debugAuthData.bind(debugController));
}

module.exports = router;