const { Logger } = require('../utils/Logger');
const { DatabaseConfig } = require('./database');

const { ProductRepository } = require('../repositories/ProductRepository');
const { WarehouseRepository } = require('../repositories/WarehouseRepository');
const { StockMovementRepository } = require('../repositories/StockMovementRepository');
const { TableConfigRepository } = require('../repositories/TableConfigRepository');
const UserRepository = require('../repositories/UserRepository');
const OrganizationRepository = require('../repositories/OrganizationRepository');
const UserOrganizationRepository = require('../repositories/UserOrganizationRepository');

const { ProductService } = require('../services/ProductService');
const { DashboardService } = require('../services/DashboardService');
const { WarehouseService } = require('../services/WarehouseService');
const { StockMovementService } = require('../services/StockMovementService');
const { TableConfigService } = require('../services/TableConfigService');
const UserService = require('../services/UserService');
const OrganizationService = require('../services/OrganizationService');

const { ProductController } = require('../controllers/ProductController');
const { DashboardController } = require('../controllers/DashboardController');
const { WarehouseController } = require('../controllers/WarehouseController');
const { StockMovementController } = require('../controllers/StockMovementController');
const { TableConfigController } = require('../controllers/TableConfigController');
const UserController = require('../controllers/UserController');
const OrganizationController = require('../controllers/OrganizationController');

/**
 * Dependency injection container
 * Implements Singleton pattern for service management
 */
class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service factory
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {boolean} singleton - Whether to create as singleton
   */
  register(name, factory, singleton = false) {
    this.services.set(name, { factory, singleton });
  }

  /**
   * Get service instance
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  get(name) {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service "${name}" not found`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory());
      }
      return this.singletons.get(name);
    }

    return service.factory();
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Clear all registered services (useful for testing)
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get list of registered service names
   * @returns {Array<string>} Service names
   */
  getRegisteredServices() {
    return Array.from(this.services.keys());
  }
}

// Create and configure container
const container = new Container();

/**
 * Initialize container with all application dependencies
 */
function initializeContainer() {
  container.register('logger', () => new Logger('Application'), true);
  container.register('dbConfig', () => new DatabaseConfig(), true);

  container.register('productRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new ProductRepository(dbConfig.getClient());
  }, true);

  container.register('warehouseRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new WarehouseRepository(dbConfig.getClient());
  }, true);

  container.register('stockMovementRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new StockMovementRepository(dbConfig.getClient());
  }, true);

  container.register('tableConfigRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new TableConfigRepository(dbConfig.getClient());
  }, true);

  container.register('userRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new UserRepository(dbConfig.getClient());
  }, true);

  container.register('organizationRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new OrganizationRepository(dbConfig.getClient());
  }, true);

  container.register('userOrganizationRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new UserOrganizationRepository(dbConfig.getClient());
  }, true);

  container.register('productService', () => {
    const productRepository = container.get('productRepository');
    const logger = container.get('logger');
    return new ProductService(productRepository, logger);
  }, true);

  container.register('warehouseService', () => {
    const warehouseRepository = container.get('warehouseRepository');
    const stockMovementRepository = container.get('stockMovementRepository');
    const logger = container.get('logger');
    return new WarehouseService(warehouseRepository, stockMovementRepository, logger);
  }, true);

  container.register('stockMovementService', () => {
    const stockMovementRepository = container.get('stockMovementRepository');
    const productRepository = container.get('productRepository');
    const warehouseRepository = container.get('warehouseRepository');
    const logger = container.get('logger');
    return new StockMovementService(stockMovementRepository, productRepository, warehouseRepository, logger);
  }, true);

  container.register('dashboardService', () => {
    const productRepository = container.get('productRepository');
    const warehouseRepository = container.get('warehouseRepository');
    const stockMovementRepository = container.get('stockMovementRepository');
    const logger = container.get('logger');
    return new DashboardService(
      productRepository, 
      warehouseRepository, 
      stockMovementRepository, 
      logger
    );
  }, true);

  container.register('tableConfigService', () => {
    const tableConfigRepository = container.get('tableConfigRepository');
    return new TableConfigService(tableConfigRepository);
  }, true);

  container.register('userService', () => {
    const userRepository = container.get('userRepository');
    const logger = container.get('logger');
    return new UserService(userRepository, logger);
  }, true);

  container.register('organizationService', () => {
    const organizationRepository = container.get('organizationRepository');
    const userOrganizationRepository = container.get('userOrganizationRepository');
    const userRepository = container.get('userRepository');
    return new OrganizationService(organizationRepository, userOrganizationRepository, userRepository);
  }, true);

  container.register('productController', () => {
    const productService = container.get('productService');
    return new ProductController(productService);
  }, true);

  container.register('warehouseController', () => {
    const warehouseService = container.get('warehouseService');
    return new WarehouseController(warehouseService);
  }, true);

  container.register('stockMovementController', () => {
    const stockMovementService = container.get('stockMovementService');
    return new StockMovementController(stockMovementService);
  }, true);

  container.register('dashboardController', () => {
    const dashboardService = container.get('dashboardService');
    return new DashboardController(dashboardService);
  }, true);

  container.register('tableConfigController', () => {
    const tableConfigService = container.get('tableConfigService');
    return new TableConfigController(tableConfigService);
  }, true);

  container.register('userController', () => {
    const userService = container.get('userService');
    return new UserController(userService);
  }, true);

  container.register('organizationController', () => {
    const organizationService = container.get('organizationService');
    return new OrganizationController(organizationService);
  }, true);
}

initializeContainer();

/**
 * Factory function to create service instances
 * Useful for routes that need specific instances
 */
const ServiceFactory = {
  createProductController() {
    return container.get('productController');
  },

  createWarehouseController() {
    return container.get('warehouseController');
  },

  createStockMovementController() {
    return container.get('stockMovementController');
  },

  createDashboardController() {
    return container.get('dashboardController');
  },

  createProductService() {
    return container.get('productService');
  },

  createWarehouseService() {
    return container.get('warehouseService');
  },

  createStockMovementService() {
    return container.get('stockMovementService');
  },

  createDashboardService() {
    return container.get('dashboardService');
  },

  getTableConfigService() {
    return container.get('tableConfigService');
  },

  createTableConfigController() {
    return container.get('tableConfigController');
  },

  createUserController() {
    return container.get('userController');
  },

  createOrganizationController() {
    return container.get('organizationController');
  },

  getInstance() {
    return this;
  },

  createLogger(context = 'Default') {
    return new Logger(context);
  }
};

module.exports = { 
  Container, 
  container, 
  ServiceFactory, 
  initializeContainer 
}