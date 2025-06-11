/**
 * Dashboard service for aggregating data and analytics
 */
class DashboardService {
    constructor(productRepository, warehouseRepository, stockMovementRepository, logger) {
      this.productRepository = productRepository;
      this.warehouseRepository = warehouseRepository;
      this.stockMovementRepository = stockMovementRepository;
      this.logger = logger;
    }
  
    /**
     * Get comprehensive dashboard overview
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Dashboard data
     */
    async getDashboardOverview(userId) {
      try {
        this.logger.info(`Generating dashboard overview for user: ${userId}`);
  
        const [
          productsCount,
          warehousesCount,
          recentMovements,
          expiringProducts,
          lowStockAlerts
        ] = await Promise.all([
          this.productRepository.count({ owner_id: userId }),
          this.warehouseRepository.count({ owner_id: userId }),
          this.getRecentMovements(userId, 5),
          this.productRepository.findExpiringSoon(30, userId),
          this.getLowStockAlerts(userId)
        ]);
  
        return {
          stats: {
            totalProducts: productsCount,
            totalWarehouses: warehousesCount,
            expiringProductsCount: expiringProducts.length,
            lowStockAlertsCount: lowStockAlerts.length
          },
          recentActivity: recentMovements,
          alerts: {
            expiringProducts: expiringProducts.slice(0, 5), 
            lowStock: lowStockAlerts.slice(0, 5) 
          }
        };
      } catch (error) {
        this.logger.error(`Error generating dashboard overview: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Get recent activity for user
     * @param {string} userId - User ID
     * @param {number} limit - Number of activities to return
     * @returns {Promise<Array>} Recent activities
     */
    async getRecentActivity(userId, limit = 10) {
      try {
        const movements = await this.stockMovementRepository.findAll(
          {},
          {
            limit,
            orderBy: { column: 'movement_date', ascending: false }
          }
        );
          const enrichedMovements = await Promise.all(
          movements.map(async (movement) => {
            const enrichedMovement = { ...movement };
  
            if (movement.product_id) {
              try {
                const product = await this.productRepository.findById(movement.product_id, 'product_id');
                enrichedMovement.product_name = product?.name || 'Unknown Product';
              } catch (error) {
                this.logger.warn(`Could not fetch product for movement: ${error.message}`);
                enrichedMovement.product_name = 'Unknown Product';
              }
            }
  
            if (movement.warehouse_id) {
              try {
                const warehouse = await this.warehouseRepository.findById(movement.warehouse_id, 'warehouse_id');
                enrichedMovement.warehouse_name = warehouse?.name || 'Unknown Warehouse';
              } catch (error) {
                this.logger.warn(`Could not fetch warehouse for movement: ${error.message}`);
                enrichedMovement.warehouse_name = 'Unknown Warehouse';
              }
            }
  
            return enrichedMovement;
          })
        );
  
        return enrichedMovements;
      } catch (error) {
        this.logger.error(`Error fetching recent activity: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Get recent stock movements
     * @param {string} userId - User ID
     * @param {number} limit - Number of movements to return
     * @returns {Promise<Array>} Recent movements
     */
    async getRecentMovements(userId, limit = 5) {
      try {
        const movements = await this.stockMovementRepository.findAll(
          {},
          {
            limit: limit * 2, 
            orderBy: { column: 'movement_date', ascending: false }
          }
        );
  
        const userProducts = await this.productRepository.findByUserId(userId);
        const userProductIds = userProducts.map(p => p.product_id);
  
        const userMovements = movements.filter(movement => 
          userProductIds.includes(movement.product_id)
        ).slice(0, limit);
  
        return userMovements;
      } catch (error) {
        this.logger.error(`Error fetching recent movements: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * Get low stock alerts (placeholder implementation)
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Low stock alerts
     */
    async getLowStockAlerts(userId) {
      try {
        // This is a placeholder implementation
        // In a real scenario, you'd have stock levels and minimum thresholds
        return [];
      } catch (error) {
        this.logger.error(`Error fetching low stock alerts: ${error.message}`);
        throw error;
      }
    }
  }
  
  module.exports = { DashboardService };