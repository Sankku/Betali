class DashboardService {
  constructor(productRepository, warehouseRepository, stockMovementRepository, logger) {
    this.productRepository = productRepository;
    this.warehouseRepository = warehouseRepository;
    this.stockMovementRepository = stockMovementRepository;
    this.logger = logger;
  }

  /**
   * Get comprehensive dashboard overview
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardOverview(organizationId) {
    try {
      this.logger.info(`Generating dashboard overview for organization: ${organizationId}`);

      const [
        productsCount,
        warehousesCount,
        recentMovements,
        expiringProducts,
        lowStockAlerts
      ] = await Promise.all([
        this.productRepository.count({ organization_id: organizationId }),
        this.warehouseRepository.count({ organization_id: organizationId }),
        this.getRecentMovements(organizationId, 5),
        this.productRepository.findExpiringSoon(30, organizationId),
        this.getLowStockAlerts(organizationId)
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
   * Get organization statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Organization statistics
   */
  async getOrganizationStats(organizationId) {
    try {
      const [
        totalProducts,
        totalWarehouses,
        totalMovements,
        activeWarehouses,
        productsThisMonth,
        movementsThisMonth
      ] = await Promise.all([
        this.productRepository.count({ organization_id: organizationId }),
        this.warehouseRepository.count({ organization_id: organizationId }),
        this.stockMovementRepository.count({ organization_id: organizationId }),
        this.warehouseRepository.count({ organization_id: organizationId, is_active: true }),
        this.getProductsCreatedInPeriod(organizationId, 'month'),
        this.getMovementsInPeriod(organizationId, 'month')
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
   * Get recent activity for organization
   * @param {string} organizationId - Organization ID
   * @param {number} limit - Number of activities to return
   * @returns {Promise<Array>} Recent activities
   */
  async getRecentActivity(organizationId, limit = 10) {
    try {
      const movements = await this.stockMovementRepository.findAll(
        { organization_id: organizationId },
        { limit, orderBy: { column: 'movement_date', ascending: false } }
      );

      if (movements.length === 0) return [];

      const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];
      const warehouseIds = [...new Set(movements.map(m => m.warehouse_id).filter(Boolean))];

      const [products, warehouses] = await Promise.all([
        productIds.length > 0
          ? this.productRepository.findAll({ organization_id: organizationId }, { limit: productIds.length + 10 })
              .then(all => all.filter(p => productIds.includes(p.product_id)))
          : Promise.resolve([]),
        warehouseIds.length > 0
          ? this.warehouseRepository.findAll({ organization_id: organizationId }, { limit: warehouseIds.length + 10 })
              .then(all => all.filter(w => warehouseIds.includes(w.warehouse_id)))
          : Promise.resolve([]),
      ]);

      const productMap = new Map(products.map(p => [p.product_id, p.name]));
      const warehouseMap = new Map(warehouses.map(w => [w.warehouse_id, w.name]));

      return movements.map(movement => ({
        ...movement,
        product_name: productMap.get(movement.product_id) || 'Unknown Product',
        warehouse_name: warehouseMap.get(movement.warehouse_id) || 'Unknown Warehouse',
      }));
    } catch (error) {
      this.logger.error(`Error fetching recent activity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get products expiring soon
   * @param {string} organizationId - Organization ID
   * @param {number} days - Days ahead to check
   * @returns {Promise<Array>} Expiring products
   */
  async getExpiringProducts(organizationId, days = 30) {
    try {
      return await this.productRepository.findExpiringSoon(days, organizationId);
    } catch (error) {
      this.logger.error(`Error fetching expiring products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get analytics data for charts and reports
   * @param {string} organizationId - Organization ID
   * @param {string} period - Time period (7d, 30d, 90d, 1y)
   * @param {string} type - Analytics type (overview, products, movements)
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(organizationId, period = '30d', type = 'overview') {
    try {
      const { startDate, endDate } = this.calculateDateRange(period);

      switch (type) {
        case 'products':
          return await this.getProductAnalytics(organizationId, startDate, endDate);
        case 'movements':
          return await this.getMovementAnalytics(organizationId, startDate, endDate);
        case 'overview':
        default:
          return await this.getOverviewAnalytics(organizationId, startDate, endDate);
      }
    } catch (error) {
      this.logger.error(`Error generating analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent stock movements
   * @param {string} organizationId - Organization ID
   * @param {number} limit - Number of movements to return
   * @returns {Promise<Array>} Recent movements
   */
  async getRecentMovements(organizationId, limit = 5) {
    try {
      // Get movements filtered by organization
      const movements = await this.stockMovementRepository.findAll(
        { organization_id: organizationId },
        {
          limit,
          orderBy: { column: 'movement_date', ascending: false }
        }
      );

      return movements;
    } catch (error) {
      this.logger.error(`Error fetching recent movements: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get low stock alerts
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Low stock alerts
   */
  async getLowStockAlerts(organizationId) {
    try {
      // This is a placeholder - should implement actual low stock logic
      this.logger.info(`Fetching low stock alerts for organization: ${organizationId}`);
      return [];
    } catch (error) {
      this.logger.error(`Error fetching low stock alerts: ${error.message}`);
      return [];
    }
  }

  /**
   * Get products created in a specific period
   * @param {string} organizationId - Organization ID
   * @param {string} period - Period (day, week, month, year)
   * @returns {Promise<number>} Count of products created
   */
  async getProductsCreatedInPeriod(organizationId, period) {
    try {
      const { startDate } = this.calculateDateRange(period);
      
      const products = await this.productRepository.findByOrganizationId(organizationId);

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
   * @param {string} organizationId - Organization ID
   * @param {string} period - Period (day, week, month, year)
   * @returns {Promise<number>} Count of movements
   */
  async getMovementsInPeriod(organizationId, period) {
    try {
      const { startDate } = this.calculateDateRange(period);
      
      const movements = await this.stockMovementRepository.findAll(
        { 
          organization_id: organizationId,
          movement_date: { gte: startDate, lte: new Date() }
        }
      );

      return movements.length;
    } catch (error) {
      this.logger.error(`Error fetching movements for period: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get overview analytics
   * @param {string} organizationId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Overview analytics
   */
  async getOverviewAnalytics(organizationId, startDate, endDate) {
    try {
      const [
        productsCreated,
        movementsCount,
        warehousesCreated
      ] = await Promise.all([
        this.getProductsCreatedInDateRange(organizationId, startDate, endDate),
        this.getMovementsInDateRange(organizationId, startDate, endDate),
        this.getWarehousesCreatedInDateRange(organizationId, startDate, endDate)
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
   * @param {string} organizationId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Product analytics
   */
  async getProductAnalytics(organizationId, startDate, endDate) {
    try {
      const products = await this.productRepository.findByOrganizationId(organizationId);
      
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
   * @param {string} organizationId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Movement analytics
   */
  async getMovementAnalytics(organizationId, startDate, endDate) {
    try {
      const movements = await this.getMovementsInDateRange(organizationId, startDate, endDate);
      
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
  
  async getProductsCreatedInDateRange(organizationId, startDate, endDate) {
    const products = await this.productRepository.findByOrganizationId(organizationId);
    return products.filter(p => {
      const createdDate = new Date(p.created_at);
      return createdDate >= startDate && createdDate <= endDate;
    }).length;
  }

  async getMovementsInDateRange(organizationId, startDate, endDate) {
    const movements = await this.stockMovementRepository.findByDateRangeAndOrganization(startDate, endDate, organizationId);
    return movements;
  }

  async getWarehousesCreatedInDateRange(organizationId, startDate, endDate) {
    const warehouses = await this.warehouseRepository.findByOrganizationId(organizationId);
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