const BaseRepository = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Stock Reservation Repository
 * Handles database operations for stock reservations
 */
class StockReservationRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'stock_reservations');
    this.logger = new Logger('StockReservationRepository');
  }

  /**
   * Create a stock reservation
   * @param {Object} reservationData - Reservation data
   * @param {string} reservationData.organization_id - Organization ID
   * @param {string} reservationData.order_id - Order ID
   * @param {string} reservationData.product_id - Product ID
   * @param {string} reservationData.warehouse_id - Warehouse ID (optional)
   * @param {number} reservationData.quantity - Quantity to reserve
   * @param {string} reservationData.created_by - User ID who created the reservation
   * @param {string} reservationData.notes - Optional notes
   * @returns {Promise<Object>}
   */
  async createReservation(reservationData) {
    try {
      this.logger.info('Creating stock reservation', {
        order_id: reservationData.order_id,
        product_id: reservationData.product_id,
        quantity: reservationData.quantity
      });

      const reservation = {
        organization_id: reservationData.organization_id,
        order_id: reservationData.order_id,
        product_id: reservationData.product_id,
        warehouse_id: reservationData.warehouse_id || null,
        quantity: reservationData.quantity,
        status: 'active',
        created_by: reservationData.created_by,
        notes: reservationData.notes || null,
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert(reservation)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Stock reservation created successfully', {
        reservation_id: data.reservation_id
      });

      return data;
    } catch (error) {
      this.logger.error('Error creating stock reservation', {
        error: error.message,
        reservationData
      });
      throw new Error(`Error creating stock reservation: ${error.message}`);
    }
  }

  /**
   * Create multiple stock reservations in bulk
   * @param {Array<Object>} reservations - Array of reservation data
   * @returns {Promise<Array>}
   */
  async createBulkReservations(reservations) {
    try {
      this.logger.info('Creating bulk stock reservations', {
        count: reservations.length
      });

      const { data, error } = await this.client
        .from(this.table)
        .insert(reservations)
        .select();

      if (error) throw error;

      this.logger.info('Bulk reservations created successfully', {
        count: data.length
      });

      return data;
    } catch (error) {
      this.logger.error('Error creating bulk reservations', {
        error: error.message
      });
      throw new Error(`Error creating bulk reservations: ${error.message}`);
    }
  }

  /**
   * Get all active reservations for an order
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getActiveReservationsByOrder(orderId, organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logger.error('Error getting active reservations by order', {
        error: error.message,
        orderId
      });
      throw new Error(`Error getting active reservations: ${error.message}`);
    }
  }

  /**
   * Get all reservations for an order (any status)
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getReservationsByOrder(orderId, organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logger.error('Error getting reservations by order', {
        error: error.message,
        orderId
      });
      throw new Error(`Error getting reservations: ${error.message}`);
    }
  }

  /**
   * Get total reserved quantity for a product
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @param {string} warehouseId - Warehouse ID (optional)
   * @returns {Promise<number>}
   */
  async getReservedQuantity(productId, organizationId, warehouseId = null) {
    try {
      let query = this.client
        .from(this.table)
        .select('quantity')
        .eq('product_id', productId)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalReserved = data.reduce((sum, reservation) => sum + reservation.quantity, 0);
      return totalReserved;
    } catch (error) {
      this.logger.error('Error getting reserved quantity', {
        error: error.message,
        productId,
        warehouseId
      });
      throw new Error(`Error getting reserved quantity: ${error.message}`);
    }
  }

  /**
   * Update reservation status
   * @param {string} reservationId - Reservation ID
   * @param {string} status - New status (fulfilled, cancelled, expired)
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async updateReservationStatus(reservationId, status, organizationId) {
    try {
      this.logger.info('Updating reservation status', {
        reservation_id: reservationId,
        new_status: status
      });

      const updates = {
        status,
        released_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .update(updates)
        .eq('reservation_id', reservationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Reservation status updated successfully', {
        reservation_id: reservationId
      });

      return data;
    } catch (error) {
      this.logger.error('Error updating reservation status', {
        error: error.message,
        reservationId
      });
      throw new Error(`Error updating reservation status: ${error.message}`);
    }
  }

  /**
   * Release (cancel) all active reservations for an order
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @param {string} reason - Reason for release ('cancelled' or 'fulfilled')
   * @returns {Promise<Array>}
   */
  async releaseOrderReservations(orderId, organizationId, reason = 'cancelled') {
    try {
      this.logger.info('Releasing order reservations', {
        order_id: orderId,
        reason
      });

      const status = reason === 'fulfilled' ? 'fulfilled' : 'cancelled';

      const { data, error } = await this.client
        .from(this.table)
        .update({
          status,
          released_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .select();

      if (error) throw error;

      this.logger.info('Order reservations released successfully', {
        order_id: orderId,
        count: data?.length || 0
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error releasing order reservations', {
        error: error.message,
        orderId
      });
      throw new Error(`Error releasing reservations: ${error.message}`);
    }
  }

  /**
   * Fulfill reservations (mark as fulfilled without releasing)
   * Used when order is shipped/completed
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async fulfillReservations(orderId, organizationId) {
    return this.releaseOrderReservations(orderId, organizationId, 'fulfilled');
  }

  /**
   * Cancel reservations (mark as cancelled and release stock)
   * Used when order is cancelled
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async cancelReservations(orderId, organizationId) {
    return this.releaseOrderReservations(orderId, organizationId, 'cancelled');
  }

  /**
   * Get available stock for a product (physical stock - reserved stock)
   * Uses the database function get_available_stock
   * @param {string} productId - Product ID
   * @param {string} warehouseId - Warehouse ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>}
   */
  async getAvailableStock(productId, warehouseId, organizationId) {
    try {
      const { data, error } = await this.client
        .rpc('get_available_stock', {
          p_product_id: productId,
          p_warehouse_id: warehouseId,
          p_organization_id: organizationId
        });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      this.logger.error('Error getting available stock', {
        error: error.message,
        productId,
        warehouseId
      });
      throw new Error(`Error getting available stock: ${error.message}`);
    }
  }

  /**
   * Check if sufficient stock is available for reservation
   * @param {string} productId - Product ID
   * @param {string} warehouseId - Warehouse ID
   * @param {string} organizationId - Organization ID
   * @param {number} requestedQuantity - Quantity to reserve
   * @returns {Promise<{available: boolean, availableStock: number, requestedQuantity: number}>}
   */
  async checkStockAvailability(productId, warehouseId, organizationId, requestedQuantity) {
    try {
      const availableStock = await this.getAvailableStock(productId, warehouseId, organizationId);

      return {
        available: availableStock >= requestedQuantity,
        availableStock,
        requestedQuantity
      };
    } catch (error) {
      this.logger.error('Error checking stock availability', {
        error: error.message,
        productId,
        warehouseId,
        requestedQuantity
      });
      throw new Error(`Error checking stock availability: ${error.message}`);
    }
  }

  /**
   * Get reservation statistics for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getReservationStats(organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('status, quantity')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const stats = {
        total: data.length,
        active: 0,
        fulfilled: 0,
        cancelled: 0,
        expired: 0,
        totalReservedQuantity: 0
      };

      data.forEach(reservation => {
        stats[reservation.status] = (stats[reservation.status] || 0) + 1;
        if (reservation.status === 'active') {
          stats.totalReservedQuantity += reservation.quantity;
        }
      });

      return stats;
    } catch (error) {
      this.logger.error('Error getting reservation stats', {
        error: error.message,
        organizationId
      });
      throw new Error(`Error getting reservation stats: ${error.message}`);
    }
  }

  /**
   * Clean up expired reservations
   * Marks reservations as expired if they've been active for too long
   * @param {number} maxAgeHours - Maximum age in hours before expiration (default: 24)
   * @returns {Promise<number>} - Number of reservations expired
   */
  async expireOldReservations(maxAgeHours = 24) {
    try {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() - maxAgeHours);

      this.logger.info('Expiring old reservations', {
        maxAgeHours,
        expirationDate: expirationDate.toISOString()
      });

      const { data, error } = await this.client
        .from(this.table)
        .update({
          status: 'expired',
          released_at: new Date().toISOString()
        })
        .eq('status', 'active')
        .lt('reserved_at', expirationDate.toISOString())
        .select();

      if (error) throw error;

      const expiredCount = data?.length || 0;
      this.logger.info('Old reservations expired', { count: expiredCount });

      return expiredCount;
    } catch (error) {
      this.logger.error('Error expiring old reservations', {
        error: error.message
      });
      throw new Error(`Error expiring old reservations: ${error.message}`);
    }
  }
}

module.exports = StockReservationRepository;
