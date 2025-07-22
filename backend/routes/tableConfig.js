const express = require('express');
const { ServiceFactory } = require('../config/container');
// const { authenticateUser } = require('../middleware/auth'); // Comentado temporalmente
const { Logger } = require('../utils/Logger');

const router = express.Router();
const logger = new Logger('TableConfigRoutes');

// Middleware temporal para simular usuario autenticado
const mockAuthMiddleware = (req, res, next) => {
  // En desarrollo, simular un usuario autenticado
  req.user = {
    user_id: 'mock-user-id',
    email: 'admin@example.com'
  };
  next();
};

/**
 * GET /api/tables/:tableId/config
 * Obtiene la configuración de una tabla específica
 */
router.get('/:tableId/config', mockAuthMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    const userId = req.user?.user_id;
    
    logger.info('Getting table configuration', { tableId, userId });

    // Get services from container
    const tableConfigService = ServiceFactory.getTableConfigService();
    const config = await tableConfigService.getTableConfiguration(tableId, userId);

    res.json({
      success: true,
      data: config,
      meta: {
        tableId,
        userId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error getting table config:', { error: error.message, tableId: req.params.tableId });
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: statusCode,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/tables/available
 * Lista todas las configuraciones de tabla disponibles para el usuario
 */
router.get('/available', mockAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.user_id;
    
    logger.info('Getting available table configurations', { userId });

    const tableConfigService = ServiceFactory.getTableConfigService();
    const configs = await tableConfigService.getAvailableConfigurations(userId);

    res.json({
      success: true,
      data: configs,
      meta: {
        userId,
        count: configs.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error getting available tables:', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/tables
 * Crea una nueva configuración de tabla
 */
router.post('/', mockAuthMiddleware, async (req, res) => {
  try {
    const configData = req.body;
    const adminUserId = req.user?.user_id;

    logger.info('Creating table configuration', { configId: configData.id, adminUserId });

    const tableConfigService = ServiceFactory.getTableConfigService();
    const savedConfig = await tableConfigService.saveTableConfiguration(configData, adminUserId);

    res.status(201).json({
      success: true,
      data: savedConfig,
      message: 'Table configuration created successfully',
      meta: {
        configId: savedConfig.id,
        adminUserId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error creating table config:', { error: error.message });
    
    const statusCode = error.message.includes('Missing required field') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: statusCode,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/tables/:tableId
 * Actualiza una configuración de tabla existente
 */
router.put('/:tableId', mockAuthMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    const configData = { ...req.body, id: tableId };
    const adminUserId = req.user?.user_id;

    logger.info('Updating table configuration', { tableId, adminUserId });

    const tableConfigService = ServiceFactory.getTableConfigService();
    const updatedConfig = await tableConfigService.saveTableConfiguration(configData, adminUserId);

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Table configuration updated successfully',
      meta: {
        tableId,
        adminUserId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error updating table config:', { error: error.message, tableId: req.params.tableId });
    
    const statusCode = error.status || (error.message.includes('not found') ? 404 : 500);
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: statusCode,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/tables/:tableId
 * Elimina una configuración de tabla
 */
router.delete('/:tableId', mockAuthMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    const adminUserId = req.user?.user_id;

    logger.info('Deleting table configuration', { tableId, adminUserId });

    const tableConfigService = ServiceFactory.getTableConfigService();
    await tableConfigService.deleteTableConfiguration(tableId, adminUserId);

    res.json({
      success: true,
      message: 'Table configuration deleted successfully',
      meta: {
        tableId,
        adminUserId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error deleting table config:', { error: error.message, tableId: req.params.tableId });
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: statusCode,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;