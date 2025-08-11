const { createClient } = require('@supabase/supabase-js');
const { Logger } = require('../utils/Logger');
require('dotenv').config();

const logger = new Logger('AuthMiddleware');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Authentication middleware
 * Provides error handling and logging
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication attempt without proper authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized. Bearer token required.',
        code: 'MISSING_TOKEN'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      let errorCode = 'INVALID_TOKEN';
      let errorMessage = 'Invalid or expired token.';
      
      if (error && error.message?.includes('expired')) {
        errorCode = 'TOKEN_EXPIRED';
        errorMessage = 'Token has expired.';
      }
      
      logger.warn('Authentication failed', {
        error: error?.message || 'User not found',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ 
        error: errorMessage,
        code: errorCode
      });
    }
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, role, is_active')
        .eq('user_id', user.id)
        .single();
      
      if (!userError && userData) {
        user.profile = userData;
        user.role = userData.role || 'VIEWER'; // Default role
        user.isActive = userData.is_active !== false; // Default to active
        
        // Check if user is active
        if (!user.isActive) {
          logger.warn('Inactive user attempted to authenticate', {
            userId: user.id,
            email: user.email
          });
          
          return res.status(403).json({
            error: 'Account is inactive',
            message: 'Your account has been deactivated. Please contact an administrator.',
            code: 'ACCOUNT_INACTIVE'
          });
        }
      } else {
        // If no profile found, assign default role
        user.role = 'VIEWER';
        user.isActive = true;
      }
    } catch (dbError) {
      logger.warn('Could not fetch user profile data', {
        userId: user.id,
        error: dbError.message
      });
      // Assign default values if database query fails
      user.role = 'VIEWER';
      user.isActive = true;
    }
    
    req.user = user;
    
    logger.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    
    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    return res.status(500).json({ 
      error: 'Internal authentication error.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      req.user = user;
    }
  } catch (error) {
    logger.warn('Optional authentication failed', { error: error.message });
  }
  
  next();
};

module.exports = { 
  authenticateUser, 
  optionalAuth,
  supabase 
};