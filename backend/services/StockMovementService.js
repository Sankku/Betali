const { incrementUsage } = require('../middleware/limitEnforcement');

/**
 * Stock movement business logic service
 * Handles business rules and validation for stock movements
 */
class StockMovementService {
  constructor(stockMovementRepository, productRepository, warehouseRepository, logger) {
    this.stockMovementRepository = stockMovementRepository;
    this.productRepository = productRepository;
    this.warehouseRepository = warehouseRepository;
    this.logger = logger;
  }

  /**
   * Get all stock movements for an organization with related data
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Stock movements with product and warehouse info
   */
  async getOrganizationMovements(organizationId, options = {}) {
    try {
      this.logger.info(`Fetching stock movements for organization: ${organizationId}`);
      
      // Use the new method that includes relations with organization filter
      const movements = await this.stockMovementRepository.findAllWithRelations(
        { organization_id: organizationId }, 
        {
          orderBy: { column: 'created_at', ascending: false },
          ...options
        }
      );
      
      this.logger.info(`Found ${movements.length} stock movements for organization ${organizationId}`);
      
      // Process the movements to ensure proper structure.
      // Supabase returns nested FK objects under the column name (product_id, warehouse_id).
      // We re-map them to `product` and `warehouse` so the frontend can access them as
      // movement.product?.name and movement.warehouse?.name consistently.
      return movements.map(movement => {
        const productObj = movement.product_id && typeof movement.product_id === 'object'
          ? movement.product_id
          : null;
        const warehouseObj = movement.warehouse_id && typeof movement.warehouse_id === 'object'
          ? movement.warehouse_id
          : null;

        return {
          ...movement,
          // Restore scalar FK IDs (Supabase overwrites them with the nested object)
          product_id: productObj?.product_id ?? movement.product_id,
          warehouse_id: warehouseObj?.warehouse_id ?? movement.warehouse_id,
          // Nested objects expected by the frontend
          product: productObj,
          warehouse: warehouseObj,
          // Flat convenience fields kept for backwards compatibility
          product_name: productObj?.name || 'Unknown Product',
          product_category: productObj?.category || 'Unknown Category',
          warehouse_name: warehouseObj?.name || 'Unknown Warehouse',
          warehouse_location: warehouseObj?.location || 'Unknown Location',
        };
      });
      
    } catch (error) {
      this.logger.error(`Error fetching stock movements: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movement by ID with organization validation and related data
   * @param {string} movementId - Movement ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Movement with product and warehouse info
   */
  async getMovementById(movementId, organizationId) {
    try {
      this.logger.info(`Fetching movement: ${movementId} for organization: ${organizationId}`);
      
      const movement = await this.stockMovementRepository.findById(movementId, 'movement_id');
      if (!movement) {
        return null;
      }
      
      // Validate organization access
      if (movement.organization_id !== organizationId) {
        throw new Error('Access denied: Movement does not belong to your organization');
      }
      
      // Enrich with product and warehouse information
      const [product, warehouse] = await Promise.all([
        movement.product_id ? this.productRepository.findById(movement.product_id, 'product_id') : null,
        movement.warehouse_id ? this.warehouseRepository.findById(movement.warehouse_id, 'warehouse_id') : null
      ]);
      
      return {
        ...movement,
        product,
        warehouse
      };
    } catch (error) {
      this.logger.error(`Error fetching movement ${movementId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new stock movement
   * @param {Object} movementData - Movement data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Created movement
   */
  async createMovement(movementData, organizationId) {
    try {
      this.logger.info(`Creating new stock movement for organization: ${organizationId}`, { movementData });
      
      // Validate required fields
      this.validateMovementData(movementData);
      
      // Validate that product and warehouse exist within organization
      await this.validateReferences(movementData, organizationId);
      
      const movementToCreate = {
        ...movementData,
        organization_id: organizationId,
        movement_date: movementData.movement_date || new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      const createdMovement = await this.stockMovementRepository.create(movementToCreate);

      this.logger.info(`Stock movement created: ${createdMovement.movement_id}`);

      // Track monthly usage (fire-and-forget, must not fail the operation)
      incrementUsage(organizationId, 'stock_movements_per_month').catch(err =>
        this.logger.error('Failed to increment stock movement usage', { error: err.message })
      );

      return createdMovement;
    } catch (error) {
      this.logger.error(`Error creating stock movement: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing stock movement
   * @param {string} movementId - Movement ID
   * @param {Object} updateData - Update data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Updated movement
   */
  async updateMovement(movementId, updateData, organizationId) {
    try {
      this.logger.info(`Updating movement: ${movementId} for organization: ${organizationId}`, { updateData });
      
      // Check if movement exists and belongs to organization
      const existingMovement = await this.stockMovementRepository.findById(movementId, 'movement_id');
      if (!existingMovement) {
        throw new Error('Movement not found');
      }
      
      // Validate organization access
      if (existingMovement.organization_id !== organizationId) {
        throw new Error('Access denied: Movement does not belong to your organization');
      }
      
      // Validate references if they are being updated
      if (updateData.product_id || updateData.warehouse_id) {
        await this.validateReferences({
          product_id: updateData.product_id || existingMovement.product_id,
          warehouse_id: updateData.warehouse_id || existingMovement.warehouse_id
        }, organizationId);
      }
      
      const updatedMovement = await this.stockMovementRepository.update(movementId, updateData, 'movement_id');
      
      this.logger.info(`Movement updated: ${movementId}`);
      return updatedMovement;
    } catch (error) {
      this.logger.error(`Error updating movement ${movementId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a stock movement
   * @param {string} movementId - Movement ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteMovement(movementId, organizationId) {
    try {
      this.logger.info(`Deleting movement: ${movementId} for organization: ${organizationId}`);
      
      // Check if movement exists and belongs to organization
      const existingMovement = await this.stockMovementRepository.findById(movementId, 'movement_id');
      if (!existingMovement) {
        throw new Error('Movement not found');
      }
      
      // Validate organization access
      if (existingMovement.organization_id !== organizationId) {
        throw new Error('Access denied: Movement does not belong to your organization');
      }
      
      await this.stockMovementRepository.delete(movementId, 'movement_id');
      
      this.logger.info(`Movement deleted: ${movementId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting movement ${movementId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movements by product ID within organization
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Product movements
   */
  async getMovementsByProduct(productId, organizationId, options = {}) {
    try {
      this.logger.info(`Fetching movements for product: ${productId} in organization: ${organizationId}`);
      
      return await this.stockMovementRepository.findByProductIdAndOrganization(productId, organizationId, {
        orderBy: { column: 'movement_date', ascending: false },
        ...options
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for product ${productId} in organization ${organizationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movements by warehouse ID within organization
   * @param {string} warehouseId - Warehouse ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Warehouse movements
   */
  async getMovementsByWarehouse(warehouseId, organizationId, options = {}) {
    try {
      this.logger.info(`Fetching movements for warehouse: ${warehouseId} in organization: ${organizationId}`);
      
      return await this.stockMovementRepository.findByWarehouseIdAndOrganization(warehouseId, organizationId, {
        orderBy: { column: 'movement_date', ascending: false },
        ...options
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for warehouse ${warehouseId} in organization ${organizationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movements by date range within organization
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Movements in date range
   */
  async getMovementsByDateRange(startDate, endDate, organizationId, options = {}) {
    try {
      this.logger.info(`Fetching movements from ${startDate} to ${endDate} for organization: ${organizationId}`);
      
      return await this.stockMovementRepository.findByDateRangeAndOrganization(
        startDate, 
        endDate, 
        organizationId, 
        options
      );
    } catch (error) {
      this.logger.error(`Error fetching movements by date range for organization ${organizationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate movement data
   * @param {Object} movementData - Movement data to validate
   * @throws {Error} If validation fails
   */
  validateMovementData(movementData) {
    const required = ['movement_type', 'quantity', 'product_id', 'warehouse_id'];
    
    for (const field of required) {
      if (!movementData[field]) {
        throw new Error(`Required field: ${field}`);
      }
    }
    
    if (typeof movementData.quantity !== 'number' || movementData.quantity <= 0) {
      throw new Error('Quantity must be a number greater than 0');
    }
    
    const validTypes = ['entry', 'exit', 'adjustment', 'senasa'];
    if (!validTypes.includes(movementData.movement_type)) {
      throw new Error(`Invalid movement type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate that referenced entities exist within organization
   * @param {Object} movementData - Movement data
   * @param {string} organizationId - Organization ID
   * @throws {Error} If references don't exist or don't belong to organization
   */
  async validateReferences(movementData, organizationId) {
    if (movementData.product_id) {
      const product = await this.productRepository.findById(movementData.product_id, organizationId);
      if (!product) {
        throw new Error('Product not found');
      }
      if (product.organization_id !== organizationId) {
        throw new Error('Product does not belong to your organization');
      }
    }

    if (movementData.warehouse_id) {
      const warehouse = await this.warehouseRepository.findById(movementData.warehouse_id);
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }
      if (warehouse.organization_id !== organizationId) {
        throw new Error('Warehouse does not belong to your organization');
      }
    }
  }
}

module.exports = { StockMovementService };