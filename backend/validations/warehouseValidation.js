const Joi = require('joi');

/**
 * Warehouse validation schemas using Joi
 * Centralized validation rules for warehouse-related operations
 */

const createWarehouseSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Warehouse name is required',
      'string.min': 'Warehouse name cannot be empty',
      'string.max': 'Warehouse name must be less than 255 characters',
      'any.required': 'Warehouse name is required'
    }),
  
  location: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Warehouse location is required',
      'string.min': 'Warehouse location cannot be empty',
      'string.max': 'Warehouse location must be less than 500 characters',
      'any.required': 'Warehouse location is required'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 1000 characters'
    }),
  
  capacity: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.base': 'Capacity must be a number',
      'number.positive': 'Capacity must be positive'
    }),
  
  is_active: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'Active status must be true or false'
    })
});

const updateWarehouseSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.empty': 'Warehouse name cannot be empty',
      'string.min': 'Warehouse name cannot be empty',
      'string.max': 'Warehouse name must be less than 255 characters'
    }),
  
  location: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .messages({
      'string.empty': 'Warehouse location cannot be empty',
      'string.min': 'Warehouse location cannot be empty',
      'string.max': 'Warehouse location must be less than 500 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must be less than 1000 characters'
    }),
  
  capacity: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.base': 'Capacity must be a number',
      'number.positive': 'Capacity must be positive'
    }),
  
  is_active: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Active status must be true or false'
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
    .valid('name', 'location', 'is_active', 'created_at', 'updated_at')
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
  
  active: Joi.string()
    .valid('true', 'false')
    .optional()
    .messages({
      'any.only': 'Active filter must be "true" or "false"'
    })
});

module.exports = {
  createWarehouseSchema,
  updateWarehouseSchema,
  queryParamsSchema
};