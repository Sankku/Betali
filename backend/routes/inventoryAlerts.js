const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');

const router = express.Router();

const alertController = ServiceFactory.createInventoryAlertController();

// All routes require authentication
router.use(authenticateUser);
router.use(requireOrganizationContext);

/**
 * @route   GET /api/alerts/active
 * @desc    Get all active alerts for the organization
 * @access  Private
 */
router.get('/active', async (req, res, next) => {
  try {
    await alertController.getActiveAlerts(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/alerts/statistics
 * @desc    Get alert statistics for dashboard
 * @access  Private
 */
router.get('/statistics', async (req, res, next) => {
  try {
    await alertController.getAlertStatistics(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/alerts/check
 * @desc    Check inventory and create new alerts
 * @access  Private
 */
router.post('/check', async (req, res, next) => {
  try {
    await alertController.checkInventoryAlerts(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/alerts/bulk-dismiss
 * @desc    Bulk dismiss alerts
 * @access  Private
 */
router.post('/bulk-dismiss', async (req, res, next) => {
  try {
    await alertController.bulkDismissAlerts(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/alerts/product/:productId
 * @desc    Get alerts for a specific product
 * @access  Private
 */
router.get('/product/:productId', async (req, res, next) => {
  try {
    await alertController.getAlertsByProduct(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/alerts/warehouse/:warehouseId
 * @desc    Get alerts for a specific warehouse
 * @access  Private
 */
router.get('/warehouse/:warehouseId', async (req, res, next) => {
  try {
    await alertController.getAlertsByWarehouse(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/alerts/:id
 * @desc    Get alert by ID
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    await alertController.getAlertById(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/alerts/:id/dismiss
 * @desc    Dismiss an alert
 * @access  Private
 */
router.patch('/:id/dismiss', async (req, res, next) => {
  try {
    await alertController.dismissAlert(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/alerts/:id/resolve
 * @desc    Resolve an alert
 * @access  Private
 */
router.patch('/:id/resolve', async (req, res, next) => {
  try {
    await alertController.resolveAlert(req, res, next);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
