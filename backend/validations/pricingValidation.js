const Joi = require('joi');

/**
 * Pricing validation schemas using Joi
 * Validates pricing-related data for API endpoints
 */

// Calculate pricing schema
const calculatePricingSchema = Joi.object({
  client_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'Client ID must be a valid UUID'
    }),
  items: Joi.array()
    .items(Joi.object({
      product_id: Joi.string()
        .uuid()
        .required()
        .messages({
          'string.guid': 'Product ID must be a valid UUID',
          'any.required': 'Product ID is required'
        }),
      quantity: Joi.number()
        .positive()
        .min(0.001)
        .max(10000)
        .required()
        .messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be positive',
          'number.min': 'Quantity must be at least 0.001',
          'number.max': 'Quantity cannot exceed 10,000',
          'any.required': 'Quantity is required'
        }),
      price: Joi.number()
        .min(0)
        .precision(2)
        .max(999999.99)
        .messages({
          'number.base': 'Price must be a number',
          'number.min': 'Price cannot be negative',
          'number.precision': 'Price can have maximum 2 decimal places',
          'number.max': 'Price cannot exceed 999,999.99'
        })
    }))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.base': 'Items must be an array',
      'array.min': 'Must have at least 1 item to calculate pricing',
      'array.max': 'Cannot calculate pricing for more than 100 items',
      'any.required': 'Items are required for pricing calculation'
    }),
  discount_codes: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .default([])
    .messages({
      'array.base': 'Discount codes must be an array',
      'array.max': 'Cannot apply more than 10 discount codes'
    }),
  tax_rate_ids: Joi.array()
    .items(Joi.string().uuid())
    .max(10)
    .default([])
    .messages({
      'array.base': 'Tax rate IDs must be an array',
      'array.max': 'Cannot apply more than 10 tax rates',
      'string.guid': 'Each tax rate ID must be a valid UUID'
    })
});

// Validate coupon schema
const validateCouponSchema = Joi.object({
  coupon_code: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Coupon code cannot be empty',
      'string.max': 'Coupon code cannot exceed 50 characters',
      'any.required': 'Coupon code is required'
    }),
  order_data: Joi.object()
    .unknown(true)
    .messages({
      'object.base': 'Order data must be an object'
    })
});

// Create pricing tier schema
const createPricingTierSchema = Joi.object({
  tier_name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Tier name cannot be empty',
      'string.max': 'Tier name cannot exceed 100 characters',
      'any.required': 'Tier name is required'
    }),
  min_quantity: Joi.number()
    .positive()
    .min(0.001)
    .required()
    .messages({
      'number.base': 'Minimum quantity must be a number',
      'number.positive': 'Minimum quantity must be positive',
      'number.min': 'Minimum quantity must be at least 0.001',
      'any.required': 'Minimum quantity is required'
    }),
  max_quantity: Joi.number()
    .positive()
    .min(Joi.ref('min_quantity'))
    .messages({
      'number.base': 'Maximum quantity must be a number',
      'number.positive': 'Maximum quantity must be positive',
      'number.min': 'Maximum quantity must be greater than minimum quantity'
    }),
  price: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price cannot be negative',
      'number.precision': 'Price can have maximum 2 decimal places',
      'any.required': 'Price is required'
    }),
  is_active: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Is active must be a boolean'
    }),
  valid_from: Joi.date()
    .iso()
    .messages({
      'date.base': 'Valid from must be a valid date',
      'date.format': 'Valid from must be in ISO format'
    }),
  valid_to: Joi.date()
    .iso()
    .min(Joi.ref('valid_from'))
    .messages({
      'date.base': 'Valid to must be a valid date',
      'date.format': 'Valid to must be in ISO format',
      'date.min': 'Valid to must be after valid from date'
    })
});

