/**
 * Centralized validation exports
 * Re-export all validation schemas from this index file
 */

// Product validations
export {
  createProductSchema,
  updateProductSchema,
  productFormSchema,
  type ProductFormData,
  type ProductUpdateData,
  type ProductFormSchemaData
} from './productValidation';

// Warehouse validations
export {
  createWarehouseSchema,
  updateWarehouseSchema,
  type WarehouseFormData,
  type WarehouseUpdateData
} from './warehouseValidation';

// Stock Movement validations
export {
  createStockMovementSchema,
  updateStockMovementSchema,
  VALID_MOVEMENT_TYPES,
  MOVEMENT_TYPE_OPTIONS,
  type StockMovementFormData,
  type StockMovementUpdateData
} from './stockMovementValidation';