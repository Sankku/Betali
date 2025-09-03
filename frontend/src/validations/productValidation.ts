import * as yup from 'yup';

/**
 * Product validation schemas using Yup for frontend
 * Centralized validation rules matching backend Joi schemas
 */

export const createProductSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('Product name is required')
    .max(255, 'Product name must be less than 255 characters')
    .min(1, 'Product name cannot be empty'),
  
  batch_number: yup
    .string()
    .trim()
    .required('SKU/Batch number is required')
    .max(100, 'SKU/Batch number must be less than 100 characters')
    .min(1, 'SKU/Batch number cannot be empty'),
  
  origin_country: yup
    .string()
    .trim()
    .required('Origin/Source is required')
    .max(100, 'Origin/Source must be less than 100 characters')
    .min(1, 'Origin/Source cannot be empty'),
  
  expiration_date: yup
    .date()
    .required('Expiry/Best before date is required')
    .min(new Date(), 'Expiry/Best before date cannot be in the past')
    .typeError('Expiry/Best before date must be a valid date'),
  
  description: yup
    .string()
    .trim()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  external_product_id: yup
    .string()
    .trim()
    .max(100, 'External product ID must be less than 100 characters')
    .optional(),
  
  price: yup
    .number()
    .required('Price is required')
    .positive('Price must be greater than 0')
    .max(999999.99, 'Price cannot exceed $999,999.99')
    .typeError('Price must be a valid number'),

  tax_rate_id: yup
    .string()
    .trim()
    .optional()
    .nullable()
});

export const updateProductSchema = yup.object({
  name: yup
    .string()
    .trim()
    .max(255, 'Product name must be less than 255 characters')
    .min(1, 'Product name cannot be empty')
    .optional(),
  
  batch_number: yup
    .string()
    .trim()
    .max(100, 'Batch number must be less than 100 characters')
    .min(1, 'Batch number cannot be empty')
    .optional(),
  
  origin_country: yup
    .string()
    .trim()
    .max(100, 'Country of origin must be less than 100 characters')
    .min(1, 'Country of origin cannot be empty')
    .optional(),
  
  expiration_date: yup
    .date()
    .min(new Date(), 'Expiration date cannot be in the past')
    .typeError('Expiration date must be a valid date')
    .optional(),
  
  description: yup
    .string()
    .trim()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  external_product_id: yup
    .string()
    .trim()
    .max(100, 'External product ID must be less than 100 characters')
    .optional(),
  
  price: yup
    .number()
    .positive('Price must be greater than 0')
    .max(999999.99, 'Price cannot exceed $999,999.99')
    .typeError('Price must be a valid number')
    .optional(),

  tax_rate_id: yup
    .string()
    .trim()
    .optional()
    .nullable()
});

// Type inference from Yup schemas
export type ProductFormData = yup.InferType<typeof createProductSchema>;
export type ProductUpdateData = yup.InferType<typeof updateProductSchema>;

// Form validation schema that converts date to string for form handling
export const productFormSchema = createProductSchema.shape({
  expiration_date: yup
    .string()
    .required('Expiration date is required')
    .test('valid-date', 'Expiration date must be a valid date', (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .test('future-date', 'Expiration date cannot be in the past', (value) => {
      if (!value) return false;
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    })
});

export type ProductFormSchemaData = yup.InferType<typeof productFormSchema>;