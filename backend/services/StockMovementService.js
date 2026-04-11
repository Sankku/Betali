const { incrementUsage } = require('../middleware/limitEnforcement');

/**
 * Stock movement business logic service
 * Handles business rules and validation for stock movements
 */
class StockMovementService {
  constructor(stockMovementRepository, productLotRepository, warehouseRepository, logger) {
    this.stockMovementRepository = stockMovementRepository;
    this.productLotRepository = productLotRepository;
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
        const lotObj = movement.lot_id && typeof movement.lot_id === 'object'
          ? movement.lot_id
          : null;
        const warehouseObj = movement.warehouse_id && typeof movement.warehouse_id === 'object'
          ? movement.warehouse_id
          : null;

        return {
          ...movement,
          // Restore scalar FK IDs (Supabase overwrites them with the nested object)
          lot_id: lotObj?.lot_id ?? movement.lot_id,
          warehouse_id: warehouseObj?.warehouse_id ?? movement.warehouse_id,
          // Nested objects expected by the frontend
          lot: lotObj,
          warehouse: warehouseObj,
          // Flat convenience fields
          lot_number: lotObj?.lot_number || 'Unknown Lot',
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
      
      // Enrich with lot and warehouse information
      const [lot, warehouse] = await Promise.all([
        movement.lot_id ? this.productLotRepository.findById(movement.lot_id, organizationId) : null,
        movement.warehouse_id ? this.warehouseRepository.findById(movement.warehouse_id, 'warehouse_id') : null
      ]);

      return {
        ...movement,
        lot,
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

      // Validate sufficient stock in the selected warehouse for exit/production movements
      if (['exit', 'production'].includes(movementData.movement_type)) {
        const availableStock = await this.stockMovementRepository.getCurrentStock(
          movementData.lot_id,
          movementData.warehouse_id,
          organizationId
        );
        if (availableStock < movementData.quantity) {
          throw new Error(
            `Stock insuficiente en el depósito seleccionado. Disponible: ${availableStock}, Solicitado: ${movementData.quantity}`
          );
        }
      }

      // Validate max_stock is not exceeded for entry/adjustment movements
      if (['entry', 'adjustment'].includes(movementData.movement_type) && movementData.lot_id) {
        const lot = await this.productLotRepository.findById(movementData.lot_id, organizationId);
        if (lot && lot.product_types && lot.product_types.max_stock != null) {
          const currentStock = await this.stockMovementRepository.getCurrentStock(
            movementData.lot_id,
            movementData.warehouse_id,
            organizationId
          );
          const newStock = currentStock + movementData.quantity;
          if (newStock > lot.product_types.max_stock) {
            throw new Error(
              `El movimiento excedería el stock máximo del producto. Actual: ${currentStock}, Máximo permitido: ${lot.product_types.max_stock}, Solicitado: ${movementData.quantity}`
            );
          }
        }
      }

      // Destructure to exclude frontend-only fields not present in stock_movements table
      const { product_type_id: _unused, ...movementFields } = movementData;
      const movementToCreate = {
        ...movementFields,
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
      if (updateData.lot_id || updateData.warehouse_id) {
        await this.validateReferences({
          lot_id: updateData.lot_id || existingMovement.lot_id,
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
   * Bulk delete stock movements
   * @param {Array<string>} ids
   * @param {string} organizationId
   * @returns {Promise<Object>}
   */
  async bulkDeleteMovements(ids, organizationId) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids array is required and must not be empty');
      err.status = 400;
      throw err;
    }

    try {
      this.logger.info(`Bulk deleting ${ids.length} stock movements`);

      const { data: existing, error: existingError } = await this.stockMovementRepository.client
        .from(this.stockMovementRepository.table)
        .select('movement_id')
        .in('movement_id', ids)
        .eq('organization_id', organizationId);

      if (existingError) throw existingError;
      const foundIds = (existing || []).map(m => m.movement_id);

      if (foundIds.length > 0) {
        const { error: deleteError } = await this.stockMovementRepository.client
          .from(this.stockMovementRepository.table)
          .delete()
          .in('movement_id', foundIds)
          .eq('organization_id', organizationId);
        
        if (deleteError) throw deleteError;
      }

      return {
        deleted: foundIds.length,
        not_found: ids.length - foundIds.length
      };
    } catch (error) {
      this.logger.error(`Error bulk deleting movements: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movements by lot ID within organization
   * @param {string} lotId - Product Lot ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Lot movements
   */
  async getMovementsByLot(lotId, organizationId, options = {}) {
    try {
      this.logger.info(`Fetching movements for lot: ${lotId} in organization: ${organizationId}`);

      return await this.stockMovementRepository.findByLotIdAndOrganization(lotId, organizationId, {
        orderBy: { column: 'movement_date', ascending: false },
        ...options
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for lot ${lotId}: ${error.message}`);
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
    const required = ['movement_type', 'quantity', 'lot_id', 'warehouse_id'];
    
    for (const field of required) {
      if (!movementData[field]) {
        throw new Error(`Required field: ${field}`);
      }
    }
    
    if (typeof movementData.quantity !== 'number' || movementData.quantity <= 0) {
      throw new Error('Quantity must be a number greater than 0');
    }
    
    const validTypes = ['entry', 'exit', 'adjustment', 'senasa', 'production'];
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
    if (movementData.lot_id) {
      const lot = await this.productLotRepository.findById(movementData.lot_id, organizationId);
      if (!lot) {
        throw new Error('Product lot not found');
      }
      if (lot.organization_id !== organizationId) {
        throw new Error('Lot does not belong to your organization');
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

  /**
   * Create a production movement via Supabase RPC (atomic).
   * @param {Object} data - { finished_product_id, quantity_to_produce, warehouse_id, reference }
   * @param {string} organizationId
   * @returns {Promise<Object>} RPC result with reference and summary
   */
  async createProductionMovement(data, organizationId) {
    try {
      this.logger.info(`Creating production movement for org: ${organizationId}`, { data });

      const { finished_product_type_id, quantity_to_produce, warehouse_id, reference } = data;

      if (!finished_product_type_id || !quantity_to_produce || !warehouse_id) {
        throw new Error('finished_product_type_id, quantity_to_produce, and warehouse_id are required');
      }
      if (typeof quantity_to_produce !== 'number' || quantity_to_produce <= 0) {
        throw new Error('quantity_to_produce must be a number greater than 0');
      }

      const warehouse = await this.warehouseRepository.findById(warehouse_id);
      if (!warehouse || warehouse.organization_id !== organizationId) {
        throw new Error('Warehouse not found or does not belong to your organization');
      }

      const result = await this.stockMovementRepository.callRpc('create_production_movement', {
        p_finished_product_type_id: finished_product_type_id,
        p_quantity_to_produce: quantity_to_produce,
        p_warehouse_id: warehouse_id,
        p_organization_id: organizationId,
        p_user_reference: reference || null,
      });

      this.logger.info(`Production movement created: ${result?.reference}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating production movement: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { StockMovementService };