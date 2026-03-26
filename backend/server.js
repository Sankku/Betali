const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const helmet = require('helmet');
const { Logger } = require('./utils/Logger');
const { DatabaseConfig } = require('./config/database');
const { container } = require('./config/container');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter, speedLimiter } = require('./middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('./middleware/sanitization');
const { i18n } = require('./utils/i18n');

const productRoutes = require('./routes/products');
const dashboardRoutes = require('./routes/dashboard');
const warehouseRoutes = require('./routes/warehouse'); 
const createStockMovementRoutes = require('./routes/stockMovements');
const tableConfigRoutes = require('./routes/tableConfig');
const userRoutes = require('./routes/users');
const { createOrganizationRoutes } = require('./routes/organizations');
const clientRoutes = require('./routes/clients');
const supplierRoutes = require('./routes/suppliers');
const purchaseOrderRoutes = require('./routes/purchase-orders');
const { createOrderRoutes } = require('./routes/orders');
const { createPricingRoutes } = require('./routes/pricing');
const authRoutes = require('./routes/auth');
const taxRateRoutes = require('./routes/taxRates');
const discountRuleRoutes = require('./routes/discountRules');
const subscriptionPlanRoutes = require('./routes/subscriptionPlans');
const subscriptionRoutes = require('./routes/subscriptions');
const mercadoPagoRoutes = require('./routes/mercadopago');
const authEmailHookRoutes = require('./routes/auth-email-hook');
const cronRoutes = require('./routes/cron');
const healthRoutes = require('./routes/health');
const debugRoutes = require('./routes/debug');
const inventoryAlertRoutes = require('./routes/inventoryAlerts');
const createProductFormulaRoutes = require('./routes/productFormulas');
const { alertChecker } = require('./jobs/inventoryAlertChecker');
const telegramApiRoutes = require('./routes/telegram');
const { createBot, startPolling } = require('./telegram/bot');

/**
 * Application class following OOP principles
 * Implements proper separation of concerns and dependency injection
 */
class Application {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 4000;
    this.logger = new Logger('Application');
    this.dbConfig = new DatabaseConfig();
  }

  /**
   * Initialize application with all necessary configurations
   */
  async initialize() {
    try {
      this.validateEnvironment();
      
      await this.initializeI18n();
      
      this.setupMiddleware();
      
      this.setupRoutes();
      
      this.setupErrorHandling();
      
      await this.testDatabaseConnection();
      
      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    this.logger.info('Environment variables validated successfully');
  }

  /**
   * Initialize internationalization
   */
  async initializeI18n() {
    try {
      await i18n.init();
      this.logger.info('Internationalization initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize i18n', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security headers with Helmet
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false // Allow for API usage
    }));

    // NOTE: generalLimiter and speedLimiter are NOT applied globally here
    // because at this point req.user is not yet populated (auth middleware
    // runs per-route). Applying them here would key by IP, which breaks
    // in hosted environments where all users share the same proxy IP.
    // Instead, searchLimiter and createLimiter are applied per-route
    // AFTER the auth middleware, so they correctly key by user ID.
    if (process.env.NODE_ENV === 'production') {
      this.logger.info('Rate limiting enabled (per-route, user-aware)');
    } else {
      this.logger.warn('Rate limiting disabled for development');
    }

    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? (process.env.FRONTEND_URL || 'http://localhost:3000')
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id']
    }));
    
    // Additional CORS headers for organization context
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-organization-id');
      next();
    });

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Apply global input sanitization
    this.app.use(sanitizeMiddleware(SANITIZATION_RULES.search));

    // Apply internationalization middleware
    this.app.use(i18n.middleware());

    this.app.use((req, res, next) => {
      this.logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });

    this.app.use((req, res, next) => {
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      });
      next();
    });

    this.logger.info('Middleware configured successfully');
  }

  /**
   * Setup application routes
   */
  setupRoutes() {
    this.app.use('/health', healthRoutes);
    this.app.use('/api/auth', authRoutes);

    this.app.use('/api/products', productRoutes);
    this.app.use('/api/warehouse', warehouseRoutes); 
    this.app.use('/api/stock-movements', createStockMovementRoutes());
    this.app.use('/api/dashboard', dashboardRoutes);
    this.app.use('/api/tables', tableConfigRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/organizations', createOrganizationRoutes(container));
    this.app.use('/api/clients', clientRoutes);
    this.app.use('/api/suppliers', supplierRoutes);
    this.app.use('/api/orders', createOrderRoutes(container));
    this.app.use('/api/purchase-orders', purchaseOrderRoutes);
    this.app.use('/api/pricing', createPricingRoutes(container));
    this.app.use('/api/tax-rates', taxRateRoutes);
    this.app.use('/api/discount-rules', discountRuleRoutes);
    this.app.use('/api/subscription-plans', subscriptionPlanRoutes);
    this.app.use('/api/subscriptions', subscriptionRoutes);
    this.app.use('/api/webhooks', authEmailHookRoutes); // Supabase Auth Hook — must be before /api catch-all
    this.app.use('/api/mercadopago', mercadoPagoRoutes);
    this.app.use('/api', mercadoPagoRoutes); // For webhook route /api/webhooks/mercadopago
    this.app.use('/api/alerts', inventoryAlertRoutes);
    this.app.use('/api/product-formulas', createProductFormulaRoutes());
    this.app.use('/api/cron', cronRoutes);
    this.app.use('/api/telegram', telegramApiRoutes.apiRouter);
    this.app.use('/webhook/telegram', telegramApiRoutes.webhookRouter);

    // Debug routes (development only)
    if (process.env.NODE_ENV === 'development') {
      this.app.use('/api/debug', debugRoutes);
    }

    this.app.get('/', (req, res) => {
      res.json({
        message: 'Betali API',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          products: '/api/products',
          warehouses: '/api/warehouse',
          stockMovements: '/api/stock-movements',
          dashboard: '/api/dashboard',
          tableConfigs: '/api/tables',
          users: '/api/users',
          organizations: '/api/organizations',
          clients: '/api/clients',
          suppliers: '/api/suppliers',
          orders: '/api/orders',
          taxRates: '/api/tax-rates',
          discountRules: '/api/discount-rules',
          alerts: '/api/alerts'
        }
      });
    });

    this.logger.info('Routes configured successfully');
  }

  /**
   * Setup error handling middleware
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);
    
    this.app.use(errorHandler);

    this.logger.info('Error handling configured successfully');
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    try {
      await this.dbConfig.healthCheck();
      this.logger.info('Database connection verified successfully');
    } catch (error) {
      this.logger.error('Database connection failed', { error: error.message });
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();

      const server = this.app.listen(this.port, () => {
        this.logger.info(`Server started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          url: `http://localhost:${this.port}`
        });
      });

      // Start inventory alert checker
      alertChecker.start();
      this.logger.info('Inventory alert checker started');

      // Initialize Telegram bot
      createBot();
      if (process.env.NODE_ENV !== 'production') {
        // En desarrollo usamos long polling (no necesita URL pública)
        startPolling();
      }
      // En producción el bot recibe updates via webhook en /webhook/telegram

      this.setupGracefulShutdown(server);

      return server;
    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   * @param {Object} server - Express server instance
   */
  setupGracefulShutdown(server) {
    const shutdown = async (signal) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown`);
      
      server.close(async () => {
        try {
          // Stop background jobs
          alertChecker.stop();
          this.logger.info('Background jobs stopped');

          // Close database connections
          if (this.db && this.db.close) {
            await this.db.close();
            this.logger.info('Database connections closed');
          }

          // Clear any running intervals/timeouts
          // Note: Supabase client handles its own connection pooling

          this.logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          this.logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        this.logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

if (require.main === module) {
  const app = new Application();
  app.start().catch(error => {
    const logger = new Logger('ApplicationStartup');
    logger.error('Application startup failed:', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

module.exports = { Application };
