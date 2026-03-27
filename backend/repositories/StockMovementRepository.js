const { BaseRepository } = require('./BaseRepository');

/**
 * Stock movement repository with specific business logic
 */
class StockMovementRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'stock_movements');
  }

  /**
   * Find movements by product ID
   * @param {string} productId - Product ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByProductId(productId, options = {}) {
    return this.findAll({ product_id: productId }, options);
  }

  /**
   * Find movements by warehouse ID
   * @param {string} warehouseId - Warehouse ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByWarehouseId(warehouseId, options = {}) {
    return this.findAll({ warehouse_id: warehouseId }, options);
  }

  /**
   * Find all movements with related product and warehouse data
   * @param {Object} filters - Filter conditions
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAllWithRelations(filters = {}, options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select(`
          *,
          product_id(product_id, name),
          warehouse_id(warehouse_id, name, location)
        `); 

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      if (options.orderBy) {
        const { column, ascending = true } = options.orderBy;
        query = query.order(column, { ascending });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error finding movements with relations: ${error.message}`);
    }
  }

  /**
   * Find movements by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByDateRange(startDate, endDate, options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .gte('movement_date', startDate.toISOString())
        .lte('movement_date', endDate.toISOString());

      if (options.orderBy) {
        const { column, ascending = true } = options.orderBy;
        query = query.order(column, { ascending });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error finding movements by date range: ${error.message}`);
    }
  }

  /**
   * Find movements by product ID and organization
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByProductIdAndOrganization(productId, organizationId, options = {}) {
    return this.findAll({ product_id: productId, organization_id: organizationId }, options);
  }

  /**
   * Find movements by warehouse ID and organization
   * @param {string} warehouseId - Warehouse ID
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByWarehouseIdAndOrganization(warehouseId, organizationId, options = {}) {
    return this.findAll({ warehouse_id: warehouseId, organization_id: organizationId }, options);
  }

  /**
   * Find movements by date range and organization
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByDateRangeAndOrganization(startDate, endDate, organizationId, options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .gte('movement_date', startDate.toISOString())
        .lte('movement_date', endDate.toISOString());

      if (options.orderBy) {
        const { column, ascending = true } = options.orderBy;
        query = query.order(column, { ascending });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error finding movements by date range and organization: ${error.message}`);
    }
  }

  /**
   * Get current stock for a product in a specific warehouse
   * @param {string} productId - Product ID
   * @param {string} warehouseId - Warehouse ID (optional, if null gets stock across all warehouses)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>} Available stock quantity
   */
  async getCurrentStock(productId, warehouseId, organizationId) {
    try {
      let query = this.client
        .from(this.table)
        .select('movement_type, quantity')
        .eq('product_id', productId)
        .eq('organization_id', organizationId);
      
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate stock: entries - exits/production
      let totalStock = 0;
      data.forEach(movement => {
        if (movement.movement_type === 'entry') {
          totalStock += parseFloat(movement.quantity);
        } else if (['exit', 'production'].includes(movement.movement_type)) {
          totalStock -= parseFloat(movement.quantity);
        }
      });

      return Math.max(0, totalStock); // Never return negative stock
    } catch (error) {
      throw new Error(`Error getting current stock: ${error.message}`);
    }
  }

  /**
   * Get current stock for multiple products in a specific warehouse
   * @param {Array<string>} productIds - Array of product IDs
   * @param {string} warehouseId - Warehouse ID (optional)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Object with productId as keys and stock quantities as values
   */
  async getCurrentStockBulk(productIds, warehouseId, organizationId) {
    try {
      let query = this.client
        .from(this.table)
        .select('product_id, movement_type, quantity')
        .in('product_id', productIds)
        .eq('organization_id', organizationId);
      
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group movements by (product_id, warehouse_id) first, then sum per-warehouse
      // stocks clamped to 0. This avoids negative stock in one warehouse cancelling
      // positive stock in another when warehouseId is null (all warehouses).
      const stockByProductWarehouse = {};

      productIds.forEach(productId => {
        stockByProductWarehouse[productId] = {};
      });

      data.forEach(movement => {
        const pid = movement.product_id;
        const wid = movement.warehouse_id || '__none__';
        if (!stockByProductWarehouse[pid]) stockByProductWarehouse[pid] = {};
        if (!stockByProductWarehouse[pid][wid]) stockByProductWarehouse[pid][wid] = 0;

        if (movement.movement_type === 'entry') {
          stockByProductWarehouse[pid][wid] += parseFloat(movement.quantity);
        } else if (['exit', 'production'].includes(movement.movement_type)) {
          stockByProductWarehouse[pid][wid] -= parseFloat(movement.quantity);
        }
      });

      // Sum per-warehouse stocks, each clamped to 0 individually
      const stockByProduct = {};
      productIds.forEach(productId => {
        const warehouseMap = stockByProductWarehouse[productId] || {};
        stockByProduct[productId] = Object.values(warehouseMap)
          .reduce((total, warehouseStock) => total + Math.max(0, warehouseStock), 0);
      });

      return stockByProduct;
    } catch (error) {
      throw new Error(`Error getting bulk stock: ${error.message}`);
    }
  }

  /**
   * Get physical stock grouped by warehouse for a single product
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} { [warehouseId]: number } — raw totals, may be negative
   */
  async getStockGroupedByWarehouse(productId, organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('warehouse_id, movement_type, quantity')
        .eq('product_id', productId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      const stockByWarehouse = {};
      (data || []).forEach(movement => {
        if (!stockByWarehouse[movement.warehouse_id]) {
          stockByWarehouse[movement.warehouse_id] = 0;
        }
        if (movement.movement_type === 'entry') {
          stockByWarehouse[movement.warehouse_id] += parseFloat(movement.quantity);
        } else if (['exit', 'production'].includes(movement.movement_type)) {
          stockByWarehouse[movement.warehouse_id] -= parseFloat(movement.quantity);
        }
      });

      return stockByWarehouse;
    } catch (error) {
      throw new Error(`Error getting stock grouped by warehouse: ${error.message}`);
    }
  }

  /**
   * Create multiple stock movements in a single batch
   * @param {Array<Object>} movements - Array of movement objects
   * @returns {Promise<Array>}
   */
  async createBulk(movements) {
    try {
      if (!Array.isArray(movements) || movements.length === 0) {
        return [];
      }

      // Set created_at timestamp for all movements
      const now = new Date().toISOString();
      const movementsWithTimestamp = movements.map(movement => ({
        ...movement,
        created_at: now
      }));

      const { data, error } = await this.client
        .from(this.table)
        .insert(movementsWithTimestamp)
        .select();

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      throw new Error(`Error creating bulk stock movements: ${error.message}`);
    }
  }

  /**
   * Update movement by ID (override to not add updated_at)
   * @param {string} id - Movement ID
   * @param {Object} updates - Update data
   * @param {string} idColumn - ID column name
   * @returns {Promise<Object>}
   */
  async update(id, updates, idColumn = 'movement_id') {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .update(updates) 
        .eq(idColumn, id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating ${this.table}: ${error.message}`);
    }
  }
}

module.exports = { StockMovementRepository };