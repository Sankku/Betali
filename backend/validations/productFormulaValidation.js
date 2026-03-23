const Joi = require('joi');

const addFormulaItemSchema = Joi.object({
  finished_product_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  raw_material_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  quantity_required: Joi.number().positive().precision(4).required(),
});

const updateFormulaItemSchema = Joi.object({
  quantity_required: Joi.number().positive().precision(4).required(),
});

module.exports = { addFormulaItemSchema, updateFormulaItemSchema };
