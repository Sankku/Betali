import * as yup from 'yup';

/**
 * Stock Movement validation schemas using Yup for frontend
 * Centralized validation rules matching backend Joi schemas
 */

export const VALID_MOVEMENT_TYPES = ['entry', 'exit', 'adjustment', 'compliance'] as const;

export const createStockMovementSchema = yup.object({
  movement_type: yup
    .string()
    .oneOf(VALID_MOVEMENT_TYPES, `Movement type must be one of: ${VALID_MOVEMENT_TYPES.join(', ')}`)
    .required('Movement type is required'),
  
  quantity: yup
    .number()
    .positive('Quantity must be greater than 0')
    .required('Quantity is required')
    .typeError('Quantity must be a number'),
  
  product_id: yup
    .string()
    .required('Product is required')
    .min(1, 'Product is required'),
  
  warehouse_id: yup
    .string()
    .required('Warehouse is required')
    .min(1, 'Warehouse is required'),
  
  reference: yup
    .string()
    .trim()
    .max(500, 'Reference must be less than 500 characters')
    .optional(),
  
  movement_date: yup
    .string()
    .required('Movement date is required')
    .test('valid-date', 'Movement date must be a valid date', (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    }),
  
  notes: yup
    .string()
    .trim()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  
  unit_cost: yup
    .number()
    .positive('Unit cost must be positive')
    .optional()
    .typeError('Unit cost must be a number')
});

export const updateStockMovementSchema = yup.object({
  movement_type: yup
    .string()
    .oneOf(VALID_MOVEMENT_TYPES, `Movement type must be one of: ${VALID_MOVEMENT_TYPES.join(', ')}`)
    .optional(),
  
  quantity: yup
    .number()
    .positive('Quantity must be greater than 0')
    .optional()
    .typeError('Quantity must be a number'),
  
  product_id: yup
    .string()
    .min(1, 'Product is required')
    .optional(),
  
  warehouse_id: yup
    .string()
    .min(1, 'Warehouse is required')
    .optional(),
  
  reference: yup
    .string()
    .trim()
    .max(500, 'Reference must be less than 500 characters')
    .optional(),
  
  movement_date: yup
    .string()
    .test('valid-date', 'Movement date must be a valid date', (value) => {
      if (!value) return true; // Optional field
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .optional(),
  
  notes: yup
    .string()
    .trim()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  
  unit_cost: yup
    .number()
    .positive('Unit cost must be positive')
    .optional()
    .typeError('Unit cost must be a number')
});

// Type inference from Yup schemas
export type StockMovementFormData = yup.InferType<typeof createStockMovementSchema>;
export type StockMovementUpdateData = yup.InferType<typeof updateStockMovementSchema>;

// Movement type options for UI components
export const MOVEMENT_TYPE_OPTIONS = [
  {
    value: 'entry' as const,
    label: 'Entry',
    description: 'Goods entry to inventory',
    color: 'text-green-700',
  },
  {
    value: 'exit' as const,
    label: 'Exit',
    description: 'Goods exit from inventory',
    color: 'text-red-700',
  },
  {
    value: 'adjustment' as const,
    label: 'Adjustment',
    description: 'Inventory correction',
    color: 'text-blue-700',
  },
  {
    value: 'compliance' as const,
    label: 'Compliance',
    description: 'Regulatory compliance movement',
    color: 'text-purple-700',
  },
] as const;