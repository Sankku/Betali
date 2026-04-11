const express = require('express');
const { container } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');

const router = express.Router();

// Get supplier controller from container
const getSupplierController = () => container.get('supplierController');

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers for organization with filtering and pagination
 * @access  Private (suppliers:read permission required)
 */
router.get('/', 
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.getSuppliers(req, res, next);
  }
);

/**
 * @route   GET /api/suppliers/search
 * @desc    Search suppliers by name, email, CUIT, or contact person
 * @access  Private (suppliers:read permission required)
 */
router.get('/search',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.searchSuppliers(req, res, next);
  }
);

/**
 * @route   GET /api/suppliers/stats
 * @desc    Get supplier statistics for organization
 * @access  Private (suppliers:read permission required)
 */
router.get('/stats',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.getSupplierStats(req, res, next);
  }
);

/**
 * @route   GET /api/suppliers/preferred
 * @desc    Get preferred suppliers for organization
 * @access  Private (suppliers:read permission required)
 */
router.get('/preferred',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.getPreferredSuppliers(req, res, next);
  }
);

/**
 * @route   GET /api/suppliers/business-types
 * @desc    Get list of available business types
 * @access  Private (suppliers:read permission required)
 */
router.get('/business-types',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.getBusinessTypes(req, res, next);
  }
);

/**
 * @route   POST /api/suppliers/validate
 * @desc    Validate supplier data (CUIT, email uniqueness)
 * @access  Private (suppliers:create permission required)
 */
router.post('/validate',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_CREATE),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.validateSupplier(req, res, next);
  }
);

/**
 * @route   GET /api/suppliers/cuit/:cuit
 * @desc    Get supplier by CUIT within organization
 * @access  Private (suppliers:read permission required)
 */
router.get('/cuit/:cuit',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.getSupplierByCuit(req, res, next);
  }
);

/**
 * @route   GET /api/suppliers/business-type/:type
 * @desc    Get suppliers by business type
 * @access  Private (suppliers:read permission required)
 */
router.get('/business-type/:type',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.getSuppliersByBusinessType(req, res, next);
  }
);

/**
 * @route   GET /api/suppliers/branch/:branchId
 * @desc    Get suppliers by branch
 * @access  Private (suppliers:read permission required)
 */
router.get('/branch/:branchId',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.getSuppliersByBranch(req, res, next);
  }
);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get single supplier by ID
 * @access  Private (suppliers:read permission required)
 */
router.get('/:id',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.getSupplierById(req, res, next);
  }
);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private (suppliers:create permission required)
 */
router.post('/',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_CREATE),
  checkOrganizationLimit('suppliers'),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.createSupplier(req, res, next);
  }
);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (suppliers:update permission required)
 */
router.put('/:id',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_UPDATE),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.updateSupplier(req, res, next);
  }
);

/**
 * @route   PUT /api/suppliers/:id/deactivate
 * @desc    Deactivate supplier (soft delete)
 * @access  Private (suppliers:update permission required)
 */
router.put('/:id/deactivate',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_UPDATE),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.deactivateSupplier(req, res, next);
  }
);

/**
 * @route   PUT /api/suppliers/:id/reactivate
 * @desc    Reactivate supplier
 * @access  Private (suppliers:update permission required)
 */
router.put('/:id/reactivate',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_UPDATE),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.reactivateSupplier(req, res, next);
  }
);

/**
 * @route   PUT /api/suppliers/:id/preferred
 * @desc    Set supplier preferred status
 * @access  Private (suppliers:update permission required)
 */
router.put('/:id/preferred',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_UPDATE),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.setPreferredStatus(req, res, next);
  }
);

/**
 * @route   DELETE /api/suppliers/bulk
 * @desc    Bulk delete suppliers
 * @access  Private (suppliers:delete permission required)
 */
router.delete('/bulk',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_DELETE),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.bulkDeleteSuppliers(req, res, next);
  }
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (hard delete)
 * @access  Private (suppliers:delete permission required)
 */
router.delete('/:id',
  authenticateUser,
  requirePermission(PERMISSIONS.SUPPLIERS_DELETE),
  async (req, res, next) => {
    const controller = getSupplierController();
    await controller.deleteSupplier(req, res, next);
  }
);

module.exports = router;