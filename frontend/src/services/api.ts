import { productsService } from './api/productsService';
import { warehouseService } from './api/warehouseService';
import { stockMovementService } from './api/stockMovementService';
import { userService } from './api/userService';
import { organizationService } from './api/organizationService';

/**
 * Centralized API service
 */
export const apiService = {
  products: productsService,
  warehouses: warehouseService,
  stockMovements: stockMovementService,
  users: userService,
  organizations: organizationService,
};