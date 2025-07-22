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
   * Get all stock movements with related data
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Stock movements with product and warehouse info
   */
  async getAllMovements(options = {}) {
    try {
      this.logger.info('Fetching all stock movements with relations');
      
      // Use the new method that includes relations
      const movements = await this.stockMovementRepository.findAllWithRelations({}, {
        orderBy: { column: 'created_at', ascending: false },
        ...options
      });
      
      this.logger.info(`Found ${movements.length} stock movements with relations`);
      
      // Process the movements to ensure proper structure
      return movements.map(movement => ({
        ...movement,
        // Ensure product and warehouse are properly structured from the nested objects
        product_name: movement.product_id?.name || 'Unknown Product',
        product_category: movement.product_id?.category || 'Unknown Category',
        warehouse_name: movement.warehouse_id?.name || 'Unknown Warehouse',
        warehouse_location: movement.warehouse_id?.location || 'Unknown Location'
      }));
      
    } catch (error) {
      this.logger.error(`Error fetching stock movements: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movement by ID with related data
   * @param {string} movementId - Movement ID
   * @returns {Promise<Object|null>} Movement with product and warehouse info
   */
  async getMovementById(movementId) {
    try {
      this.logger.info(`Fetching movement: ${movementId}`);
      
      const movement = await this.stockMovementRepository.findById(movementId, 'movement_id');
      if (!movement) {
        return null;
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
   * @returns {Promise<Object>} Created movement
   */
  async createMovement(movementData) {
    try {
      this.logger.info('Creating new stock movement', { movementData });
      
      // Validate required fields
      this.validateMovementData(movementData);
      
      // Validate that product and warehouse exist
      await this.validateReferences(movementData);
      
      const movementToCreate = {
        ...movementData,
        movement_date: movementData.movement_date || new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      const createdMovement = await this.stockMovementRepository.create(movementToCreate);
      
      this.logger.info(`Stock movement created: ${createdMovement.movement_id}`);
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
   * @returns {Promise<Object>} Updated movement
   */
  async updateMovement(movementId, updateData) {
    try {
      this.logger.info(`Updating movement: ${movementId}`, { updateData });
      
      // Check if movement exists
      const existingMovement = await this.stockMovementRepository.findById(movementId, 'movement_id');
      if (!existingMovement) {
        throw new Error('Movimiento no encontrado');
      }
      
      // Validate references if they are being updated
      if (updateData.product_id || updateData.warehouse_id) {
        await this.validateReferences({
          product_id: updateData.product_id || existingMovement.product_id,
          warehouse_id: updateData.warehouse_id || existingMovement.warehouse_id
        });
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
   * @returns {Promise<boolean>} Success status
   */
  async deleteMovement(movementId) {
    try {
      this.logger.info(`Deleting movement: ${movementId}`);
      
      // Check if movement exists
      const existingMovement = await this.stockMovementRepository.findById(movementId, 'movement_id');
      if (!existingMovement) {
        throw new Error('Movimiento no encontrado');
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
   * Get movements by product ID
   * @param {string} productId - Product ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Product movements
   */
  async getMovementsByProduct(productId, options = {}) {
    try {
      this.logger.info(`Fetching movements for product: ${productId}`);
      
      return await this.stockMovementRepository.findByProductId(productId, {
        orderBy: { column: 'movement_date', ascending: false },
        ...options
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for product ${productId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movements by warehouse ID
   * @param {string} warehouseId - Warehouse ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Warehouse movements
   */
  async getMovementsByWarehouse(warehouseId, options = {}) {
    try {
      this.logger.info(`Fetching movements for warehouse: ${warehouseId}`);
      
      return await this.stockMovementRepository.findByWarehouseId(warehouseId, {
        orderBy: { column: 'movement_date', ascending: false },
        ...options
      });
    } catch (error) {
      this.logger.error(`Error fetching movements for warehouse ${warehouseId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movements by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Movements in date range
   */
  async getMovementsByDateRange(startDate, endDate, options = {}) {
    try {
      this.logger.info(`Fetching movements from ${startDate} to ${endDate}`);
      
      return await this.stockMovementRepository.findByDateRange(startDate, endDate, options);
    } catch (error) {
      this.logger.error(`Error fetching movements by date range: ${error.message}`);
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
        throw new Error(`Campo requerido: ${field}`);
      }
    }
    
    if (typeof movementData.quantity !== 'number' || movementData.quantity <= 0) {
      throw new Error('La cantidad debe ser un número mayor a 0');
    }
    
    const validTypes = ['entry', 'exit', 'adjustment', 'senasa'];
    if (!validTypes.includes(movementData.movement_type)) {
      throw new Error(`Tipo de movimiento inválido. Debe ser uno de: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate that referenced entities exist
   * @param {Object} movementData - Movement data
   * @throws {Error} If references don't exist
   */
  async validateReferences(movementData) {
    if (movementData.product_id) {
      const product = await this.productRepository.findById(movementData.product_id, 'product_id');
      if (!product) {
        throw new Error('Producto no encontrado');
      }
    }
    
    if (movementData.warehouse_id) {
      const warehouse = await this.warehouseRepository.findById(movementData.warehouse_id, 'warehouse_id');
      if (!warehouse) {
        throw new Error('Almacén no encontrado');
      }
    }
  }
}

module.exports = { StockMovementService };