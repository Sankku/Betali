// backend/routes/productLots.js
const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest } = require('../middleware/validation');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { createProductLotSchema, updateProductLotSchema } = require('../validations/productLotValidation');

function createProductLotRouter() {
  const router = express.Router({ mergeParams: true }); // mergeParams to access :typeId from parent

  // Lazy controller initialization — avoids requiring ServiceFactory at module load
  // ServiceFactory.createProductLotController() is called when first request comes in
  let _controller = null;
  function getController() {
    if (!_controller) {
      const { ServiceFactory } = require('../config/container');
      _controller = ServiceFactory.createProductLotController();
    }
    return _controller;
  }

  router.use(authenticateUser);
  router.use(requireOrganizationContext);

  // GET / — handles both nested (/api/product-types/:typeId/lots) and standalone (/api/product-lots)
  router.get('/', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
    try {
      if (req.params.typeId) {
        await getController().getLotsByType(req, res, next);
      } else {
        await getController().getAllLots(req, res, next);
      }
    } catch (e) { next(e); }
  });

  // Standalone GET /:id
  router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_READ), async (req, res, next) => {
    try { await getController().getLotById(req, res, next); } catch (e) { next(e); }
  });

  router.post('/', requirePermission(PERMISSIONS.PRODUCTS_CREATE), validateRequest(createProductLotSchema), async (req, res, next) => {
    try { await getController().createLot(req, res, next); } catch (e) { next(e); }
  });

  router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_UPDATE), validateRequest(updateProductLotSchema), async (req, res, next) => {
    try { await getController().updateLot(req, res, next); } catch (e) { next(e); }
  });

  router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS_DELETE), async (req, res, next) => {
    try { await getController().deleteLot(req, res, next); } catch (e) { next(e); }
  });

  return router;
}

module.exports = createProductLotRouter;
