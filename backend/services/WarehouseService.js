/**
 * Warehouse business logic service
 * Handles business rules and validation for warehouses
 */
class WarehouseService {
  constructor(warehouseRepository, stockMovementRepository, logger) {
    this.warehouseRepository = warehouseRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.logger = logger;
  }

  /**
   * Get all warehouses for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User warehouses with stats
   */
  async getUserWarehouses(userId, options = {}) {
    try {
      this.logger.info(`Fetching warehouses for user: ${userId}`);
      
      const warehouses = await this.warehouseRepository.findByUserId(userId, options);
      
      // Enrich warehouses with statistics
      const warehousesWithStats = await Promise.all(
        warehouses.map(async (warehouse) => {
          try {
            const stats = await this.getWarehouseStats(warehouse.warehouse_id);
            return {
              ...warehouse,
              stats
            };
          } catch (error) {
            this.logger.warn(`Error fetching stats for warehouse ${warehouse.warehouse_id}: ${error.message}`);
            return {
              ...warehouse,
              stats: { totalMovements: 0, recentMovements: [] }
            };
          }
        })
      );
      
      return warehousesWithStats;
    } catch (error) {
      this.logger.error(`Error fetching user warehouses: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get warehouse by ID with ownership validation
   * @param {string} warehouseId - Warehouse ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Warehouse with stats
   */
  async getWarehouseById(warehouseId, userId) {
    try {
      const warehouse = await this.warehouseRepository.findById(warehouseId, 'warehouse_id');
      
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      // Validate ownership (user_id or owner_id)
      if (warehouse.user_id !== userId && warehouse.owner_id !== userId) {
        throw new Error('Access denied: Warehouse does not belong to user');
      }

      // Add statistics
      const stats = await this.getWarehouseStats(warehouseId);
      
      return {
        ...warehouse,
        stats
      };
    } catch (error) {
      this.logger.error(`Error fetching warehouse by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new warehouse with validation
   * @param {Object} warehouseData - Warehouse data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created warehouse
   */
  async createWarehouse(warehouseData, userId) {
    try {
      // Validate required fields
      this.validateWarehouseData(warehouseData);

      // Check for duplicate name
      await this.validateUniqueName(warehouseData.name, userId);

      // Prepare warehouse data
      const newWarehouse = {
        ...warehouseData,
        name: warehouseData.name.trim(),
        location: warehouseData.location.trim(),
        user_id: userId,
        owner_id: userId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createdWarehouse = await this.warehouseRepository.create(newWarehouse);
      
      this.logger.info(`Warehouse created successfully: ${createdWarehouse.warehouse_id}`);
      return createdWarehouse;
    } catch (error) {
      this.logger.error(`Error creating warehouse: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update warehouse with validation
   * @param {string} warehouseId - Warehouse ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated warehouse
   */
  async updateWarehouse(warehouseId, updateData, userId) {
    try {
      // Verify ownership
      const existingWarehouse = await this.getWarehouseById(warehouseId, userId);

      // Validate update data
      if (updateData.name) {
        updateData.name = updateData.name.trim();
        if (!updateData.name) {
          throw new Error('Warehouse name cannot be empty');
        }
        
        // Check for duplicate name (excluding current warehouse)
        await this.validateUniqueName(updateData.name, userId, warehouseId);
      }

      if (updateData.location) {
        updateData.location = updateData.location.trim();
        if (!updateData.location) {
          throw new Error('Warehouse location cannot be empty');
        }
      }

      // Check if deactivating warehouse with movements
      if (updateData.is_active === false && existingWarehouse.is_active === true) {
        const hasMovements = await this.hasStockMovements(warehouseId);
        if (hasMovements) {
          throw new Error('Cannot deactivate a warehouse with associated stock movements');
        }
      }

      const updatedWarehouse = await this.warehouseRepository.update(warehouseId, updateData, 'warehouse_id');
      
      this.logger.info(`Warehouse updated successfully: ${warehouseId}`);
      return updatedWarehouse;
    } catch (error) {
      this.logger.error(`Error updating warehouse: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate warehouse (soft delete)
   * @param {string} warehouseId - Warehouse ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deactivated warehouse
   */
  async deactivateWarehouse(warehouseId, userId) {
    try {
      // Verify ownership
      await this.getWarehouseById(warehouseId, userId);

      // Check for stock movements
      const hasMovements = await this.hasStockMovements(warehouseId);
      if (hasMovements) {
        throw new Error('Cannot delete a warehouse with stock movements. Consider deactivating instead.');
      }

      const deactivatedWarehouse = await this.warehouseRepository.update(
        warehouseId, 
        { is_active: false, updated_at: new Date().toISOString() }, 
        'warehouse_id'
      );
      
      this.logger.info(`Warehouse deactivated successfully: ${warehouseId}`);
      return deactivatedWarehouse;
    } catch (error) {
      this.logger.error(`Error deactivating warehouse: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permanently delete warehouse
   * @param {string} warehouseId - Warehouse ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteWarehouse(warehouseId, userId) {
    try {
      // Verify ownership
      await this.getWarehouseById(warehouseId, userId);

      // Check for stock movements
      const hasMovements = await this.hasStockMovements(warehouseId);
      if (hasMovements) {
        throw new Error('Cannot delete a warehouse that has movements associated');
      }

      await this.warehouseRepository.delete(warehouseId, 'warehouse_id');
      
      this.logger.info(`Warehouse deleted permanently: ${warehouseId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting warehouse: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get warehouse stock movements
   * @param {string} warehouseId - Warehouse ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Movements data
   */
  async getWarehouseMovements(warehouseId, userId, options = {}) {
    try {
      // Verify ownership
      const warehouse = await this.getWarehouseById(warehouseId, userId);

      const movements = await this.stockMovementRepository.findByWarehouseId(warehouseId, {
        limit: options.limit || 20,
        offset: options.offset || 0,
        orderBy: { column: 'movement_date', ascending: false }
      });

      return {
        movements,
        warehouse_id: warehouseId,
        warehouse_name: warehouse.name,
        meta: {
          limit: options.limit || 20,
          offset: options.offset || 0,
          total: movements.length
        }
      };
    } catch (error) {
      this.logger.error(`Error fetching warehouse movements: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get warehouse statistics
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<Object>} Warehouse statistics
   */
  async getWarehouseStats(warehouseId) {
    try {
      const movements = await this.stockMovementRepository.findByWarehouseId(warehouseId, {
        limit: 10,
        orderBy: { column: 'movement_date', ascending: false }
      });

      const totalMovements = await this.stockMovementRepository.count({
        warehouse_id: warehouseId
      });

      return {
        totalMovements,
        recentMovements: movements.slice(0, 5)
      };
    } catch (error) {
      this.logger.warn(`Error calculating warehouse stats: ${error.message}`);
      return {
        totalMovements: 0,
        recentMovements: []
      };
    }
  }

  /**
   * Check if warehouse has stock movements
   * @param {string} warehouseId - Warehouse ID
   * @returns {Promise<boolean>} Has movements
   */
  async hasStockMovements(warehouseId) {
    try {
      const count = await this.stockMovementRepository.count({
        warehouse_id: warehouseId
      });
      return count > 0;
    } catch (error) {
      this.logger.warn(`Error checking stock movements: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate warehouse data
   * @param {Object} warehouseData - Warehouse data to validate
   * @throws {Error} If validation fails
   */
  validateWarehouseData(warehouseData) {
    const requiredFields = ['name', 'location'];
    
    for (const field of requiredFields) {
      if (!warehouseData[field] || warehouseData[field].toString().trim() === '') {
        throw new Error(`${field} is required`);
      }
    }
  }

  /**
   * Validate unique warehouse name
   * @param {string} name - Warehouse name
   * @param {string} userId - User ID
   * @param {string} excludeId - Warehouse ID to exclude from check
   * @throws {Error} If name is not unique
   */
  async validateUniqueName(name, userId, excludeId = null) {
    try {
      const existingWarehouses = await this.warehouseRepository.findByUserId(userId);
      
      const nameExists = existingWarehouses.some(warehouse => 
        warehouse.warehouse_id !== excludeId &&
        warehouse.name.toLowerCase().trim() === name.toLowerCase().trim() &&
        warehouse.is_active
      );

      if (nameExists) {
        throw new Error('An active warehouse with that name already exists');
      }
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw error;
      }
      this.logger.warn(`Error validating unique name: ${error.message}`);
      // Don't throw on validation check errors, just log them
    }
  }
}

module.exports = { WarehouseService };
