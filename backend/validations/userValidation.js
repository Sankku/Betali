const Joi = require('joi');

const userRoles = ['super_admin', 'admin', 'manager', 'employee', 'viewer'];

const createUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .max(100)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 100 characters',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required'
    }),

  role: Joi.string()
    .valid(...userRoles)
    .default('employee')
    .messages({
      'any.only': `Role must be one of: ${userRoles.join(', ')}`
    }),

  organization_id: Joi.string()
    .uuid()
    .when('role', {
      is: 'super_admin',
      then: Joi.forbidden(),
      otherwise: Joi.required()
    })
    .messages({
      'string.uuid': 'Organization ID must be a valid UUID',
      'any.required': 'Organization ID is required for non-super admin users',
      'any.unknown': 'Super admin users cannot have an organization'
    }),

  branch_id: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.uuid': 'Branch ID must be a valid UUID'
    }),

  permissions: Joi.array()
    .items(Joi.string())
    .default([])
    .messages({
      'array.base': 'Permissions must be an array of strings'
    }),

  is_active: Joi.boolean()
    .default(true)
});

const updateUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .max(100)
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 100 characters'
    }),

  role: Joi.string()
    .valid(...userRoles)
    .messages({
      'any.only': `Role must be one of: ${userRoles.join(', ')}`
    }),

  organization_id: Joi.string()
    .uuid()
    .when('role', {
      is: 'super_admin',
      then: Joi.forbidden(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.uuid': 'Organization ID must be a valid UUID',
      'any.unknown': 'Super admin users cannot have an organization'
    }),

  branch_id: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.uuid': 'Branch ID must be a valid UUID'
    }),

  permissions: Joi.array()
    .items(Joi.string())
    .messages({
      'array.base': 'Permissions must be an array of strings'
    }),

  is_active: Joi.boolean()
});

const queryParamsSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  search: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search term must be at least 1 character',
      'string.max': 'Search term cannot exceed 100 characters'
    }),

  role: Joi.string()
    .valid(...userRoles)
    .optional()
    .messages({
      'any.only': `Role filter must be one of: ${userRoles.join(', ')}`
    }),

  is_active: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Active filter must be true or false'
    }),

  organization_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Organization ID must be a valid UUID'
    })
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'New password is required'
    })
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  queryParamsSchema,
  changePasswordSchema,
  userRoles
};