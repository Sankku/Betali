const { Logger } = require('../utils/Logger');

const logger = new Logger('errorHandler');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, _next) => {
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
  });

  let statusCode = 500;
  let message = 'Internal server error';

  if (err.message.includes('not found')) {
    statusCode = 404;
    message = err.message;
  } else if (err.message.includes('Access denied') || err.message.includes('Unauthorized')) {
    statusCode = 403;
    message = err.message;
  } else if (
    err.message.includes('required') ||
    err.message.includes('Invalid') ||
    err.message.includes('Cannot deactivate') ||
    err.message.includes('Cannot delete') ||
    err.message.includes('cannot be empty') ||
    err.message.includes('has associated') ||
    err.message.includes('has stock movements') ||
    err.message.includes('Reassign') ||
    err.message.includes('limit') ||
    // Stock movement business errors
    err.message.includes('excedería el stock') ||
    err.message.includes('Stock insuficiente') ||
    err.message.includes('Insuficiente') ||
    err.message.includes('insuficiente')
  ) {
    statusCode = 400;
    message = err.message;
  } else if (err.message.includes('already exists')) {
    statusCode = 409;
    message = err.message;
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 handler middleware
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
};

module.exports = { errorHandler, notFoundHandler };