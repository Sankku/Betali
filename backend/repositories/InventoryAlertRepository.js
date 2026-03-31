const { BaseRepository } = require('./BaseRepository');

/**
 * Inventory Alert repository with specific business logic
 */
class InventoryAlertRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'inventory_alerts');
  }

  /**
   * Find alert by ID
   * @param {string} id - Alert ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return super.findById(id, 'alert_id');
  }

  /**
   * Find active alerts by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findActiveByOrganization(organizationId, options = {}) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          product_types!inventory_alerts_product_type_id_fkey(product_type_id, name),
          warehouse!inventory_alerts_warehouse_id_fkey(warehouse_id, name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('severity', { ascending: false })
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding active alerts: ${error.message}`);
    }
  }

  /**
   * Find alerts by product
   * @param {string} productId - Product ID
   * @param {string} status - Alert status (optional)
   * @returns {Promise<Array>}
   */
  async findByProduct(productId, status = null) {
    try {
      let query = this.client
        .from(this.table)
        .select(`
          *,
          warehouse!inventory_alerts_warehouse_id_fkey(warehouse_id, name)
        `)
        .eq('product_type_id', productId)
        .order('triggered_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error finding alerts by product: ${error.message}`);
    }
  }

  /**
   * Find alerts by warehouse
   * @param {string} warehouseId - Warehouse ID
   * @param {string} status - Alert status (optional)
   * @returns {Promise<Array>}
   */
  async findByWarehouse(warehouseId, status = null) {
    try {
      let query = this.client
        .from(this.table)
        .select(`
          *,
          product_types!inventory_alerts_product_type_id_fkey(product_type_id, name)
        `)
        .eq('warehouse_id', warehouseId)
        .order('triggered_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new Error(`Error finding alerts by warehouse: ${error.message}`);
    }
  }

  /**
   * Get alert statistics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getAlertStatistics(organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('alert_type, severity, status')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter(a => a.status === 'active').length,
        byType: {},
        bySeverity: {},
        byStatus: {}
      };

      // Count by type
      data.forEach(alert => {
        stats.byType[alert.alert_type] = (stats.byType[alert.alert_type] || 0) + 1;
        stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
        stats.byStatus[alert.status] = (stats.byStatus[alert.status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new Error(`Error getting alert statistics: ${error.message}`);
    }
  }

  /**
   * Dismiss an alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User ID who dismissed
   * @returns {Promise<Object>}
   */
  async dismissAlert(alertId, userId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          dismissed_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('alert_id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error dismissing alert: ${error.message}`);
    }
  }

  /**
   * Resolve an alert (automatic when stock is replenished)
   * @param {string} alertId - Alert ID
   * @returns {Promise<Object>}
   */
  async resolveAlert(alertId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('alert_id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error resolving alert: ${error.message}`);
    }
  }

  /**
   * Check and create alerts for an organization using database function
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  /**
   * Check and create alerts for an organization
   * REPLACES the SQL function check_inventory_alerts which had flawed logic
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async checkAndCreateAlerts(organizationId) {
    try {
      // 1. Fetch active warehouses
      const { data: warehouses, error: warehouseError } = await this.client
        .from('warehouse')
        .select('warehouse_id, name')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (warehouseError) throw warehouseError;

      // 2. Fetch product types with alerting enabled and min_stock > 0
      const { data: products, error: productError } = await this.client
        .from('product_types')
        .select('product_type_id, name, min_stock, max_stock')
        .eq('organization_id', organizationId)
        .eq('alert_enabled', true)
        .gt('min_stock', 0);

      if (productError) throw productError;

      // If no warehouses or products to check, clean up any stale alerts for this org and return
      if (!warehouses || warehouses.length === 0 || !products || products.length === 0) {
          await this.resolveAllStaleAlerts(organizationId);
          return [];
      }

      // 3. Stock is now tracked through lots. Fetch lots for these product types,
      //    then aggregate movements by product_type via lot_id.
      const productTypeIds = products.map(p => p.product_type_id);
      const { data: lots, error: lotsError } = await this.client
        .from('product_lots')
        .select('lot_id, product_type_id')
        .in('product_type_id', productTypeIds)
        .eq('organization_id', organizationId);

      if (lotsError) throw lotsError;

      const lotToProductType = {};
      (lots || []).forEach(l => { lotToProductType[l.lot_id] = l.product_type_id; });
      const lotIds = Object.keys(lotToProductType);

      const movements = lotIds.length > 0 ? await (() => {
        return this.client
          .from('stock_movements')
          .select('lot_id, warehouse_id, movement_type, quantity')
          .in('lot_id', lotIds)
          .eq('organization_id', organizationId)
          .then(({ data, error }) => { if (error) throw error; return data || []; });
      })() : [];

      // Map movements to determine stock per product_type per warehouse
      const stockMap = {}; // { productTypeId: { warehouseId: quantity } }

      movements.forEach(m => {
        const productTypeId = lotToProductType[m.lot_id];
        if (!productTypeId) return;
        if (!stockMap[productTypeId]) stockMap[productTypeId] = {};
        if (!stockMap[productTypeId][m.warehouse_id]) stockMap[productTypeId][m.warehouse_id] = 0;

        const qty = parseFloat(m.quantity);
        if (['entry', 'IN', 'ADJUSTMENT_IN'].includes(m.movement_type)) {
          stockMap[productTypeId][m.warehouse_id] += qty;
        } else if (['exit', 'OUT', 'ADJUSTMENT_OUT'].includes(m.movement_type)) {
          stockMap[productTypeId][m.warehouse_id] -= qty;
        }
      });

      const newAlerts = [];
      const activeAlertKeys = new Set(); // To track what should be active: `${productId}:${warehouseId}:${type}`

      // 4. Evaluate Alerts
      for (const product of products) {
        for (const warehouse of warehouses) {
          const currentStock = Math.max(0, stockMap[product.product_type_id]?.[warehouse.warehouse_id] || 0);
          
          let alertType = null;
          let severity = null;
          let message = null;

          if (currentStock === 0) {
            alertType = 'out_of_stock';
            severity = 'critical';
            message = `Product "${product.name}" is out of stock in warehouse "${warehouse.name}"`;
          } else if (currentStock <= product.min_stock) {
            alertType = 'low_stock';
            severity = currentStock <= (product.min_stock * 0.5) ? 'high' : 'medium';
            message = `Product "${product.name}" is running low in warehouse "${warehouse.name}". Current: ${currentStock}, Minimum: ${product.min_stock}`;
          }

          if (alertType) {
            const key = `${product.product_type_id}:${warehouse.warehouse_id}:${alertType}`;
            activeAlertKeys.add(key);

            newAlerts.push({
              organization_id: organizationId,
              product_type_id: product.product_type_id,
              warehouse_id: warehouse.warehouse_id,
              alert_type: alertType,
              severity,
              current_stock: currentStock,
              min_stock: product.min_stock,
              max_stock: product.max_stock,
              message,
              status: 'active'
            });
          }
        }
      }

      // 5. reconcile with database
      // Get all currently active alerts
      const { data: existingAlerts } = await this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      
      const createdAlerts = [];

      // Resolve alerts that are no longer valid
      const promises = [];
      
      // A. Resolve stale
      if (existingAlerts) {
        for (const alert of existingAlerts) {
           const key = `${alert.product_type_id}:${alert.warehouse_id}:${alert.alert_type}`;
           if (!activeAlertKeys.has(key)) {
             // Resolving this alert
             promises.push(
               this.client.from(this.table).update({
                 status: 'resolved',
                 resolved_at: new Date().toISOString(),
                 updated_at: new Date().toISOString()
               }).eq('alert_id', alert.alert_id)
             );
           }
        }
      }

      // B. Create new (only if not existing)
      const existingKeys = new Set(existingAlerts?.map(a => `${a.product_type_id}:${a.warehouse_id}:${a.alert_type}`));

      for (const alert of newAlerts) {
        const key = `${alert.product_type_id}:${alert.warehouse_id}:${alert.alert_type}`;
        if (!existingKeys.has(key)) {
           promises.push(
             this.client.from(this.table).insert(alert).select().then(({data}) => {
               if(data) createdAlerts.push(data[0]);
             })
           );
        }
      }

      await Promise.all(promises);

      return createdAlerts;

    } catch (error) {
      throw new Error(`Error checking inventory alerts: ${error.message}`);
    }
  }

  /**
   * Helper to resolve all active alerts for organization (fallback cleanup)
   */
  async resolveAllStaleAlerts(organizationId) {
       // Logic to resolve all active alerts if we found no products/warehouses to check
       // This handles the case where user disables all alerts or sets all min_stock to 0
       await this.client.from(this.table).update({
           status: 'resolved',
           resolved_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
       }).eq('organization_id', organizationId).eq('status', 'active');
  }

  /**
   * Auto-resolve alerts when stock is replenished
   * @param {string} productId - Product ID
   * @param {string} warehouseId - Warehouse ID
   * @param {number} currentStock - Current stock level
   * @param {number} minStock - Minimum stock level
   * @returns {Promise<void>}
   */
  async autoResolveAlerts(productId, warehouseId, currentStock, minStock) {
    try {
      // If stock is now above minimum, resolve low_stock and out_of_stock alerts
      if (currentStock > minStock) {
        const { error } = await this.client
          .from(this.table)
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('product_id', productId)
          .eq('warehouse_id', warehouseId)
          .in('alert_type', ['low_stock', 'out_of_stock'])
          .eq('status', 'active');

        if (error) throw error;
      }
    } catch (error) {
      throw new Error(`Error auto-resolving alerts: ${error.message}`);
    }
  }
}

module.exports = { InventoryAlertRepository };
