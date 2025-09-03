const Joi = require('joi');

/**
 * Authentication validation schemas using Joi
 */

const completeSignupSchema = Joi.object({
  user_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    }),
  
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Allow any TLD including .test for testing
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  name: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.min': 'Name must be at least 1 character long',
      'string.max': 'Name cannot exceed 255 characters',
      'any.required': 'Name is required'
    }),
  
  organization_name: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Organization name must be at least 1 character long',
      'string.max': 'Organization name cannot exceed 255 characters'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Allow any TLD including .test for testing
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
});

const resetPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

module.exports = {
  completeSignupSchema,
  loginSchema,
  resetPasswordSchema
};