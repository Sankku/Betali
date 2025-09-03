const Joi = require('joi');

/**
 * Organization validation schemas using Joi
 */

const userRoles = ['super_admin', 'admin', 'manager', 'employee', 'viewer'];

const createOrganizationSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.min': 'Organization name must be at least 1 character long',
      'string.max': 'Organization name cannot exceed 255 characters',
      'any.required': 'Organization name is required'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    })
});

const updateOrganizationSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Organization name must be at least 1 character long',
      'string.max': 'Organization name cannot exceed 255 characters'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    })
});

const inviteUserSchema = Joi.object({
  email: Joi.string()
    .email()
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
  
  role: Joi.string()
    .valid(...userRoles)
    .required()
    .messages({
      'any.only': `Role must be one of: ${userRoles.join(', ')}`,
      'any.required': 'Role is required'
    }),
  
  branch_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Branch ID must be a valid UUID'
    }),
  
  permissions: Joi.array()
    .items(Joi.string())
    .optional()
    .messages({
      'array.base': 'Permissions must be an array of strings'
    })
});

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteUserSchema
};