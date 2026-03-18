const multer = require('multer');
const { fromBuffer: fileTypeFromBuffer } = require('file-type');
// const mime = require('mime-types'); // TODO: Use when implementing MIME type validation
const path = require('path');
const fs = require('fs').promises;
const { Logger } = require('../utils/Logger');

const logger = new Logger('FileUpload');

/**
 * File upload middleware with comprehensive security validations
 * Protects against malicious file uploads and enforces size/type limits
 */

// File type configurations
const FILE_TYPES = {
  images: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Images (JPEG, PNG, GIF, WebP)'
  },
  documents: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ],
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Documents (PDF, Word, Excel, Text)'
  },
  csv: {
    mimeTypes: ['text/csv', 'application/csv', 'text/plain'],
    extensions: ['.csv', '.txt'],
    maxSize: 50 * 1024 * 1024, // 50MB for large data imports
    description: 'CSV files'
  }
};

// Global file size limits
const GLOBAL_LIMITS = {
  fileSize: 100 * 1024 * 1024, // 100MB absolute maximum
  files: 10, // Maximum 10 files per request
  fieldSize: 1024 * 1024, // 1MB for form fields
  fieldNameSize: 100, // 100 bytes for field names
  fields: 20 // Maximum 20 fields per request
};

/**
 * Validate file type by examining file content (magic numbers)
 * @param {Buffer} buffer - File buffer
 * @param {Array} allowedTypes - Array of allowed mime types
 * @returns {Promise<boolean>} - Is file type valid
 */
async function validateFileType(buffer, allowedTypes) {
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      logger.warn('Could not determine file type from buffer');
      return false;
    }
    
    return allowedTypes.includes(fileType.mime);
  } catch (error) {
    logger.error('Error validating file type', { error: error.message });
    return false;
  }
}

/**
 * Validate file extension
 * @param {string} filename - Original filename
 * @param {Array} allowedExtensions - Array of allowed extensions
 * @returns {boolean} - Is extension valid
 */
function validateFileExtension(filename, allowedExtensions) {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}

/**
 * Generate secure filename
 * @param {string} originalName - Original filename
 * @param {string} userId - User ID for uniqueness
 * @returns {string} - Secure filename
 */
function generateSecureFilename(originalName, userId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50); // Limit length
  
  return `${userId}_${timestamp}_${random}_${baseName}${ext}`;
}

/**
 * Create file upload middleware
 * @param {Object} options - Upload configuration
 * @returns {Function} - Multer middleware
 */
