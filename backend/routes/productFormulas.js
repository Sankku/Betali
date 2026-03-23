const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { validateRequest } = require('../middleware/validation');
const { addFormulaItemSchema, updateFormulaItemSchema } = require('../validations/productFormulaValidation');

function createProductFormulaRoutes() {
  const router = express.Router();
  const controller = ServiceFactory.createProductFormulaController();

  router.use(authenticateUser);
  router.use(requireOrganizationContext);

  // GET  /api/product-formulas/:productId/validate?quantity=N&warehouseId=X
  // Must be before /:productId to avoid Express matching 'validate' as productId
  router.get('/:productId/validate', (req, res, next) => controller.validateStock(req, res, next));

  // GET  /api/product-formulas/:productId
  router.get('/:productId', (req, res, next) => controller.getFormula(req, res, next));

  // POST /api/product-formulas
  router.post('/', validateRequest(addFormulaItemSchema), (req, res, next) => controller.addFormulaItem(req, res, next));

  // PUT  /api/product-formulas/:formulaId
  router.put('/:formulaId', validateRequest(updateFormulaItemSchema), (req, res, next) => controller.updateFormulaItem(req, res, next));

  // DELETE /api/product-formulas/:formulaId
  router.delete('/:formulaId', (req, res, next) => controller.deleteFormulaItem(req, res, next));

  return router;
}

module.exports = createProductFormulaRoutes;
