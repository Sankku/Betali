import * as yup from 'yup';

/**
 * Warehouse validation schemas using Yup for frontend
 * Centralized validation rules matching backend Joi schemas
 */

export const createWarehouseSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('Warehouse name is required')
    .max(255, 'Warehouse name must be less than 255 characters')
    .min(1, 'Warehouse name cannot be empty'),
  
  location: yup
    .string()
    .trim()
    .required('Warehouse location is required')
    .max(500, 'Warehouse location must be less than 500 characters')
    .min(1, 'Warehouse location cannot be empty'),
  
  description: yup
    .string()
    .trim()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  capacity: yup
    .number()
    .positive('Capacity must be positive')
    .optional()
    .typeError('Capacity must be a number'),
  
  is_active: yup
    .boolean()
    .default(true)
    .optional()
    .typeError('Active status must be true or false')
});

export const updateWarehouseSchema = yup.object({
  name: yup
    .string()
    .trim()
    .max(255, 'Warehouse name must be less than 255 characters')
    .min(1, 'Warehouse name cannot be empty')
    .optional(),
  
  location: yup
    .string()
    .trim()
    .max(500, 'Warehouse location must be less than 500 characters')
    .min(1, 'Warehouse location cannot be empty')
    .optional(),
  
  description: yup
    .string()
    .trim()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  capacity: yup
    .number()
    .positive('Capacity must be positive')
    .optional()
    .typeError('Capacity must be a number'),
  
  is_active: yup
    .boolean()
    .optional()
    .typeError('Active status must be true or false')
});

// Type inference from Yup schemas
export type WarehouseFormData = yup.InferType<typeof createWarehouseSchema>;
export type WarehouseUpdateData = yup.InferType<typeof updateWarehouseSchema>;