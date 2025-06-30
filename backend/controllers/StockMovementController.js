const { Logger } = require('../utils/Logger');

/**
 * Stock movement controller handling HTTP requests
 */
class StockMovementController {
  constructor(stockMovementService) {
    this.stockMovementService = stockMovementService;
    this.logger = new Logger('StockMovementController');
  }

  /**
   * Get all stock movements
   * GET /api/stock-movements
   */
  async getMovements(req, res, next) {
    try {
      const options = this.buildQueryOptions(req.query);
      
      const movements = await this.stockMovementService.getAllMovements(options);
      
      res.json({
        data: movements,
        meta: {
          total: movements.length,
          ...options
        }
      });
    } catch (error) {
      this.logger.error('Error fetching movements', { error: error.message });
      next(error);
    }
  }

  /**
   * Get movement by ID
   * GET /api/stock-movements/:id
   */
  async getMovement(req, res, next) {
    try {
      const { id } = req.params;
      
      const movement = await this.stockMovementService.getMovementById(id);
      
      if (!movement) {
        return res.status(404).json({
          error: 'Movimiento no encontrado'
        });
      }
      
      res.json({ data: movement });
    } catch (error) {
      this.logger.error(`Error fetching movement ${req.params.id}`, { error: error.message });
      next(error);
    }
  }

  /**
   * Create new stock movement
   * POST /api/stock-movements
   */
  async createMovement(req, res, next) {
    try {
      const movementData = req.body;
      
      const createdMovement = await this.stockMovementService.createMovement(movementData);
      
      res.status(201).json({
        message: 'Movimiento creado exitosamente',
        data: createdMovement
      });
    } catch (error) {
      this.logger.error('Error creating movement', { 
        error: error.message,
        body: req.body 
      });
      
      if (error.message.includes('requerido') || 
          error.message.includes('inválido') ||
          error.message.includes('encontrado')) {
        return res.status(400).json({
          error: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Update stock movement
   * PUT /api/stock-movements/:id
   */
  async updateMovement(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedMovement = await this.stockMovementService.updateMovement(id, updateData);
      
      res.json({
        message: 'Movimiento actualizado exitosamente',
        data: updatedMovement
      });
    } catch (error) {
      this.logger.error(`Error updating movement ${req.params.id}`, { 
        error: error.message,
        body: req.body 
      });
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          error: error.message
        });
      }
      
      if (error.message.includes('requerido') || 
          error.message.includes('inválido')) {
        return res.status(400).json({
          error: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Delete stock movement
   * DELETE /api/stock-movements/:id
   */
  async deleteMovement(req, res, next) {
    try {
      const { id } = req.params;
      
      await this.stockMovementService.deleteMovement(id);
      
      res.json({
        message: 'Movimiento eliminado exitosamente'
      });
    } catch (error) {
      this.logger.error(`Error deleting movement ${req.params.id}`, { error: error.message });
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          error: error.message
        });
      }
      
      next(error);
    }
  }

  /**
   * Get movements by product
   * GET /api/stock-movements/product/:productId
   */
  async getMovementsByProduct(req, res, next) {
    try {
      const { productId } = req.params;
      const options = this.buildQueryOptions(req.query);
      
      const movements = await this.stockMovementService.getMovementsByProduct(productId, options);
      
      res.json({
        data: movements,
        meta: {
          total: movements.length,
          productId,
          ...options
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for product ${req.params.productId}`, { 
        error: error.message 
      });
      next(error);
    }
  }

  /**
   * Get movements by warehouse
   * GET /api/stock-movements/warehouse/:warehouseId
   */
  async getMovementsByWarehouse(req, res, next) {
    try {
      const { warehouseId } = req.params;
      const options = this.buildQueryOptions(req.query);
      
      const movements = await this.stockMovementService.getMovementsByWarehouse(warehouseId, options);
      
      res.json({
        data: movements,
        meta: {
          total: movements.length,
          warehouseId,
          ...options
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for warehouse ${req.params.warehouseId}`, { 
        error: error.message 
      });
      next(error);
    }
  }

  /**
   * Get movements by date range
   * GET /api/stock-movements/date-range?start=2024-01-01&end=2024-12-31
   */
  async getMovementsByDateRange(req, res, next) {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({
          error: 'Parámetros start y end son requeridos'
        });
      }
      
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: 'Fechas inválidas'
        });
      }
      
      const options = this.buildQueryOptions(req.query);
      const movements = await this.stockMovementService.getMovementsByDateRange(startDate, endDate, options);
      
      res.json({
        data: movements,
        meta: {
          total: movements.length,
          dateRange: { start, end },
          ...options
        }
      });
    } catch (error) {
      this.logger.error('Error fetching movements by date range', { 
        error: error.message,
        query: req.query 
      });
      next(error);
    }
  }

  /**
   * Build query options from request query parameters
   * @param {Object} query - Request query parameters
   * @returns {Object} Query options
   */
  buildQueryOptions(query) {
    const options = {};
    
    // Pagination
    if (query.limit) {
      const limit = parseInt(query.limit);
      if (!isNaN(limit) && limit > 0) {
        options.limit = Math.min(limit, 100); // Max 100 items
      }
    }
    
    if (query.offset) {
      const offset = parseInt(query.offset);
      if (!isNaN(offset) && offset >= 0) {
        options.offset = offset;
      }
    }
    
    // Ordering
    if (query.orderBy) {
      options.orderBy = {
        column: query.orderBy,
        ascending: query.order !== 'desc'
      };
    }
    
    return options;
  }
}

module.exports = { StockMovementController };