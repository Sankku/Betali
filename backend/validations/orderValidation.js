const Joi = require('joi');

/**
 * Order validation schemas
 * Validates order data for API endpoints
 */

// Valid order statuses - comprehensive workflow states
const ORDER_STATUSES = ['draft', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];

// Order item schema
const orderItemSchema = Joi.object({
  product_type_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Product type ID must be a valid UUID',
      'any.required': 'Product type ID is required'
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 10,000',
      'any.required': 'Quantity is required'
    }),
  price: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive',
      'number.precision': 'Price can have maximum 2 decimal places',
      'number.max': 'Price cannot exceed 999,999.99'
    })
});

// Create order schema
const createOrderSchema = Joi.object({
  client_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'Client ID must be a valid UUID'
    }),
  warehouse_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Warehouse ID must be a valid UUID',
      'any.required': 'Warehouse is required'
    }),
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .default('draft')
    .messages({
      'any.only': `Status must be one of: ${ORDER_STATUSES.join(', ')}`
    }),
  order_date: Joi.date()
    .iso()
    .max('now')
    .messages({
      'date.base': 'Order date must be a valid date',
      'date.format': 'Order date must be in ISO format',
      'date.max': 'Order date cannot be in the future'
    }),
  tax_rate_ids: Joi.array()
    .items(Joi.string().uuid())
    .max(10)
    .default([])
    .messages({
      'array.base': 'Tax rate IDs must be an array',
      'array.max': 'Cannot apply more than 10 tax rates',
      'string.guid': 'Each tax rate ID must be a valid UUID'
    }),
  items: Joi.array()
    .items(orderItemSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.base': 'Items must be an array',
      'array.min': 'Order must have at least 1 item',
      'array.max': 'Order cannot have more than 100 items',
      'any.required': 'Items are required'
    }),
  notes: Joi.string()
    .max(1000)
    .allow('')
    .allow(null)
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    })
});

// Update order schema
const updateOrderSchema = Joi.object({
  client_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'Client ID must be a valid UUID'
    }),
  warehouse_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'Warehouse ID must be a valid UUID'
    }),
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .messages({
      'any.only': `Status must be one of: ${ORDER_STATUSES.join(', ')}`
    }),
  order_date: Joi.date()
    .iso()
    .messages({
      'date.base': 'Order date must be a valid date',
      'date.format': 'Order date must be in ISO format'
    }),
  items: Joi.array()
    .items(orderItemSchema)
    .min(1)
    .max(100)
    .messages({
      'array.base': 'Items must be an array',
      'array.min': 'Order must have at least 1 item',
      'array.max': 'Order cannot have more than 100 items'
    }),
  tax_rate_ids: Joi.array()
    .items(Joi.string().uuid())
    .max(10)
    .messages({
      'array.base': 'Tax rate IDs must be an array',
      'array.max': 'Cannot apply more than 10 tax rates',
      'string.guid': 'Each tax rate ID must be a valid UUID'
    }),
  notes: Joi.string()
    .max(1000)
    .allow('')
    .allow(null)
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    }),
  total_price: Joi.number()
    .positive()
    .precision(2)
    .max(9999999.99)
    .messages({
      'number.base': 'Total price must be a number',
      'number.positive': 'Total price must be positive',
      'number.precision': 'Total price can have maximum 2 decimal places',
      'number.max': 'Total price cannot exceed 9,999,999.99'
    })
}).min(1);

// Update order status schema
const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .required()
    .messages({
      'any.only': `Status must be one of: ${ORDER_STATUSES.join(', ')}`,
      'any.required': 'Status is required'
    })
});

// Query parameters schema
const orderQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...ORDER_STATUSES)
    .messages({
      'any.only': `Status must be one of: ${ORDER_STATUSES.join(', ')}`
    }),
  client_id: Joi.string()
    .uuid()
    .messages({
      'string.guid': 'Client ID must be a valid UUID'
    }),
  search: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Search term must be at least 2 characters',
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(200)
    .default(50)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 200'
    }),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Offset must be a number',
      'number.integer': 'Offset must be an integer',
      'number.min': 'Offset must be at least 0'
    }),
  sort_by: Joi.string()
    .valid('created_at', 'updated_at', 'order_date', 'total_price', 'status')
    .default('created_at')
    .messages({
      'any.only': 'Sort by must be one of: created_at, updated_at, order_date, total_price, status'
    }),
  sort_order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
});

// Order ID parameter schema
const orderIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Order ID must be a valid UUID',
      'any.required': 'Order ID is required'
    })
});

// Calculate pricing schema - for pricing preview calculations
const calculatePricingSchema = Joi.object({
  items: Joi.array()
    .items(orderItemSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.base': 'Items must be an array',
      'array.min': 'Must have at least 1 item to calculate pricing',
      'array.max': 'Cannot calculate pricing for more than 100 items',
      'any.required': 'Items are required for pricing calculation'
    }),
  client_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.guid': 'Client ID must be a valid UUID'
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
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Coupon code must be at least 2 characters',
      'string.max': 'Coupon code cannot exceed 50 characters',
      'any.required': 'Coupon code is required'
    }),
  order_total: Joi.number()
    .positive()
    .precision(2)
    .max(9999999.99)
    .required()
    .messages({
      'number.base': 'Order total must be a number',
      'number.positive': 'Order total must be positive',
      'number.precision': 'Order total can have maximum 2 decimal places',
      'number.max': 'Order total cannot exceed 9,999,999.99',
      'any.required': 'Order total is required'
    })
});

module.exports = {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  orderIdSchema,
  calculatePricingSchema,
  validateCouponSchema,
  ORDER_STATUSES
};