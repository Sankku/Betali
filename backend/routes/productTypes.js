// backend/routes/productTypes.js
const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest } = require('../middleware/validation');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { createProductTypeSchema, updateProductTypeSchema } = require('../validations/productTypeValidation');
const { bulkImportLimiter } = require('../middleware/rateLimiting');
const { checkOrganizationLimit } = require('../middleware/limitEnforcement');

const router = express.Router();

// Lazy controller initialization — avoids requiring ServiceFactory at module load
// ServiceFactory.createProductTypeController() is called when first request comes in
let _controller = null;
function getController() {
  if (!_controller) {
    const { ServiceFactory } = require('../config/container');
    _controller = ServiceFactory.createProductTypeController();
  }
  return _controller;
}

router.use(authenticateUser);
router.use(requireOrganizationContext);

router.get('/search', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try { await getController().searchTypes(req, res, next); } catch (e) { next(e); }
});

router.get('/', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try { await getController().getTypes(req, res, next); } catch (e) { next(e); }
});

router.post(
  '/bulk-import',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  bulkImportLimiter,
  checkOrganizationLimit('product_types'),
  async (req, res, next) => {
    try {
      const { ServiceFactory } = require('../config/container');
      await ServiceFactory.createProductLotController().bulkImport(req, res, next);
    } catch (e) { next(e); }
  }
);

router.get('/:id/available-stock', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try { await getController().getAvailableStock(req, res, next); } catch (e) { next(e); }
});

router.get('/:id/available-lots', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try {
    const { ServiceFactory } = require('../config/container');
    await ServiceFactory.createProductLotController().getAvailableLots(req, res, next);
  } catch (e) { next(e); }
});

router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
  try { await getController().getTypeById(req, res, next); } catch (e) { next(e); }
});

router.post('/', requirePermission(PERMISSIONS.PRODUCTS_CREATE), validateRequest(createProductTypeSchema), async (req, res, next) => {
  try { await getController().createType(req, res, next); } catch (e) { next(e); }
});

router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_UPDATE), validateRequest(updateProductTypeSchema), async (req, res, next) => {
  try { await getController().updateType(req, res, next); } catch (e) { next(e); }
});

router.delete('/bulk', requirePermission(PERMISSIONS.PRODUCTS_DELETE), async (req, res, next) => {
  try { await getController().bulkDeleteTypes(req, res, next); } catch (e) { next(e); }
});

router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS_DELETE), async (req, res, next) => {
  try { await getController().deleteType(req, res, next); } catch (e) { next(e); }
});

module.exports = router;
