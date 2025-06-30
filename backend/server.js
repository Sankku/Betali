const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { Logger } = require('./utils/Logger');
const { DatabaseConfig } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const productRoutes = require('./routes/products');
const dashboardRoutes = require('./routes/dashboard');
const warehouseRoutes = require('./routes/warehouse'); 
const createStockMovementRoutes = require('./routes/stockMovements');
const healthRoutes = require('./routes/health');

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
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

    this.app.use('/api/products', productRoutes);
    this.app.use('/api/warehouse', warehouseRoutes); 
    this.app.use('/api/stock-movements', createStockMovementRoutes());
    this.app.use('/api/dashboard', dashboardRoutes);

    this.app.get('/', (req, res) => {
      res.json({
        message: 'AgroPanel API',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          products: '/api/products',
          warehouses: '/api/warehouse',
          stockMovements: '/api/stock-movements',
          dashboard: '/api/dashboard'
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

      this.setupGracefulShutdown(server);

      return server;
    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      Logger.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   * @param {Object} server - Express server instance
   */
  setupGracefulShutdown(server) {
    const shutdown = (signal) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown`);
      
      server.close(() => {

        
        this.logger.info('Graceful shutdown completed');
        Logger.exit(0);
      });

      setTimeout(() => {
        this.logger.error('Forced shutdown due to timeout');
        Logger.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

if (require.main === module) {
  const app = new Application();
  app.start().catch(error => {
    Logger.error('Application startup failed:', error);
  });
}

module.exports = { Application };
