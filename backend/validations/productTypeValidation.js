// backend/validations/productTypeValidation.js
const Joi = require('joi');

const VALID_PRODUCT_TYPES = ['standard', 'raw_material', 'finished_good'];
const VALID_UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'unidad', 'docena'];

const createProductTypeSchema = Joi.object({
  sku: Joi.string().max(100).required().messages({ 'any.required': 'SKU is required' }),
  name: Joi.string().max(255).required().messages({ 'any.required': 'Name is required' }),
  product_type: Joi.string().valid(...VALID_PRODUCT_TYPES).required(),
  unit: Joi.string().valid(...VALID_UNITS).required(),
  min_stock: Joi.number().min(0).optional().allow(null),
  max_stock: Joi.number().min(0).optional().allow(null),
  description: Joi.string().max(1000).optional().allow('', null),
  alert_enabled: Joi.boolean().optional(),
  senasa_product_id: Joi.string().uuid().optional().allow(null),
  branch_id: Joi.string().uuid().optional().allow(null),
});

const updateProductTypeSchema = Joi.object({
  sku: Joi.string().max(100).optional(),
  name: Joi.string().max(255).optional(),
  product_type: Joi.string().valid(...VALID_PRODUCT_TYPES).optional(),
  unit: Joi.string().valid(...VALID_UNITS).optional(),
  min_stock: Joi.number().min(0).optional().allow(null),
  max_stock: Joi.number().min(0).optional().allow(null),
  description: Joi.string().max(1000).optional().allow('', null),
  alert_enabled: Joi.boolean().optional(),
  senasa_product_id: Joi.string().uuid().optional().allow(null),
  branch_id: Joi.string().uuid().optional().allow(null),
}).min(1);

module.exports = { createProductTypeSchema, updateProductTypeSchema };
