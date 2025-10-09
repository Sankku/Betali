const Joi = require('joi');

/**
 * Validation schema for creating a discount rule
 */
const createDiscountRuleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Discount rule name cannot be empty',
      'string.max': 'Discount rule name must be 255 characters or less',
      'any.required': 'Discount rule name is required'
    }),
    
  type: Joi.string()
    .valid('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')
    .required()
    .messages({
      'any.only': 'Discount type must be one of: percentage, fixed_amount, buy_x_get_y, free_shipping',
      'any.required': 'Discount type is required'
    }),
    
  value: Joi.number()
    .min(0)
    .required()
    .when('type', {
      is: 'percentage',
      then: Joi.number().max(1).messages({
        'number.max': 'Percentage discount value must be between 0 and 1 (e.g., 0.15 for 15%)'
      }),
      otherwise: Joi.number().positive().messages({
        'number.positive': 'Fixed amount discount value must be greater than 0'
      })
    })
    .messages({
      'number.min': 'Discount value must be 0 or greater',
      'any.required': 'Discount value is required'
    }),
    
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must be 500 characters or less'
    }),
    
  coupon_code: Joi.string()
    .trim()
    .max(50)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .messages({
      'string.max': 'Coupon code must be 50 characters or less',
      'string.pattern.base': 'Coupon code can only contain letters, numbers, underscores and hyphens'
    }),
    
  min_order_amount: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Minimum order amount must be 0 or greater'
    }),
    
  max_uses: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'Maximum uses must be a whole number',
      'number.min': 'Maximum uses must be 1 or greater'
    }),
    
  valid_from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Valid from date must be in ISO format'
    }),
    
  valid_to: Joi.date()
    .iso()
    .greater(Joi.ref('valid_from'))
    .optional()
    .messages({
      'date.format': 'Valid to date must be in ISO format',
      'date.greater': 'Valid to date must be after valid from date'
    }),
    
  is_active: Joi.boolean()
    .optional()
    .default(true)
});

/**
 * Validation schema for updating a discount rule
 */
const updateDiscountRuleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.empty': 'Discount rule name cannot be empty',
      'string.max': 'Discount rule name must be 255 characters or less'
    }),
    
  type: Joi.string()
    .valid('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')
    .optional()
    .messages({
      'any.only': 'Discount type must be one of: percentage, fixed_amount, buy_x_get_y, free_shipping'
    }),
    
  value: Joi.number()
    .min(0)
    .optional()
    .when('type', {
      is: 'percentage',
      then: Joi.number().max(1).messages({
        'number.max': 'Percentage discount value must be between 0 and 1 (e.g., 0.15 for 15%)'
      }),
      otherwise: Joi.number().positive().messages({
        'number.positive': 'Fixed amount discount value must be greater than 0'
      })
    })
    .messages({
      'number.min': 'Discount value must be 0 or greater'
    }),
    
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must be 500 characters or less'
    }),
    
  coupon_code: Joi.string()
    .trim()
    .max(50)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .optional()
    .messages({
      'string.max': 'Coupon code must be 50 characters or less',
      'string.pattern.base': 'Coupon code can only contain letters, numbers, underscores and hyphens'
    }),
    
  min_order_amount: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Minimum order amount must be 0 or greater'
    }),
    
  max_uses: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'Maximum uses must be a whole number',
      'number.min': 'Maximum uses must be 1 or greater'
    }),
    
  valid_from: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Valid from date must be in ISO format'
    }),
    
  valid_to: Joi.date()
    .iso()
    .greater(Joi.ref('valid_from'))
    .optional()
    .messages({
      'date.format': 'Valid to date must be in ISO format',
      'date.greater': 'Valid to date must be after valid from date'
    }),
    
  is_active: Joi.boolean()
    .optional()
}).min(1); // At least one field must be provided for update

/**
 * Validation schema for coupon code validation
 */
const validateCouponSchema = Joi.object({
  coupon_code: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Coupon code cannot be empty',
      'string.max': 'Coupon code must be 50 characters or less',
      'any.required': 'Coupon code is required'
    })
});

module.exports = {
  createDiscountRuleSchema,
  updateDiscountRuleSchema,
  validateCouponSchema
};