const { Logger } = require('../utils/Logger');
const { DatabaseConfig } = require('./database');

const { ProductRepository } = require('../repositories/ProductRepository');
const { WarehouseRepository } = require('../repositories/WarehouseRepository');
const { StockMovementRepository } = require('../repositories/StockMovementRepository');
const { TableConfigRepository } = require('../repositories/TableConfigRepository');
const UserRepository = require('../repositories/UserRepository');
const OrganizationRepository = require('../repositories/OrganizationRepository');
const UserOrganizationRepository = require('../repositories/UserOrganizationRepository');
const ClientRepository = require('../repositories/ClientRepository');
const SupplierRepository = require('../repositories/SupplierRepository');
const OrderRepository = require('../repositories/OrderRepository');
const OrderDetailRepository = require('../repositories/OrderDetailRepository');
const StockReservationRepository = require('../repositories/StockReservationRepository');
const PricingTierRepository = require('../repositories/PricingTierRepository');
const CustomerPricingRepository = require('../repositories/CustomerPricingRepository');
const TaxRateRepository = require('../repositories/TaxRateRepository');
const ProductTaxGroupRepository = require('../repositories/ProductTaxGroupRepository');
const DiscountRuleRepository = require('../repositories/DiscountRuleRepository');
const AppliedDiscountRepository = require('../repositories/AppliedDiscountRepository');
const PurchaseOrderRepository = require('../repositories/PurchaseOrderRepository');
const PurchaseOrderDetailRepository = require('../repositories/PurchaseOrderDetailRepository');
const { InventoryAlertRepository } = require('../repositories/InventoryAlertRepository');
const { SubscriptionRepository } = require('../repositories/SubscriptionRepository');
const { SubscriptionPlanRepository } = require('../repositories/SubscriptionPlanRepository');

const { ProductService } = require('../services/ProductService');
const { DashboardService } = require('../services/DashboardService');
const { WarehouseService } = require('../services/WarehouseService');
const { StockMovementService } = require('../services/StockMovementService');
const { TableConfigService } = require('../services/TableConfigService');
const UserService = require('../services/UserService');
const OrganizationService = require('../services/OrganizationService');
const ClientService = require('../services/ClientService');
const SupplierService = require('../services/SupplierService');
const OrderService = require('../services/OrderService');
const PricingService = require('../services/PricingService');
const PurchaseOrderService = require('../services/PurchaseOrderService');
const { InventoryAlertService } = require('../services/InventoryAlertService');
const { SubscriptionService } = require('../services/SubscriptionService');
const { SubscriptionPlanService } = require('../services/SubscriptionPlanService');

