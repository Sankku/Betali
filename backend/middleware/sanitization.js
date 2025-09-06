const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const validator = require('validator');
const xss = require('xss');
const { Logger } = require('../utils/Logger');

const logger = new Logger('Sanitization');

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Enhanced input sanitization middleware
 * Protects against XSS, SQL injection, and other input-based attacks
 */

/**
 * Sanitize a string value
 * @param {string} value - Value to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized value
 */
function sanitizeString(value, options = {}) {
  if (typeof value !== 'string') return value;
  
  const {
    allowHtml = false,
    stripTags = true,
    escapeQuotes = true,
    normalizeWhitespace = true,
    maxLength = null
  } = options;
  
  let sanitized = value;
  
  // Basic XSS protection
  if (!allowHtml) {
    sanitized = xss(sanitized, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  } else {
    // Allow safe HTML tags only
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  }
  
  // Strip HTML tags if requested
  if (stripTags && !allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  // Escape quotes
  if (escapeQuotes) {
    sanitized = sanitized
      .replace(/'/g, '&#x27;')
      .replace(/"/g, '&quot;');
  }
  
  // Normalize whitespace
  if (normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
  }
  
  // Truncate if max length specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize email
 * @param {string} email - Email to sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return null;
  
  const normalized = validator.normalizeEmail(email, {
    gmail_lowercase: true,
    gmail_remove_dots: false,
    outlookdotcom_lowercase: true,
    yahoo_lowercase: true,
    icloud_lowercase: true
  });
  
  return validator.isEmail(normalized) ? normalized : null;
}

/**
 * Sanitize URL
 * @param {string} url - URL to sanitize
 * @returns {string|null} - Sanitized URL or null if invalid
 */
function sanitizeUrl(url) {
  if (typeof url !== 'string') return null;
  
  // Allow only HTTP and HTTPS protocols
  const options = {
    protocols: ['http', 'https'],
    require_protocol: false,
    require_host: true,
    require_valid_protocol: true,
    allow_underscores: false,
    host_whitelist: false,
    host_blacklist: false,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false
  };
  
  return validator.isURL(url, options) ? url : null;
}

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @param {Object} rules - Sanitization rules for specific fields
 * @returns {Object} - Sanitized object
 */
function sanitizeObject(obj, rules = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldRules = rules[key] || {};
    
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeObject(item, fieldRules) : sanitizeValue(item, fieldRules)
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, fieldRules);
    } else {
      sanitized[key] = sanitizeValue(value, fieldRules);
    }
  }
  
  return sanitized;
}

/**
 * Sanitize a single value based on its type and rules
 * @param {*} value - Value to sanitize
 * @param {Object} rules - Sanitization rules
 * @returns {*} - Sanitized value
 */
function sanitizeValue(value, rules = {}) {
  if (value === null || value === undefined) return value;
  
  const { type = 'string', ...options } = rules;
  
  switch (type) {
    case 'email':
      return sanitizeEmail(value);
    case 'url':
      return sanitizeUrl(value);
    case 'string':
      return sanitizeString(value, options);
    case 'number':
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    case 'boolean':
      return Boolean(value);
    case 'date':
      return validator.isISO8601(value) ? value : null;
    default:
      return sanitizeString(String(value), options);
  }
}

/**
 * Express middleware for input sanitization
 * @param {Object} rules - Field-specific sanitization rules
 * @returns {Function} - Express middleware
 */
function sanitizeMiddleware(rules = {}) {
  return (req, res, next) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        const originalBody = JSON.stringify(req.body);
        req.body = sanitizeObject(req.body, rules.body || {});
        
        const sanitizedBody = JSON.stringify(req.body);
        if (originalBody !== sanitizedBody) {
          logger.info('Request body sanitized', {
            userId: req.user?.id,
            url: req.originalUrl,
            method: req.method,
            sanitizationApplied: true
          });
        }
      }
      
      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        const originalQuery = JSON.stringify(req.query);
        req.query = sanitizeObject(req.query, rules.query || {});
        
        const sanitizedQuery = JSON.stringify(req.query);
        if (originalQuery !== sanitizedQuery) {
          logger.info('Query parameters sanitized', {
            userId: req.user?.id,
            url: req.originalUrl,
            sanitizationApplied: true
          });
        }
      }
      
      // Sanitize route parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params, rules.params || {});
      }
      
      next();
    } catch (error) {
      logger.error('Sanitization middleware error', {
        error: error.message,
        userId: req.user?.id,
        url: req.originalUrl
      });
      
      return res.status(500).json({
        error: 'Input processing error',
        message: 'Unable to process request data',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Predefined sanitization rules for common use cases
 */
const SANITIZATION_RULES = {
  // Product sanitization rules
  product: {
    body: {
      name: { type: 'string', maxLength: 255, normalizeWhitespace: true },
      description: { type: 'string', maxLength: 1000, allowHtml: false },
      batch_number: { type: 'string', maxLength: 100, normalizeWhitespace: true },
      origin_country: { type: 'string', maxLength: 100, normalizeWhitespace: true },
      expiration_date: { type: 'date' },
      senasa_product_id: { type: 'string', maxLength: 100 }
    }
  },
  
  // Warehouse sanitization rules
  warehouse: {
    body: {
      name: { type: 'string', maxLength: 255, normalizeWhitespace: true },
      location: { type: 'string', maxLength: 500, normalizeWhitespace: true },
      description: { type: 'string', maxLength: 1000, allowHtml: false },
      capacity: { type: 'number' },
      is_active: { type: 'boolean' }
    }
  },
  
  // User sanitization rules
  user: {
    body: {
      name: { type: 'string', maxLength: 100, normalizeWhitespace: true },
      email: { type: 'email', maxLength: 100 },
      password: { type: 'string', maxLength: 128 },
      role: { type: 'string', maxLength: 50 },
      organization_id: { type: 'string', maxLength: 36 },
      branch_id: { type: 'string', maxLength: 36 },
      is_active: { type: 'boolean' }
    }
  },
  
  // Stock movement sanitization rules
  stockMovement: {
    body: {
      movement_type: { type: 'string', maxLength: 50 },
      quantity: { type: 'number' },
      reference: { type: 'string', maxLength: 500, allowHtml: false },
      notes: { type: 'string', maxLength: 1000, allowHtml: false },
      movement_date: { type: 'date' },
      unit_cost: { type: 'number' }
    }
  },
  
  // Authentication sanitization rules
  auth: {
    body: {
      email: { type: 'email', maxLength: 100 },
      password: { type: 'string', maxLength: 128 },
      name: { type: 'string', maxLength: 100, normalizeWhitespace: true },
      organization_name: { type: 'string', maxLength: 255, normalizeWhitespace: true },
      user_id: { type: 'string', maxLength: 36 }
    }
  },
  
  // General purpose sanitization
  general: {
    body: {
      name: { type: 'string', maxLength: 255, normalizeWhitespace: true },
      description: { type: 'string', maxLength: 1000, allowHtml: false },
      type: { type: 'string', maxLength: 100 },
      value: { type: 'number' },
      rate: { type: 'number' },
      organization_id: { type: 'string', maxLength: 36 }
    }
  },
  
  // Search and query sanitization
  search: {
    query: {
      q: { type: 'string', maxLength: 255, normalizeWhitespace: true },
      limit: { type: 'number' },
      offset: { type: 'number' },
      sortBy: { type: 'string', maxLength: 50 },
      sortOrder: { type: 'string', maxLength: 10 }
    }
  }
};

module.exports = {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeObject,
  sanitizeValue,
  sanitizeMiddleware,
  SANITIZATION_RULES
};