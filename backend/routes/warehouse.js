const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validation');
const { Logger } = require('../utils/Logger');
const { 
  createWarehouseSchema, 
  updateWarehouseSchema, 
  queryParamsSchema 
} = require('../validations/warehouseValidation');

const router = express.Router();

let warehouseController;
try {
  warehouseController = ServiceFactory.createWarehouseController();
} catch (error) {
  Logger.error('Failed to create warehouse controller:', error.message);
  warehouseController = {
    getWarehouses: (req, res) => {
      res.status(500).json({ error: 'Warehouse controller not available', details: error.message });
    },
    getWarehouseById: (req, res) => {
      res.status(500).json({ error: 'Warehouse controller not available', details: error.message });
    },
    createWarehouse: (req, res) => {
      res.status(500).json({ error: 'Warehouse controller not available', details: error.message });
    },
    updateWarehouse: (req, res) => {
      res.status(500).json({ error: 'Warehouse controller not available', details: error.message });
    },
    deactivateWarehouse: (req, res) => {
      res.status(500).json({ error: 'Warehouse controller not available', details: error.message });
    },
    deleteWarehouse: (req, res) => {
      res.status(500).json({ error: 'Warehouse controller not available', details: error.message });
    },
    getWarehouseMovements: (req, res) => {
      res.status(500).json({ error: 'Warehouse controller not available', details: error.message });
    }
  };
}

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