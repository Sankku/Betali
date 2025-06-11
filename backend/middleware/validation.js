/**
 * Request validation middleware
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
          const errorMessage = error.details
            .map(detail => detail.message)
            .join(', ');
          
          return res.status(400).json({
            error: 'Validation failed',
            details: errorMessage
          });
        }
        
        req.body = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  };
  
  /**
   * Query parameter validation middleware
   */
  const validateQuery = (schema) => {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.query, { abortEarly: false });
        
        if (error) {
          const errorMessage = error.details
            .map(detail => detail.message)
            .join(', ');
          
          return res.status(400).json({
            error: 'Query validation failed',
            details: errorMessage
          });
        }
        
        req.query = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  };
  
  module.exports = { validateRequest, validateQuery };