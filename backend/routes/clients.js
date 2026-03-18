const express = require('express');
const { container } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');

const router = express.Router();

// Get client controller from container
const getClientController = () => container.get('clientController');

/**
 * @route   GET /api/clients
 * @desc    Get all clients for organization with filtering and pagination
 * @access  Private (clients:read permission required)
 */
router.get('/', 
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_READ),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.getClients(req, res, next);
  }
);

/**
 * @route   GET /api/clients/search
 * @desc    Search clients by name, email, or CUIT
 * @access  Private (clients:read permission required)
 */
router.get('/search',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_READ),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.searchClients(req, res, next);
  }
);

/**
 * @route   GET /api/clients/stats
 * @desc    Get client statistics for organization
 * @access  Private (clients:read permission required)
 */
router.get('/stats',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_READ),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.getClientStats(req, res, next);
  }
);

/**
 * @route   POST /api/clients/validate
 * @desc    Validate client data (CUIT, email uniqueness)
 * @access  Private (clients:create permission required)
 */
router.post('/validate',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_CREATE),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.validateClient(req, res, next);
  }
);

/**
 * @route   GET /api/clients/cuit/:cuit
 * @desc    Get client by CUIT
 * @access  Private (clients:read permission required)
 */
router.get('/cuit/:cuit',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_READ),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.getClientByCuit(req, res, next);
  }
);

/**
 * @route   GET /api/clients/branch/:branchId
 * @desc    Get clients by branch
 * @access  Private (clients:read permission required)
 */
router.get('/branch/:branchId',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_READ),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.getClientsByBranch(req, res, next);
  }
);

/**
 * @route   GET /api/clients/:id
 * @desc    Get single client by ID
 * @access  Private (clients:read permission required)
 */
router.get('/:id',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_READ),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.getClientById(req, res, next);
  }
);

/**
 * @route   POST /api/clients
 * @desc    Create new client
 * @access  Private (clients:create permission required)
 */
router.post('/',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_CREATE),
  checkOrganizationLimit('clients'),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.createClient(req, res, next);
  }
);

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client
 * @access  Private (clients:update permission required)
 */
router.put('/:id',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_UPDATE),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.updateClient(req, res, next);
  }
);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete client
 * @access  Private (clients:delete permission required)
 */
router.delete('/:id',
  authenticateUser,
  requirePermission(PERMISSIONS.CLIENTS_DELETE),
  async (req, res, next) => {
    const controller = getClientController();
    await controller.deleteClient(req, res, next);
  }
);

module.exports = router;