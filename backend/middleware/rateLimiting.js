const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { Logger } = require('../utils/Logger');

const logger = new Logger('RateLimiting');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Key generator: prefer authenticated user ID over IP.
 * This prevents all users behind the same proxy/CDN from
 * sharing a single rate limit bucket (a common issue in hosted envs
 * where req.ip resolves to an internal IP like 100.64.x.x).
 */
const userAwareKey = (req) => req.user?.id || req.ip;

/**
 * General API rate limiting.
 * Uses user ID when authenticated so each user has their own bucket.
 * Limit: 500 req / 15 min per user (well above normal SaaS usage).
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 500 : 10000,
  skip: () => !isProd,
  keyGenerator: userAwareKey,
  message: {
    error: 'Too many requests',
    message: 'Please try again in a few minutes',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again in a few minutes',
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
 * Moderate rate limiting for create/update/delete operations.
 * Per user (not IP) to avoid shared-proxy false positives.
 * Limit: 100 req / 5 min — generous for real usage, blocks abuse.
 */
const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isProd ? 100 : 10000,
  skip: () => !isProd,
  keyGenerator: userAwareKey,
  message: {
    error: 'Too many requests',
    message: 'Please slow down your requests',
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    logger.warn('Create operation rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down your requests',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Rate limiting for read/search operations.
 * Per user. Limit: 200 req / 5 min.
 * High enough to support React Query refetches, org switches, etc.
 */
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isProd ? 200 : 10000,
  skip: () => !isProd,
  keyGenerator: userAwareKey,
  message: {
    error: 'Too many requests',
    message: 'Please reduce request frequency',
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    logger.warn('Search rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      query: req.query
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please reduce request frequency',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Slow down middleware for gradual performance degradation.
 * Kicks in after 300 req / 15 min per user — well above normal usage.
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: isProd ? 300 : 5000,
  delayMs: () => 300,
  maxDelayMs: 5000,
  keyGenerator: userAwareKey,
  skip: () => !isProd,
});

/**
 * Per-user rate limiting (requires authentication).
 * Default: 500 req / hour per user.
 */
const createUserLimiter = (windowMs = 60 * 60 * 1000, max = 500) => {
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