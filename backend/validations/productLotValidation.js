// backend/validations/productLotValidation.js
const Joi = require('joi');

const createProductLotSchema = Joi.object({
  lot_number: Joi.string().max(100).required(),
  expiration_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
    .messages({ 'string.pattern.base': 'expiration_date must be YYYY-MM-DD' }),
  price: Joi.number().min(0).required(),
  origin_country: Joi.string().max(100).required(),
  destination_id: Joi.string().uuid().optional().allow(null),
  external_product_id: Joi.string().max(100).optional().allow(null),
});

const updateProductLotSchema = Joi.object({
  lot_number: Joi.string().max(100).optional(),
  expiration_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  price: Joi.number().min(0).optional(),
  origin_country: Joi.string().max(100).optional(),
  destination_id: Joi.string().uuid().optional().allow(null),
  external_product_id: Joi.string().max(100).optional().allow(null),
}).min(1);

module.exports = { createProductLotSchema, updateProductLotSchema };