const { ProductController } = require('../controllers/ProductController');
const { DashboardController } = require('../controllers/DashboardController');
const { WarehouseController } = require('../controllers/WarehouseController');
const { StockMovementController } = require('../controllers/StockMovementController');
const { TableConfigController } = require('../controllers/TableConfigController');
const UserController = require('../controllers/UserController');
const OrganizationController = require('../controllers/OrganizationController');
const ClientController = require('../controllers/ClientController');
const SupplierController = require('../controllers/SupplierController');
const OrderController = require('../controllers/OrderController');
const PricingController = require('../controllers/PricingController');
const PurchaseOrderController = require('../controllers/PurchaseOrderController');
const { TaxRateService } = require('../services/TaxRateService');
const { DiscountRuleService } = require('../services/DiscountRuleService');
const { TaxRateController } = require('../controllers/TaxRateController');
const { DiscountRuleController } = require('../controllers/DiscountRuleController');
const { InventoryAlertController } = require('../controllers/InventoryAlertController');
const { SubscriptionController } = require('../controllers/SubscriptionController');
const { SubscriptionPlanController } = require('../controllers/SubscriptionPlanController');
const { ProductFormulaRepository } = require('../repositories/ProductFormulaRepository');
const { ProductFormulaService } = require('../services/ProductFormulaService');
const { ProductFormulaController } = require('../controllers/ProductFormulaController');
const { ProductTypeRepository } = require('../repositories/ProductTypeRepository');
const { ProductLotRepository } = require('../repositories/ProductLotRepository');
const { ProductTypeService } = require('../services/ProductTypeService');
const { ProductLotService } = require('../services/ProductLotService');
const { ProductTypeController } = require('../controllers/ProductTypeController');
const { ProductLotController } = require('../controllers/ProductLotController');

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

  container.register('productFormulaRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new ProductFormulaRepository(dbConfig.getClient());
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

  container.register('clientRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new ClientRepository(dbConfig.getClient());
  }, true);

  container.register('supplierRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new SupplierRepository(dbConfig.getClient());
  }, true);

  container.register('orderRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new OrderRepository(dbConfig.getClient());
  }, true);

  container.register('orderDetailRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new OrderDetailRepository(dbConfig.getClient());
  }, true);

  container.register('purchaseOrderRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new PurchaseOrderRepository(dbConfig.getClient());
  }, true);

  container.register('purchaseOrderDetailRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new PurchaseOrderDetailRepository(dbConfig.getClient());
  }, true);

  container.register('stockReservationRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new StockReservationRepository(dbConfig.getClient());
  }, true);

  container.register('pricingTierRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new PricingTierRepository(dbConfig.getClient());
  }, true);

  container.register('customerPricingRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new CustomerPricingRepository(dbConfig.getClient());
  }, true);

  container.register('taxRateRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new TaxRateRepository(dbConfig.getClient());
  }, true);

  container.register('productTaxGroupRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new ProductTaxGroupRepository(dbConfig.getClient());
  }, true);

  container.register('discountRuleRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new DiscountRuleRepository(dbConfig.getClient());
  }, true);

  container.register('appliedDiscountRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new AppliedDiscountRepository(dbConfig.getClient());
  }, true);

  container.register('inventoryAlertRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new InventoryAlertRepository(dbConfig.getClient());
  }, true);

  container.register('subscriptionRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new SubscriptionRepository(dbConfig.getClient());
  }, true);

  container.register('subscriptionPlanRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new SubscriptionPlanRepository(dbConfig.getClient());
  }, true);

  container.register('productTypeRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new ProductTypeRepository(dbConfig.getClient());
  }, true);

  container.register('productLotRepository', () => {
    const dbConfig = container.get('dbConfig');
    return new ProductLotRepository(dbConfig.getClient());
  }, true);

  container.register('productService', () => {
    const productRepository = container.get('productRepository');
    const stockMovementRepository = container.get('stockMovementRepository');
    const stockReservationRepository = container.get('stockReservationRepository');
    const warehouseRepository = container.get('warehouseRepository');
    const logger = container.get('logger');
    return new ProductService(productRepository, stockMovementRepository, stockReservationRepository, warehouseRepository, logger);
  }, true);

  container.register('warehouseService', () => {
    const warehouseRepository = container.get('warehouseRepository');
    const stockMovementRepository = container.get('stockMovementRepository');
    const logger = container.get('logger');
    return new WarehouseService(warehouseRepository, stockMovementRepository, logger);
  }, true);

  container.register('stockMovementService', () => {
    const logger = container.get('logger');
    return new StockMovementService(
      container.get('stockMovementRepository'),
      container.get('productLotRepository'),
      container.get('warehouseRepository'),
      logger
    );
  }, true);

  container.register('productFormulaService', () => {
    const formulaRepository = container.get('productFormulaRepository');
    const productRepository = container.get('productRepository');
    const warehouseRepository = container.get('warehouseRepository');
    const dbConfig = container.get('dbConfig');
    const logger = container.get('logger');
    return new ProductFormulaService(
      formulaRepository, productRepository, warehouseRepository,
      dbConfig.getClient(), logger
    );
  }, true);

  container.register('dashboardService', () => {
    const logger = container.get('logger');
    return new DashboardService(
      container.get('productTypeRepository'),
      container.get('productLotRepository'),
      container.get('warehouseRepository'),
      container.get('stockMovementRepository'),
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
    const productRepository = container.get('productRepository');
    const warehouseRepository = container.get('warehouseRepository');
    const stockMovementRepository = container.get('stockMovementRepository');
    return new OrganizationService(
      organizationRepository, 
      userOrganizationRepository, 
      userRepository,
      productRepository,
      warehouseRepository,
      stockMovementRepository
    );
  }, true);

  container.register('clientService', () => {
    const clientRepository = container.get('clientRepository');
    const logger = container.get('logger');
    return new ClientService(clientRepository, logger);
  }, true);

  container.register('supplierService', () => {
    const supplierRepository = container.get('supplierRepository');
    const logger = container.get('logger');
    return new SupplierService(supplierRepository, logger);
  }, true);

  container.register('pricingService', () => {
    const pricingTierRepository = container.get('pricingTierRepository');
    const customerPricingRepository = container.get('customerPricingRepository');
    const taxRateRepository = container.get('taxRateRepository');
    const productTaxGroupRepository = container.get('productTaxGroupRepository');
    const discountRuleRepository = container.get('discountRuleRepository');
    const appliedDiscountRepository = container.get('appliedDiscountRepository');
    const productTypeRepository = container.get('productTypeRepository');
    const logger = container.get('logger');
    return new PricingService(
      pricingTierRepository,
      customerPricingRepository,
      taxRateRepository,
      productTaxGroupRepository,
      discountRuleRepository,
      appliedDiscountRepository,
      productTypeRepository,
      logger
    );
  }, true);

  container.register('orderService', () => {
    const orderRepository = container.get('orderRepository');
    const orderDetailRepository = container.get('orderDetailRepository');
    const productRepository = container.get('productRepository');
    const warehouseRepository = container.get('warehouseRepository');
    const logger = container.get('logger');
    const stockMovementRepository = container.get('stockMovementRepository');
    const stockReservationRepository = container.get('stockReservationRepository');
    const clientRepository = container.get('clientRepository');
    const pricingService = container.get('pricingService');
    return new OrderService(orderRepository, orderDetailRepository, productRepository, warehouseRepository, stockMovementRepository, stockReservationRepository, clientRepository, pricingService, logger);
  }, true);

  container.register('purchaseOrderService', () => {
    const purchaseOrderRepository = container.get('purchaseOrderRepository');
    const purchaseOrderDetailRepository = container.get('purchaseOrderDetailRepository');
    const supplierRepository = container.get('supplierRepository');
    const productRepository = container.get('productRepository');
    const warehouseRepository = container.get('warehouseRepository');
    const stockMovementRepository = container.get('stockMovementRepository');
    const logger = container.get('logger');
    return new PurchaseOrderService(purchaseOrderRepository, purchaseOrderDetailRepository, supplierRepository, productRepository, warehouseRepository, stockMovementRepository, logger);
  }, true);

  container.register('taxRateService', () => {
    const taxRateRepository = container.get('taxRateRepository');
    const logger = container.get('logger');
    return new TaxRateService(taxRateRepository, logger);
  }, true);

  container.register('discountRuleService', () => {
    const discountRuleRepository = container.get('discountRuleRepository');
    const logger = container.get('logger');
    return new DiscountRuleService(discountRuleRepository, logger);
  }, true);

  container.register('inventoryAlertService', () => {
    const dbConfig = container.get('dbConfig');
    return new InventoryAlertService(dbConfig.getClient());
  }, true);

  container.register('subscriptionService', () => {
    const subscriptionRepository = container.get('subscriptionRepository');
    const logger = container.get('logger');
    return new SubscriptionService(subscriptionRepository, logger);
  }, true);

  container.register('subscriptionPlanService', () => {
    const subscriptionPlanRepository = container.get('subscriptionPlanRepository');
    const logger = container.get('logger');
    return new SubscriptionPlanService(subscriptionPlanRepository, logger);
  }, true);

  container.register('productTypeService', () => {
    const logger = container.get('logger');
    return new ProductTypeService(
      container.get('productTypeRepository'),
      logger
    );
  }, true);

  container.register('productLotService', () => {
    const logger = container.get('logger');
    return new ProductLotService(
      container.get('productLotRepository'),
      container.get('productTypeRepository'),
      container.get('stockMovementRepository'),
      container.get('warehouseRepository'),
      logger
    );
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

  container.register('productFormulaController', () => {
    const service = container.get('productFormulaService');
    return new ProductFormulaController(service);
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
    const organizationService = container.get('organizationService');
    return new UserController(userService, organizationService);
  }, true);

  container.register('organizationController', () => {
    const organizationService = container.get('organizationService');
    return new OrganizationController(organizationService);
  }, true);

  container.register('clientController', () => {
    const clientService = container.get('clientService');
    return new ClientController(clientService);
  }, true);

  container.register('supplierController', () => {
    const supplierService = container.get('supplierService');
    return new SupplierController(supplierService);
  }, true);

  container.register('orderController', () => {
    const orderService = container.get('orderService');
    return new OrderController(orderService);
  }, true);

  container.register('purchaseOrderController', () => {
    const purchaseOrderService = container.get('purchaseOrderService');
    return new PurchaseOrderController(purchaseOrderService);
  }, true);

  container.register('pricingController', () => {
    const pricingService = container.get('pricingService');
    const pricingTierRepository = container.get('pricingTierRepository');
    const customerPricingRepository = container.get('customerPricingRepository');
    const taxRateRepository = container.get('taxRateRepository');
    const discountRuleRepository = container.get('discountRuleRepository');
    return new PricingController(pricingService, pricingTierRepository, customerPricingRepository, taxRateRepository, discountRuleRepository);
  }, true);

  container.register('taxRateController', () => {
    const taxRateService = container.get('taxRateService');
    return new TaxRateController(taxRateService);
  }, true);

  container.register('discountRuleController', () => {
    const discountRuleService = container.get('discountRuleService');
    return new DiscountRuleController(discountRuleService);
  }, true);

  container.register('inventoryAlertController', () => {
    const inventoryAlertService = container.get('inventoryAlertService');
    return new InventoryAlertController(inventoryAlertService);
  }, true);

  container.register('subscriptionController', () => {
    const subscriptionService = container.get('subscriptionService');
    return new SubscriptionController(subscriptionService);
  }, true);

  container.register('subscriptionPlanController', () => {
    const subscriptionPlanService = container.get('subscriptionPlanService');
    return new SubscriptionPlanController(subscriptionPlanService);
  }, true);

  container.register('productTypeController', () => {
    return new ProductTypeController(container.get('productTypeService'));
  }, true);

  container.register('productLotController', () => {
    return new ProductLotController(container.get('productLotService'));
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

  createOrganizationService() {
    return container.get('organizationService');
  },

  createUserService() {
    return container.get('userService');
  },

  getInstance() {
    return this;
  },

  createLogger(context = 'Default') {
    return new Logger(context);
  },

  createTaxRateController() {
    return container.get('taxRateController');
  },

  createDiscountRuleController() {
    return container.get('discountRuleController');
  },

  createTaxRateService() {
    return container.get('taxRateService');
  },

  createDiscountRuleService() {
    return container.get('discountRuleService');
  },

  createPurchaseOrderController() {
    return container.get('purchaseOrderController');
  },

  createPurchaseOrderService() {
    return container.get('purchaseOrderService');
  },

  createInventoryAlertController() {
    return container.get('inventoryAlertController');
  },

  createInventoryAlertService() {
    return container.get('inventoryAlertService');
  },

  createSubscriptionService() {
    return container.get('subscriptionService');
  },

  createSubscriptionController() {
    return container.get('subscriptionController');
  },

  createSubscriptionPlanService() {
    return container.get('subscriptionPlanService');
  },

  createSubscriptionPlanController() {
    return container.get('subscriptionPlanController');
  },

  createProductFormulaController() {
    return container.get('productFormulaController');
  },
  createProductFormulaService() {
    return container.get('productFormulaService');
  },
  createSupplierService() {
    return container.get('supplierService');
  },
  createProductTypeController() {
    return container.get('productTypeController');
  },
  createProductLotController() {
    return container.get('productLotController');
  },
};

module.exports = { 
  Container, 
  container, 
  ServiceFactory, 
  initializeContainer 
}