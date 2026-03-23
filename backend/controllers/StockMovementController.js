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
   * Get all stock movements for organization
   * GET /api/stock-movements
   */
  async getMovements(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const options = this.buildQueryOptions(req.query);
      
      const movements = await this.stockMovementService.getOrganizationMovements(organizationId, options);
      
      res.json({
        data: movements,
        meta: {
          total: movements.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      this.logger.error('Error fetching movements', { 
        error: error.message,
        organizationId: req.user?.currentOrganizationId
      });
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
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const movement = await this.stockMovementService.getMovementById(id, organizationId);
      
      if (!movement) {
        return res.status(404).json({
          error: 'Movement not found'
        });
      }
      
      res.json({ data: movement });
    } catch (error) {
      this.logger.error(`Error fetching movement ${req.params.id}`, { 
        error: error.message,
        organizationId: req.user?.currentOrganizationId
      });
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
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const createdMovement = await this.stockMovementService.createMovement(movementData, organizationId);
      
      res.status(201).json({
        message: 'Movement created successfully',
        data: createdMovement
      });
    } catch (error) {
      this.logger.error('Error creating movement', { 
        error: error.message,
        body: req.body,
        organizationId: req.user?.currentOrganizationId
      });
      
      if (error.message.includes('required') || 
          error.message.includes('Required') ||
          error.message.includes('Invalid') ||
          error.message.includes('found') ||
          error.message.includes('does not belong')) {
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
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const updatedMovement = await this.stockMovementService.updateMovement(id, updateData, organizationId);
      
      res.json({
        message: 'Movement updated successfully',
        data: updatedMovement
      });
    } catch (error) {
      this.logger.error(`Error updating movement ${req.params.id}`, { 
        error: error.message,
        body: req.body,
        organizationId: req.user?.currentOrganizationId
      });
      
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        return res.status(404).json({
          error: error.message
        });
      }
      
      if (error.message.includes('required') || 
          error.message.includes('Required') ||
          error.message.includes('Invalid') ||
          error.message.includes('does not belong')) {
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
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      await this.stockMovementService.deleteMovement(id, organizationId);
      
      res.json({
        message: 'Movement deleted successfully'
      });
    } catch (error) {
      this.logger.error(`Error deleting movement ${req.params.id}`, { 
        error: error.message,
        organizationId: req.user?.currentOrganizationId
      });
      
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
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
      const organizationId = req.user.currentOrganizationId;
      const options = this.buildQueryOptions(req.query);
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const movements = await this.stockMovementService.getMovementsByProduct(productId, organizationId, options);
      
      res.json({
        data: movements,
        meta: {
          total: movements.length,
          productId,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for product ${req.params.productId}`, { 
        error: error.message,
        organizationId: req.user?.currentOrganizationId
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
      const organizationId = req.user.currentOrganizationId;
      const options = this.buildQueryOptions(req.query);
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const movements = await this.stockMovementService.getMovementsByWarehouse(warehouseId, organizationId, options);
      
      res.json({
        data: movements,
        meta: {
          total: movements.length,
          warehouseId,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for warehouse ${req.params.warehouseId}`, { 
        error: error.message,
        organizationId: req.user?.currentOrganizationId
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
          error: 'Start and end parameters are required'
        });
      }
      
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid dates'
        });
      }
      
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const options = this.buildQueryOptions(req.query);
      const movements = await this.stockMovementService.getMovementsByDateRange(startDate, endDate, organizationId, options);
      
      res.json({
        data: movements,
        meta: {
          total: movements.length,
          dateRange: { start, end },
          organizationId,
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
   * Create production movement (BOM)
   * POST /api/stock-movements/production
   */
  async createProductionMovement(req, res, next) {
    try {
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const result = await this.stockMovementService.createProductionMovement(req.body, orgId);

      res.status(201).json({
        message: 'Production movement created successfully',
        data: result,
      });
    } catch (error) {
      this.logger.error('Error creating production movement', { error: error.message });

      if (error.message.includes('required') || error.message.includes('Insufficient stock') ||
          error.message.includes('not found') || error.message.includes('No formula') ||
          error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }
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