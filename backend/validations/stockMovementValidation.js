const Joi = require('joi');

/**
 * Stock Movement validation schemas using Joi
 * Centralized validation rules for stock movement operations
 */

const VALID_MOVEMENT_TYPES = ['entry', 'exit', 'adjustment', 'compliance', 'production'];

const createStockMovementSchema = Joi.object({
  movement_type: Joi.string()
    .valid(...VALID_MOVEMENT_TYPES)
    .required()
    .messages({
      'any.only': `Movement type must be one of: ${VALID_MOVEMENT_TYPES.join(', ')}`,
      'any.required': 'Movement type is required'
    }),
  
  quantity: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.positive': 'Quantity must be greater than 0',
      'any.required': 'Quantity is required'
    }),
  
  product_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Product ID must be a valid UUID',
      'any.required': 'Product ID is required'
    }),
  
  warehouse_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Warehouse ID must be a valid UUID',
      'any.required': 'Warehouse ID is required'
    }),
  
  reference: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Reference must be less than 500 characters'
    }),
  
  movement_date: Joi.date()
    .iso()
    .optional()
    .default(() => new Date())
    .messages({
      'date.base': 'Movement date must be a valid date',
      'date.format': 'Movement date must be in ISO format'
    }),
  
  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes must be less than 1000 characters'
    }),
  
  unit_cost: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Unit cost must be a number',
      'number.positive': 'Unit cost must be positive'
    })
});

const updateStockMovementSchema = Joi.object({
  movement_type: Joi.string()
    .valid(...VALID_MOVEMENT_TYPES)
    .optional()
    .messages({
      'any.only': `Movement type must be one of: ${VALID_MOVEMENT_TYPES.join(', ')}`
    }),
  
  quantity: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.positive': 'Quantity must be greater than 0'
    }),
  
  product_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .optional()
    .messages({
      'string.guid': 'Product ID must be a valid UUID'
    }),
  
  warehouse_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .optional()
    .messages({
      'string.guid': 'Warehouse ID must be a valid UUID'
    }),
  
  reference: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Reference must be less than 500 characters'
    }),
  
  movement_date: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Movement date must be a valid date',
      'date.format': 'Movement date must be in ISO format'
    }),
  
  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes must be less than 1000 characters'
    }),
  
  unit_cost: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.base': 'Unit cost must be a number',
      'number.positive': 'Unit cost must be positive'
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
  
  orderBy: Joi.string()
    .valid('movement_type', 'quantity', 'movement_date', 'created_at', 'updated_at')
    .optional()
    .messages({
      'any.only': 'Invalid order field'
    }),
  
  order: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .messages({
      'any.only': 'Order must be "asc" or "desc"'
    }),
  
  start: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format'
    }),
  
  end: Joi.date()
    .iso()
    .optional()
    .when('start', {
      is: Joi.exist(),
      then: Joi.date().min(Joi.ref('start')),
      otherwise: Joi.date()
    })
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    })
});

const createProductionMovementSchema = Joi.object({
  finished_product_id: Joi.string().guid({ version: 'uuidv4' }).required()
    .messages({ 'any.required': 'finished_product_id is required' }),
  quantity_to_produce: Joi.number().positive().precision(4).required()
    .messages({ 'number.positive': 'quantity_to_produce must be greater than 0' }),
  warehouse_id: Joi.string().guid({ version: 'uuidv4' }).required()
    .messages({ 'any.required': 'warehouse_id is required' }),
  reference: Joi.string().trim().max(500).optional().allow(''),
});

module.exports = {
  createStockMovementSchema,
  updateStockMovementSchema,
  queryParamsSchema,
  createProductionMovementSchema,
  VALID_MOVEMENT_TYPES
};