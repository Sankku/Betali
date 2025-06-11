const { Logger } = require('../utils/Logger');

/**
 * Warehouse controller handling HTTP requests
 */
class WarehouseController {
  constructor(warehouseService) {
    this.warehouseService = warehouseService;
    this.logger = new Logger('WarehouseController');
  }

  /**
   * Get all warehouses for authenticated user
   * GET /api/warehouses
   */
  async getWarehouses(req, res, next) {
    try {
      const userId = req.user.id;
      const options = this.buildQueryOptions(req.query);
      
      const warehouses = await this.warehouseService.getUserWarehouses(userId, options);
      
      res.json({
        data: warehouses,
        meta: {
          total: warehouses.length,
          ...options
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching warehouses: ${error.message}`, {
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Get single warehouse by ID
   * GET /api/warehouses/:id
   */
  async getWarehouseById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const warehouse = await this.warehouseService.getWarehouseById(id, userId);
      
      res.json({ data: warehouse });
    } catch (error) {
      this.logger.error(`Error fetching warehouse by ID: ${error.message}`, {
        warehouseId: req.params.id,
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Create new warehouse
   * POST /api/warehouses
   */
  async createWarehouse(req, res, next) {
    try {
      const userId = req.user.id;
      const warehouseData = req.body;
      
      const createdWarehouse = await this.warehouseService.createWarehouse(warehouseData, userId);
      
      res.status(201).json({
        data: createdWarehouse,
        message: 'Warehouse created successfully'
      });
    } catch (error) {
      this.logger.error(`Error creating warehouse: ${error.message}`, {
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Update existing warehouse
   * PUT /api/warehouses/:id
   */
  async updateWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;
      
      const updatedWarehouse = await this.warehouseService.updateWarehouse(id, updateData, userId);
      
      res.json({
        data: updatedWarehouse,
        message: 'Warehouse updated successfully'
      });
    } catch (error) {
      this.logger.error(`Error updating warehouse: ${error.message}`, {
        warehouseId: req.params.id,
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Deactivate warehouse (soft delete)
   * DELETE /api/warehouses/:id
   */
  async deactivateWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const deactivatedWarehouse = await this.warehouseService.deactivateWarehouse(id, userId);
      
      res.json({
        data: deactivatedWarehouse,
        message: 'Warehouse deactivated successfully'
      });
    } catch (error) {
      this.logger.error(`Error deactivating warehouse: ${error.message}`, {
        warehouseId: req.params.id,
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Permanently delete warehouse
   * DELETE /api/warehouses/:id/permanent
   */
  async deleteWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      await this.warehouseService.deleteWarehouse(id, userId);
      
      res.json({
        message: 'Warehouse deleted permanently'
      });
    } catch (error) {
      this.logger.error(`Error deleting warehouse: ${error.message}`, {
        warehouseId: req.params.id,
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Get warehouse movements
   * GET /api/warehouses/:id/movements
   */
  async getWarehouseMovements(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const options = {
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      };
      
      const movementsData = await this.warehouseService.getWarehouseMovements(id, userId, options);
      
      res.json({
        data: movementsData.movements,
        meta: {
          warehouse_id: movementsData.warehouse_id,
          warehouse_name: movementsData.warehouse_name,
          ...movementsData.meta
        }
      });
    } catch (error) {
      this.logger.error(`Error fetching warehouse movements: ${error.message}`, {
        warehouseId: req.params.id,
        userId: req.user?.id,
        error: error.message
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
      options.limit = Math.min(parseInt(query.limit), 100);
    }
    if (query.offset) {
      options.offset = parseInt(query.offset);
    }
    
    // Sorting
    if (query.sortBy) {
      options.orderBy = {
        column: query.sortBy,
        ascending: query.sortOrder !== 'desc'
      };
    }
    
    // Filtering
    if (query.active !== undefined) {
      options.filters = {
        is_active: query.active === 'true'
      };
    }
    
    return options;
  }
}

module.exports = { WarehouseController };
