const winston = require('winston');

/**
 * Winston logger configuration for structured logging
 * Replaces console.log statements with proper logging levels
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }),

  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
];

// Create logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on errors
  exitOnError: false,
});

// Create stream for morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Helper function to log with context
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Log message
 * @param {object} context - Additional context (userId, orgId, etc.)
 */
logger.logWithContext = (level, message, context = {}) => {
  const contextStr = Object.keys(context).length > 0
    ? ` | ${JSON.stringify(context)}`
    : '';
  logger[level](`${message}${contextStr}`);
};

/**
 * Helper for auth operations logging
 */
logger.auth = {
  signup: (userId, email) => logger.info(`Signup started | userId: ${userId} | email: ${email}`),
  signupSuccess: (userId, orgId) => logger.info(`Signup completed | userId: ${userId} | orgId: ${orgId}`),
  signupFailed: (userId, error) => logger.error(`Signup failed | userId: ${userId} | error: ${error}`),
  login: (email) => logger.info(`Login attempt | email: ${email}`),
  loginSuccess: (userId) => logger.info(`Login successful | userId: ${userId}`),
  loginFailed: (email, reason) => logger.warn(`Login failed | email: ${email} | reason: ${reason}`),
};

/**
 * Helper for database operations logging
 */
logger.db = {
  created: (entity, id) => logger.debug(`Created ${entity} | id: ${id}`),
  updated: (entity, id) => logger.debug(`Updated ${entity} | id: ${id}`),
  deleted: (entity, id) => logger.debug(`Deleted ${entity} | id: ${id}`),
  error: (operation, error) => logger.error(`DB ${operation} failed | error: ${error}`),
};

/**
 * Helper for organization operations
 */
logger.org = {
  created: (orgId, name) => logger.info(`Organization created | orgId: ${orgId} | name: ${name}`),
  userAdded: (orgId, userId, role) => logger.info(`User added to org | orgId: ${orgId} | userId: ${userId} | role: ${role}`),
};

module.exports = logger;
