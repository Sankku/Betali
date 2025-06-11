const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validation');

const createWarehouseSchema = {
  validate: (data) => {
    const errors = [];
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push({ message: 'Warehouse name is required and must be a string' });
    }
    
    if (!data.location || typeof data.location !== 'string' || data.location.trim() === '') {
      errors.push({ message: 'Warehouse location is required and must be a string' });
    }
    
    return {
      error: errors.length > 0 ? { details: errors } : null,
      value: data
    };
  }
};

const updateWarehouseSchema = {
  validate: (data) => {
    const errors = [];
    
    if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
      errors.push({ message: 'Warehouse name must be a non-empty string' });
    }
    
    if (data.location !== undefined && (typeof data.location !== 'string' || data.location.trim() === '')) {
      errors.push({ message: 'Warehouse location must be a non-empty string' });
    }
    
    if (data.is_active !== undefined && typeof data.is_active !== 'boolean') {
      errors.push({ message: 'is_active must be a boolean' });
    }
    
    return {
      error: errors.length > 0 ? { details: errors } : null,
      value: data
    };
  }
};

const queryParamsSchema = {
  validate: (query) => ({
    error: null,
    value: {
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
      sortBy: query.sortBy || undefined,
      sortOrder: query.sortOrder || undefined,
      active: query.active || undefined
    }
  })
};
const router = express.Router();

const warehouseController = ServiceFactory.createWarehouseController();

router.use(authenticateUser);

router.get(
  '/',
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await warehouseController.getWarehouses(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  async (req, res, next) => {
    try {
      await warehouseController.getWarehouseById(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  validateRequest(createWarehouseSchema),
  async (req, res, next) => {
    try {
      await warehouseController.createWarehouse(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  validateRequest(updateWarehouseSchema),
  async (req, res, next) => {
    try {
      await warehouseController.updateWarehouse(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  async (req, res, next) => {
    try {
      await warehouseController.deactivateWarehouse(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id/permanent',
  async (req, res, next) => {
    try {
      await warehouseController.deleteWarehouse(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id/movements',
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await warehouseController.getWarehouseMovements(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;