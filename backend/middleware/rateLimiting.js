const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { Logger } = require('../utils/Logger');

const logger = new Logger('RateLimiting');

const isProd = process.env.NODE_ENV === 'production';

// In non-production or test environments, we export "No-op" middleware 
// to avoid IPv6 validation errors and performance issues during E2E.
const noopMiddleware = (req, res, next) => next();

/**
 * Key generator: prefer authenticated user ID over IP.
 */
const userAwareKey = (req) => req.user?.id || req.ip;

// Helper to skip rate limiting in non-production
const shouldSkip = () => !isProd || process.env.NODE_ENV === 'test';

/**
 * General API rate limiting.
 */
const generalLimiter = !isProd ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: userAwareKey,
  message: {
    error: 'Too many requests',
    message: 'Please try again in a few minutes',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Strict rate limiting for authentication endpoints
 */
const authLimiter = !isProd ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
    timestamp: new Date().toISOString()
  }
});

/**
 * Moderate rate limiting for create/update/delete operations.
 */
const createLimiter = !isProd ? noopMiddleware : rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  keyGenerator: userAwareKey,
  message: {
    error: 'Too many requests',
    message: 'Please slow down your requests',
    timestamp: new Date().toISOString()
  }
});

/**
 * Rate limiting for read/search operations.
 */
const searchLimiter = !isProd ? noopMiddleware : rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 200,
  keyGenerator: userAwareKey,
  message: {
    error: 'Too many requests',
    message: 'Please reduce request frequency',
    timestamp: new Date().toISOString()
  }
});

/**
 * Strict rate limiting for bulk import operations.
 * Max 5 imports per user per 15 minutes.
 */
const bulkImportLimiter = !isProd ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: userAwareKey,
  message: {
    error: 'Too many import requests',
    message: 'Please wait before importing again',
    timestamp: new Date().toISOString()
  }
});

/**
 * Slow down middleware for gradual performance degradation.
 */
const speedLimiter = !isProd ? noopMiddleware : slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 300,
  delayMs: () => 300,
  maxDelayMs: 5000,
  keyGenerator: userAwareKey
});

/**
 * Per-user rate limiting (requires authentication).
 */
const createUserLimiter = (windowMs = 60 * 60 * 1000, max = 500) => {
  if (!isProd) return noopMiddleware;
  
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
      error: 'User rate limit exceeded',
      message: 'You have exceeded your request quota',
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
  searchLimiter,
  speedLimiter,
  createUserLimiter,
  bulkImportLimiter
};