// Create customer pricing schema
const createCustomerPricingSchema = Joi.object({
  product_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Product ID must be a valid UUID',
      'any.required': 'Product ID is required'
    }),
  price: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price cannot be negative',
      'number.precision': 'Price can have maximum 2 decimal places',
      'any.required': 'Price is required'
    }),
  is_active: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Is active must be a boolean'
    }),
  valid_from: Joi.date()
    .iso()
    .messages({
      'date.base': 'Valid from must be a valid date',
      'date.format': 'Valid from must be in ISO format'
    }),
  valid_to: Joi.date()
    .iso()
    .min(Joi.ref('valid_from'))
    .messages({
      'date.base': 'Valid to must be a valid date',
      'date.format': 'Valid to must be in ISO format',
      'date.min': 'Valid to must be after valid from date'
    }),
  notes: Joi.string()
    .max(1000)
    .allow('')
    .allow(null)
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    })
});

// Create tax rate schema
const createTaxRateSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Tax rate name cannot be empty',
      'string.max': 'Tax rate name cannot exceed 100 characters',
      'any.required': 'Tax rate name is required'
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .allow(null)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  rate: Joi.number()
    .min(0)
    .max(1)
    .precision(4)
    .required()
    .messages({
      'number.base': 'Rate must be a number',
      'number.min': 'Rate cannot be negative',
      'number.max': 'Rate cannot exceed 1 (100%)',
      'number.precision': 'Rate can have maximum 4 decimal places',
      'any.required': 'Rate is required'
    }),
  is_inclusive: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Is inclusive must be a boolean'
    }),
  is_active: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Is active must be a boolean'
    })
});

// Create discount rule schema
const createDiscountRuleSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Discount rule name cannot be empty',
      'string.max': 'Discount rule name cannot exceed 100 characters',
      'any.required': 'Discount rule name is required'
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .allow(null)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  type: Joi.string()
    .valid('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')
    .required()
    .messages({
      'any.only': 'Type must be one of: percentage, fixed_amount, buy_x_get_y, free_shipping',
      'any.required': 'Type is required'
    }),
  value: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.base': 'Value must be a number',
      'number.min': 'Value cannot be negative',
      'number.precision': 'Value can have maximum 2 decimal places',
      'any.required': 'Value is required'
    }),
  applies_to: Joi.string()
    .valid('order', 'line_item', 'shipping')
    .default('order')
    .messages({
      'any.only': 'Applies to must be one of: order, line_item, shipping'
    }),
  min_order_amount: Joi.number()
    .min(0)
    .precision(2)
    .messages({
      'number.base': 'Minimum order amount must be a number',
      'number.min': 'Minimum order amount cannot be negative',
      'number.precision': 'Minimum order amount can have maximum 2 decimal places'
    }),
  max_discount_amount: Joi.number()
    .min(0)
    .precision(2)
    .messages({
      'number.base': 'Maximum discount amount must be a number',
      'number.min': 'Maximum discount amount cannot be negative',
      'number.precision': 'Maximum discount amount can have maximum 2 decimal places'
    }),
  coupon_code: Joi.string()
    .max(50)
    .allow('')
    .allow(null)
    .messages({
      'string.max': 'Coupon code cannot exceed 50 characters'
    }),
  max_uses: Joi.number()
    .integer()
    .min(1)
    .messages({
      'number.base': 'Maximum uses must be a number',
      'number.integer': 'Maximum uses must be an integer',
      'number.min': 'Maximum uses must be at least 1'
    }),
  is_active: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Is active must be a boolean'
    }),
  valid_from: Joi.date()
    .iso()
    .messages({
      'date.base': 'Valid from must be a valid date',
      'date.format': 'Valid from must be in ISO format'
    }),
  valid_to: Joi.date()
    .iso()
    .min(Joi.ref('valid_from'))
    .messages({
      'date.base': 'Valid to must be a valid date',
      'date.format': 'Valid to must be in ISO format',
      'date.min': 'Valid to must be after valid from date'
    })
});

module.exports = {
  calculatePricingSchema,
  validateCouponSchema,
  createPricingTierSchema,
  createCustomerPricingSchema,
  createTaxRateSchema,
  createDiscountRuleSchema
};