function createFileUpload(options = {}) {
  const {
    allowedTypes = 'images',
    // destination: _destination = './uploads', // TODO: Use when implementing custom upload destinations
    maxFiles = 5,
    requireAuth = true
  } = options;
  
  const typeConfig = FILE_TYPES[allowedTypes];
  if (!typeConfig) {
    throw new Error(`Invalid file type configuration: ${allowedTypes}`);
  }
  
  // Configure multer storage
  const storage = multer.memoryStorage(); // Store in memory for validation
  
  const upload = multer({
    storage,
    limits: {
      fileSize: typeConfig.maxSize,
      files: Math.min(maxFiles, GLOBAL_LIMITS.files),
      fieldSize: GLOBAL_LIMITS.fieldSize,
      fieldNameSize: GLOBAL_LIMITS.fieldNameSize,
      fields: GLOBAL_LIMITS.fields
    },
    fileFilter: (req, file, cb) => {
      try {
        // Check file extension first (quick check)
        if (!validateFileExtension(file.originalname, typeConfig.extensions)) {
          logger.warn('Invalid file extension', {
            filename: file.originalname,
            userId: req.user?.id,
            allowedExtensions: typeConfig.extensions
          });
          return cb(new Error(`Invalid file type. Allowed: ${typeConfig.description}`));
        }
        
        // Check declared MIME type
        if (!typeConfig.mimeTypes.includes(file.mimetype)) {
          logger.warn('Invalid MIME type', {
            filename: file.originalname,
            mimetype: file.mimetype,
            userId: req.user?.id,
            allowedTypes: typeConfig.mimeTypes
          });
          return cb(new Error(`Invalid file type. Allowed: ${typeConfig.description}`));
        }
        
        cb(null, true);
      } catch (error) {
        logger.error('File filter error', { error: error.message });
        cb(new Error('File validation error'));
      }
    }
  });
  
  return (req, res, next) => {
    // Check authentication if required
    if (requireAuth && !req.user) {
      return res.status(401).json({
        error: 'Authentication required for file uploads',
        timestamp: new Date().toISOString()
      });
    }
    
    upload.array('files', maxFiles)(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        let message = 'File upload error';
        let details = err.message;
        
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            message = 'File too large';
            details = `Maximum file size is ${(typeConfig.maxSize / 1024 / 1024).toFixed(1)}MB`;
            break;
          case 'LIMIT_FILE_COUNT':
            message = 'Too many files';
            details = `Maximum ${maxFiles} files allowed`;
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected file field';
            details = 'Please use the correct file input field';
            break;
          case 'LIMIT_FIELD_COUNT':
            message = 'Too many form fields';
            break;
        }
        
        logger.warn('Multer upload error', {
          error: err.code,
          message: err.message,
          userId: req.user?.id
        });
        
        return res.status(400).json({
          error: message,
          details,
          timestamp: new Date().toISOString()
        });
      }
      
      if (err) {
        logger.error('Upload error', { error: err.message, userId: req.user?.id });
        return res.status(400).json({
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate file content (magic numbers) for uploaded files
      if (req.files && req.files.length > 0) {
        try {
          for (const file of req.files) {
            const isValidType = await validateFileType(file.buffer, typeConfig.mimeTypes);
            if (!isValidType) {
              logger.warn('File content validation failed', {
                filename: file.originalname,
                declaredType: file.mimetype,
                userId: req.user?.id
              });
              
              return res.status(400).json({
                error: 'Invalid file content',
                details: `File "${file.originalname}" content does not match declared type`,
                timestamp: new Date().toISOString()
              });
            }
            
            // Generate secure filename
            file.secureFilename = generateSecureFilename(file.originalname, req.user?.id || 'anonymous');
          }
          
          logger.info('Files uploaded and validated successfully', {
            fileCount: req.files.length,
            filenames: req.files.map(f => f.originalname),
            userId: req.user?.id
          });
          
        } catch (error) {
          logger.error('File content validation error', {
            error: error.message,
            userId: req.user?.id
          });
          
          return res.status(500).json({
            error: 'File validation error',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      next();
    });
  };
}

/**
 * Save uploaded file to disk
 * @param {Object} file - Multer file object
 * @param {string} destination - Destination directory
 * @returns {Promise<string>} - Saved file path
 */
async function saveFile(file, destination = './uploads') {
  try {
    // Ensure destination directory exists
    await fs.mkdir(destination, { recursive: true });
    
    const filePath = path.join(destination, file.secureFilename);
    await fs.writeFile(filePath, file.buffer);
    
    logger.info('File saved successfully', {
      originalName: file.originalname,
      secureFilename: file.secureFilename,
      size: file.size,
      path: filePath
    });
    
    return filePath;
  } catch (error) {
    logger.error('Error saving file', {
      error: error.message,
      filename: file.originalname
    });
    throw error;
  }
}

/**
 * Delete file from disk
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    logger.info('File deleted successfully', { filePath });
    return true;
  } catch (error) {
    logger.error('Error deleting file', {
      error: error.message,
      filePath
    });
    return false;
  }
}

/**
 * Middleware to clean up uploaded files on error
 */
function cleanupOnError() {
  return (err, req, res, next) => {
    if (req.files && req.files.length > 0) {
      // Clean up any temporarily saved files
      req.files.forEach(file => {
        if (file.path) {
          deleteFile(file.path).catch(error => {
            logger.warn('Could not clean up temporary file', {
              path: file.path,
              error: error.message
            });
          });
        }
      });
    }
    next(err);
  };
}

module.exports = {
  createFileUpload,
  saveFile,
  deleteFile,
  cleanupOnError,
  FILE_TYPES,
  GLOBAL_LIMITS,
  validateFileType,
  validateFileExtension,
  generateSecureFilename
};