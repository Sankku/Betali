const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateQuery } = require('../middleware/validation');

const dashboardQuerySchema = {
  validate: (query) => ({
    error: null,
    value: {
      limit: query.limit ? Math.min(parseInt(query.limit), 50) : 10,
      days: query.days ? parseInt(query.days) : 30,
      period: query.period || '30d',
      type: query.type || 'overview'
    }
  })
};

const analyticsQuerySchema = {
  validate: (query) => {
    const validPeriods = ['1d', '7d', '30d', '90d', '1y'];
    const validTypes = ['overview', 'products', 'movements'];
    
    const period = query.period || '30d';
    const type = query.type || 'overview';
    
    const errors = [];
    
    if (!validPeriods.includes(period)) {
      errors.push({ message: `Period must be one of: ${validPeriods.join(', ')}` });
    }
    
    if (!validTypes.includes(type)) {
      errors.push({ message: `Type must be one of: ${validTypes.join(', ')}` });
    }
    
    return {
      error: errors.length > 0 ? { details: errors } : null,
      value: {
        period,
        type,
        limit: query.limit ? Math.min(parseInt(query.limit), 100) : 20
      }
    };
  }
};

const router = express.Router();

const dashboardController = ServiceFactory.createDashboardController();

router.use(authenticateUser);
router.use(requireOrganizationContext);

router.get(
  '/',
  async (req, res, next) => {
    try {
      await dashboardController.getDashboardData(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/activity',
  validateQuery(dashboardQuerySchema),
  async (req, res, next) => {
    try {
      await dashboardController.getRecentActivity(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/stats',
  async (req, res, next) => {
    try {
      await dashboardController.getStats(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/analytics',
  validateQuery(analyticsQuerySchema),
  async (req, res, next) => {
    try {
      await dashboardController.getAnalytics(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/alerts/expiring',
  validateQuery(dashboardQuerySchema),
  async (req, res, next) => {
    try {
      await dashboardController.getExpiringProducts(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/alerts/low-stock',
  async (req, res, next) => {
    try {
      await dashboardController.getLowStockAlerts(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;