const Joi = require('joi');

/**
 * Product validation schemas using Joi
 * Centralized validation rules for product-related operations
 */

const createProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Product name is required',
      'string.min': 'Product name cannot be empty',
      'string.max': 'Product name must be less than 255 characters',
      'any.required': 'Product name is required'
    }),
  
  batch_number: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'SKU/Batch number is required',
      'string.min': 'SKU/Batch number cannot be empty',
      'string.max': 'SKU/Batch number must be less than 100 characters',
      'any.required': 'SKU/Batch number is required'
    }),
  
  origin_country: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Origin/Source is required',
      'string.min': 'Origin/Source cannot be empty',
      'string.max': 'Origin/Source must be less than 100 characters',
      'any.required': 'Origin/Source is required'
    }),
  
  expiration_date: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.base': 'Expiry/Best before date must be a valid date',
      'date.format': 'Expiry/Best before date must be in ISO format',
      'date.min': 'Expiry/Best before date cannot be in the past',
      'any.required': 'Expiry/Best before date is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 1000 characters'
    }),
  
  external_product_id: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'External product ID must be less than 100 characters'
    })
});

const updateProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.empty': 'Product name cannot be empty',
      'string.min': 'Product name cannot be empty',
      'string.max': 'Product name must be less than 255 characters'
    }),
  
  batch_number: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Batch number cannot be empty',
      'string.min': 'Batch number cannot be empty',
      'string.max': 'Batch number must be less than 100 characters'
    }),
  
  origin_country: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Country of origin cannot be empty',
      'string.min': 'Country of origin cannot be empty',
      'string.max': 'Country of origin must be less than 100 characters'
    }),
  
  expiration_date: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.base': 'Expiration date must be a valid date',
      'date.format': 'Expiration date must be in ISO format',
      'date.min': 'Expiration date cannot be in the past'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 1000 characters'
    }),
  
  external_product_id: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'External product ID must be less than 100 characters'
    })
});

const queryParamsSchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Offset must be a number',
      'number.integer': 'Offset must be an integer',
      'number.min': 'Offset cannot be negative'
    }),
  
  sortBy: Joi.string()
    .valid('name', 'batch_number', 'origin_country', 'expiration_date', 'created_at', 'updated_at')
    .optional()
    .messages({
      'any.only': 'Invalid sort field'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .messages({
      'any.only': 'Sort order must be "asc" or "desc"'
    }),
  
  days: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.base': 'Days must be a number',
      'number.integer': 'Days must be an integer',
      'number.min': 'Days must be at least 1',
      'number.max': 'Days cannot exceed 365'
    }),
  
  q: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.empty': 'Search query cannot be empty',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query must be less than 255 characters'
    })
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  queryParamsSchema
};