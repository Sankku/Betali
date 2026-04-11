const { Logger } = require('../utils/Logger');

const logger = new Logger('errorHandler');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.status || 500;
  let message = 'Internal server error';

  // Map common error messages to status codes if not already set
  if (!err.status) {
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
  } else {
    message = err.message;
  }

  // Determine log level
  const logMethod = statusCode >= 500 ? 'error' : 'warn';
  const logTitle = statusCode >= 500 ? 'Unhandled error occurred' : 'Business error occurred';

  logger[logMethod](logTitle, {
    error: err.message,
    statusCode,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    ...(statusCode >= 500 && { stack: err.stack })
  });

  // Final response
  res.status(statusCode).json({
    error: err.key ? req.t(err.key, err.params) : message,
    error_key: err.key || null,
    error_params: err.params || {},
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