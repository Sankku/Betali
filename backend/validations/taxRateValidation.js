const Joi = require('joi');

/**
 * Validation schema for creating a tax rate
 */
const createTaxRateSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Tax rate name cannot be empty',
      'string.max': 'Tax rate name must be 255 characters or less',
      'any.required': 'Tax rate name is required'
    }),
    
  rate: Joi.number()
    .min(0)
    .max(1)
    .required()
    .messages({
      'number.min': 'Tax rate must be 0 or greater (e.g., 0.165 for 16.5%)',
      'number.max': 'Tax rate must be 1 or less (e.g., 0.165 for 16.5%)',
      'any.required': 'Tax rate is required'
    }),
    
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must be 500 characters or less'
    }),
    
  is_active: Joi.boolean()
    .optional()
    .default(true)
});

/**
 * Validation schema for updating a tax rate
 */
const updateTaxRateSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.empty': 'Tax rate name cannot be empty',
      'string.max': 'Tax rate name must be 255 characters or less'
    }),
    
  rate: Joi.number()
    .min(0)
    .max(1)
    .optional()
    .messages({
      'number.min': 'Tax rate must be 0 or greater (e.g., 0.165 for 16.5%)',
      'number.max': 'Tax rate must be 1 or less (e.g., 0.165 for 16.5%)'
    }),
    
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must be 500 characters or less'
    }),
    
  is_active: Joi.boolean()
    .optional()
}).min(1); // At least one field must be provided for update

module.exports = {
  createTaxRateSchema,
  updateTaxRateSchema
};