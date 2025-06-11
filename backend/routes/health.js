const express = require('express');
const { DatabaseConfig } = require('../config/database');
const { Logger } = require('../utils/Logger');

const router = express.Router();
const logger = new Logger('HealthCheck');
const dbConfig = new DatabaseConfig();

/**
 * Basic health check endpoint
 * GET /health
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * Detailed health check with dependencies
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {}
  };

  try {
    // Check database connection
    await dbConfig.healthCheck();
    healthCheck.dependencies.database = {
      status: 'healthy',
      message: 'Connected successfully'
    };
  } catch (error) {
    healthCheck.status = 'unhealthy';
    healthCheck.dependencies.database = {
      status: 'unhealthy',
      message: error.message
    };
    logger.error('Database health check failed', { error: error.message });
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

/**
 * Readiness probe for Kubernetes/container orchestration
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if application is ready to serve requests
    await dbConfig.healthCheck();
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness probe for Kubernetes/container orchestration
 * GET /health/live
 */
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

module.exports = router;