const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest } = require('../middleware/validation');
const { Logger } = require('../utils/Logger');
const { 
  createStockMovementSchema, 
  updateStockMovementSchema,
  queryParamsSchema
} = require('../validations/stockMovementValidation');

/**
 * Initialize stock movement routes
 * @param {Object} dependencies - Injected dependencies
 * @returns {Router} Express router
 */
function createStockMovementRoutes(dependencies = {}) {
  const router = express.Router();
  const logger = new Logger('StockMovementRoutes');
  
  // Simple test route without authentication first
  router.get('/test', (req, res) => {
    res.json({ message: 'Stock movements route working', timestamp: new Date().toISOString() });
  });
  
  // Initialize services
  const serviceFactory = dependencies.serviceFactory || ServiceFactory.getInstance();
  const stockMovementController = serviceFactory.createStockMovementController();
  
  // Middleware: All routes require authentication and organization context
  router.use(authenticateUser);
  router.use(requireOrganizationContext);
  
  // GET /api/stock-movements - Get all movements
  router.get('/', async (req, res, next) => {
    try {
      logger.info('GET /api/stock-movements');
      await stockMovementController.getMovements(req, res, next);
    } catch (error) {
      logger.error('Error in GET /api/stock-movements', { error: error.message });
      next(error);
    }
  });
  
  // GET /api/stock-movements/product/:productId - Get movements by product
  router.get('/product/:productId', async (req, res, next) => {
    try {
      logger.info(`GET /api/stock-movements/product/${req.params.productId}`);
      await stockMovementController.getMovementsByProduct(req, res, next);
    } catch (error) {
      logger.error(`Error in GET /api/stock-movements/product/${req.params.productId}`, { 
        error: error.message 
      });
      next(error);
    }
  });
  
  // GET /api/stock-movements/warehouse/:warehouseId - Get movements by warehouse
  router.get('/warehouse/:warehouseId', async (req, res, next) => {
    try {
      logger.info(`GET /api/stock-movements/warehouse/${req.params.warehouseId}`);
      await stockMovementController.getMovementsByWarehouse(req, res, next);
    } catch (error) {
      logger.error(`Error in GET /api/stock-movements/warehouse/${req.params.warehouseId}`, { 
        error: error.message 
      });
      next(error);
    }
  });
  
  // GET /api/stock-movements/date-range - Get movements by date range
  router.get('/date-range', async (req, res, next) => {
    try {
      logger.info('GET /api/stock-movements/date-range', { query: req.query });
      await stockMovementController.getMovementsByDateRange(req, res, next);
    } catch (error) {
      logger.error('Error in GET /api/stock-movements/date-range', { 
        error: error.message,
        query: req.query 
      });
      next(error);
    }
  });
  
  // GET /api/stock-movements/:id - Get movement by ID
  router.get('/:id', async (req, res, next) => {
    try {
      logger.info(`GET /api/stock-movements/${req.params.id}`);
      await stockMovementController.getMovement(req, res, next);
    } catch (error) {
      logger.error(`Error in GET /api/stock-movements/${req.params.id}`, { error: error.message });
      next(error);
    }
  });
  
  // POST /api/stock-movements - Create movement
  router.post('/', 
    validateRequest(createStockMovementSchema),
    async (req, res, next) => {
      try {
        logger.info('POST /api/stock-movements', { body: req.body });
        await stockMovementController.createMovement(req, res, next);
      } catch (error) {
        logger.error('Error in POST /api/stock-movements', { 
          error: error.message,
          body: req.body 
        });
        next(error);
      }
    }
  );
  
  // PUT /api/stock-movements/:id - Update movement
  router.put('/:id',
    validateRequest(updateStockMovementSchema),
    async (req, res, next) => {
      try {
        logger.info(`PUT /api/stock-movements/${req.params.id}`, { body: req.body });
        await stockMovementController.updateMovement(req, res, next);
      } catch (error) {
        logger.error(`Error in PUT /api/stock-movements/${req.params.id}`, { 
          error: error.message,
          body: req.body 
        });
        next(error);
      }
    }
  );
  
  // DELETE /api/stock-movements/:id - Delete movement
  router.delete('/:id', async (req, res, next) => {
    try {
      logger.info(`DELETE /api/stock-movements/${req.params.id}`);
      await stockMovementController.deleteMovement(req, res, next);
    } catch (error) {
      logger.error(`Error in DELETE /api/stock-movements/${req.params.id}`, { 
        error: error.message 
      });
      next(error);
    }
  });
  
  return router;
}

module.exports = createStockMovementRoutes;