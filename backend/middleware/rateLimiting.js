const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { Logger } = require('../utils/Logger');

const logger = new Logger('RateLimiting');

/**
 * General API rate limiting
 * Adjusted for development: 1000 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 minutes in prod
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Much more permissive in dev
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again after 15 minutes',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    res.status(429).json({
      error: 'Too many requests from this IP',
      message: 'Please try again after 15 minutes',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Strict rate limiting for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
    timestamp: new Date().toISOString()
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.error('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      body: req.body?.email ? { email: req.body.email } : undefined
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again after 15 minutes',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Moderate rate limiting for create/update operations
 * 20 requests per 5 minutes per IP (200 in dev)
 */
const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'development' ? 200 : 20, // More permissive in dev
  message: {
    error: 'Too many create/update requests',
    message: 'Please slow down your requests',
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    logger.warn('Create operation rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many create/update requests',
      message: 'Please slow down your requests',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Rate limiting for search operations
 * 50 requests per 5 minutes per IP (500 in dev)
 */
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'development' ? 500 : 50, // More permissive in dev
  message: {
    error: 'Too many search requests',
    message: 'Please reduce search frequency',
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    logger.warn('Search rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      query: req.query
    });
    res.status(429).json({
      error: 'Too many search requests',
      message: 'Please reduce search frequency',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Slow down middleware for gradual performance degradation
 * Starts slowing down after 50 requests in 15 minutes (500 in dev)
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: process.env.NODE_ENV === 'development' ? 500 : 50, // More permissive in dev
  delayMs: () => 500, // Add 500ms of delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  // Note: onLimitReached has been removed as it's deprecated in express-rate-limit v7
  // Alternative: use skip function or global error handler for logging
});

/**
 * Per-user rate limiting (requires authentication)
 * 200 requests per hour per authenticated user
 */
const createUserLimiter = (windowMs = 60 * 60 * 1000, max = 200) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // Use user ID if authenticated, fallback to IP
      return req.user?.id || req.ip;
    },
    message: {
      error: 'User rate limit exceeded',
      message: 'You have exceeded your request quota',
      timestamp: new Date().toISOString()
    },
    handler: (req, res) => {
      logger.warn('User rate limit exceeded', {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      res.status(429).json({
        error: 'User rate limit exceeded',
        message: 'You have exceeded your request quota',
        timestamp: new Date().toISOString()
      });
    }
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  createLimiter,
  searchLimiter,
  speedLimiter,
  createUserLimiter
};