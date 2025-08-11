/**
 * Request validation middleware using Joi schemas
 * Enhanced with better error handling and sanitization
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.body, { 
          abortEarly: false,
          stripUnknown: true, // Remove unknown fields for security
          convert: true // Convert types automatically
        });
        
        if (error) {
          const errorDetails = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          const errorMessage = error.details
            .map(detail => detail.message)
            .join(', ');
          
          return res.status(400).json({
            error: 'Validation failed',
            message: errorMessage,
            details: errorDetails,
            timestamp: new Date().toISOString()
          });
        }
        
        // Use validated and sanitized data
        req.body = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  };
  
  /**
   * Query parameter validation middleware using Joi schemas
   * Enhanced with better error handling and type conversion
   */
  const validateQuery = (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.query, { 
          abortEarly: false,
          stripUnknown: true, // Remove unknown query params
          convert: true // Convert string numbers to actual numbers
        });
        
        if (error) {
          const errorDetails = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          const errorMessage = error.details
            .map(detail => detail.message)
            .join(', ');
          
          return res.status(400).json({
            error: 'Query validation failed',
            message: errorMessage,
            details: errorDetails,
            timestamp: new Date().toISOString()
          });
        }
        
        // Use validated and converted query parameters
        req.query = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  };

  /**
   * Route parameter validation middleware
   * For validating URL parameters like :id
   */
  const validateParams = (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.params, { 
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });
        
        if (error) {
          const errorDetails = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          const errorMessage = error.details
            .map(detail => detail.message)
            .join(', ');
          
          return res.status(400).json({
            error: 'Parameter validation failed',
            message: errorMessage,
            details: errorDetails,
            timestamp: new Date().toISOString()
          });
        }
        
        req.params = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  };
  
  module.exports = { validateRequest, validateQuery, validateParams };