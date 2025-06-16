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
          expiringProducts: expiringProducts.slice(0, 5), // Top 5 expiring products
          lowStock: lowStockAlerts.slice(0, 5) // Top 5 low stock alerts
        }
      };
    } catch (error) {
      this.logger.error(`Error generating dashboard overview: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
    try {
      const [
        totalProducts,
        totalWarehouses,
        totalMovements,
        activeWarehouses,
        productsThisMonth,
        movementsThisMonth
      ] = await Promise.all([
        this.productRepository.count({ owner_id: userId }),
        this.warehouseRepository.count({ owner_id: userId }),
        this.stockMovementRepository.count(),
        this.warehouseRepository.count({ owner_id: userId, is_active: true }),
        this.getProductsCreatedInPeriod(userId, 'month'),
        this.getMovementsInPeriod(userId, 'month')
      ]);

      return {
        products: {
          total: totalProducts,
          thisMonth: productsThisMonth
        },
        warehouses: {
          total: totalWarehouses,
          active: activeWarehouses
        },
        movements: {
          total: totalMovements,
          thisMonth: movementsThisMonth
        }
      };
    } catch (error) {
      this.logger.error(`Error generating user stats: ${error.message}`);
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

      // Enrich movements with product and warehouse information
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
   * Get products expiring soon
   * @param {string} userId - User ID
   * @param {number} days - Days ahead to check
   * @returns {Promise<Array>} Expiring products
   */
  async getExpiringProducts(userId, days = 30) {
    try {
      return await this.productRepository.findExpiringSoon(days, userId);
    } catch (error) {
      this.logger.error(`Error fetching expiring products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get analytics data for charts and reports
   * @param {string} userId - User ID
   * @param {string} period - Time period (7d, 30d, 90d, 1y)
   * @param {string} type - Analytics type (overview, products, movements)
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(userId, period = '30d', type = 'overview') {
    try {
      const { startDate, endDate } = this.calculateDateRange(period);

      switch (type) {
        case 'products':
          return await this.getProductAnalytics(userId, startDate, endDate);
        case 'movements':
          return await this.getMovementAnalytics(userId, startDate, endDate);
        case 'overview':
        default:
          return await this.getOverviewAnalytics(userId, startDate, endDate);
      }
    } catch (error) {
      this.logger.error(`Error generating analytics: ${error.message}`);
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
      // This would need to be filtered by user's products/warehouses
      // For now, we'll get all movements and filter them
      const movements = await this.stockMovementRepository.findAll(
        {},
        {
          limit: limit * 2, // Get more to account for filtering
          orderBy: { column: 'movement_date', ascending: false }
        }
      );

      // Filter movements that belong to user's products
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
  async getLowStockAlerts() {
    return []
}

  /**
   * Get products created in a specific period
   * @param {string} userId - User ID
   * @param {string} period - Period (day, week, month, year)
   * @returns {Promise<number>} Count of products created
   */
  async getProductsCreatedInPeriod(userId, period) {
    try {
      const { startDate } = this.calculateDateRange(period);
      
      const products = await this.productRepository.findAll({
        owner_id: userId
      });

      return products.filter(product => 
        new Date(product.created_at) >= startDate
      ).length;
    } catch (error) {
      this.logger.error(`Error fetching products for period: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get movements in a specific period
   * @param {string} userId - User ID
   * @param {string} period - Period (day, week, month, year)
   * @returns {Promise<number>} Count of movements
   */
  async getMovementsInPeriod(userId, period) {
    try {
      const { startDate } = this.calculateDateRange(period);
      
      const userProducts = await this.productRepository.findByUserId(userId);
      const userProductIds = userProducts.map(p => p.product_id);

      const movements = await this.stockMovementRepository.findByDateRange(
        startDate,
        new Date()
      );

      return movements.filter(movement => 
        userProductIds.includes(movement.product_id)
      ).length;
    } catch (error) {
      this.logger.error(`Error fetching movements for period: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get overview analytics
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Overview analytics
   */
  async getOverviewAnalytics(userId, startDate, endDate) {
    try {
      const [
        productsCreated,
        movementsCount,
        warehousesCreated
      ] = await Promise.all([
        this.getProductsCreatedInDateRange(userId, startDate, endDate),
        this.getMovementsInDateRange(userId, startDate, endDate),
        this.getWarehousesCreatedInDateRange(userId, startDate, endDate)
      ]);

      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        metrics: {
          productsCreated,
          movementsCount,
          warehousesCreated
        },
        trends: {
          // Add trend calculations here
          productsGrowth: 0,
          movementsGrowth: 0
        }
      };
    } catch (error) {
      this.logger.error(`Error generating overview analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get product analytics
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Product analytics
   */
  async getProductAnalytics(userId, startDate, endDate) {
    try {
      const products = await this.productRepository.findByUserId(userId);
      
      const analytics = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        totalProducts: products.length,
        productsByCountry: this.groupProductsByCountry(products),
        expirationDistribution: this.calculateExpirationDistribution(products),
        recentlyAdded: products.filter(p => 
          new Date(p.created_at) >= startDate
        ).length
      };

      return analytics;
    } catch (error) {
      this.logger.error(`Error generating product analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get movement analytics
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Movement analytics
   */
  async getMovementAnalytics(userId, startDate, endDate) {
    try {
      const movements = await this.getMovementsInDateRange(userId, startDate, endDate);
      
      const analytics = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        totalMovements: movements.length,
        movementsByType: this.groupMovementsByType(movements),
        movementsByDate: this.groupMovementsByDate(movements),
        averageMovementsPerDay: movements.length / this.getDaysBetween(startDate, endDate)
      };

      return analytics;
    } catch (error) {
      this.logger.error(`Error generating movement analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate date range based on period string
   * @param {string} period - Period string (7d, 30d, 90d, 1y)
   * @returns {Object} Start and end dates
   */
  calculateDateRange(period) {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'year':
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  /**
   * Helper methods for analytics calculations
   */
  
  async getProductsCreatedInDateRange(userId, startDate, endDate) {
    const products = await this.productRepository.findByUserId(userId);
    return products.filter(p => {
      const createdDate = new Date(p.created_at);
      return createdDate >= startDate && createdDate <= endDate;
    }).length;
  }

  async getMovementsInDateRange(userId, startDate, endDate) {
    const userProducts = await this.productRepository.findByUserId(userId);
    const userProductIds = userProducts.map(p => p.product_id);
    
    const movements = await this.stockMovementRepository.findByDateRange(startDate, endDate);
    return movements.filter(m => userProductIds.includes(m.product_id));
  }

  async getWarehousesCreatedInDateRange(userId, startDate, endDate) {
    const warehouses = await this.warehouseRepository.findByUserId(userId);
    return warehouses.filter(w => {
      const createdDate = new Date(w.created_at);
      return createdDate >= startDate && createdDate <= endDate;
    }).length;
  }

  groupProductsByCountry(products) {
    return products.reduce((acc, product) => {
      const country = product.origin_country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
  }

  calculateExpirationDistribution(products) {
    const now = new Date();
    const distribution = {
      expired: 0,
      expiringSoon: 0, // Next 30 days
      longTerm: 0 // More than 30 days
    };

    products.forEach(product => {
      const expirationDate = new Date(product.expiration_date);
      const daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiration < 0) {
        distribution.expired++;
      } else if (daysUntilExpiration <= 30) {
        distribution.expiringSoon++;
      } else {
        distribution.longTerm++;
      }
    });

    return distribution;
  }

  groupMovementsByType(movements) {
    return movements.reduce((acc, movement) => {
      const type = movement.movement_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  groupMovementsByDate(movements) {
    return movements.reduce((acc, movement) => {
      const date = new Date(movement.movement_date).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
  }

  getDaysBetween(startDate, endDate) {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}

module.exports = { DashboardService };