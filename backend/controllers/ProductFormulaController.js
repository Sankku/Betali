const { Logger } = require('../utils/Logger');

class ProductFormulaController {
  constructor(productFormulaService) {
    this.service = productFormulaService;
    this.logger = new Logger('ProductFormulaController');
  }

  async getFormula(req, res, next) {
    try {
      const { productId } = req.params;
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const formula = await this.service.getFormula(productId, orgId);
      res.json({ data: formula });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Access denied') ||
          error.message.includes('must be of type')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  async addFormulaItem(req, res, next) {
    try {
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const item = await this.service.addFormulaItem(req.body, orgId);
      res.status(201).json({ message: 'Formula item added', data: item });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Access denied') ||
          error.message.includes('must be') || error.message.includes('cycle') ||
          error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  async updateFormulaItem(req, res, next) {
    try {
      const { formulaId } = req.params;
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      const item = await this.service.updateFormulaItem(
        formulaId, req.body.quantity_required, orgId
      );
      res.json({ message: 'Formula item updated', data: item });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  async deleteFormulaItem(req, res, next) {
    try {
      const { formulaId } = req.params;
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });

      await this.service.deleteFormulaItem(formulaId, orgId);
      res.json({ message: 'Formula item deleted' });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  async validateStock(req, res, next) {
    try {
      const { productId } = req.params;
      const { quantity, warehouseId } = req.query;
      const orgId = req.user.currentOrganizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization context' });
      if (!quantity || !warehouseId) {
        return res.status(400).json({ error: 'quantity and warehouseId are required' });
      }

      const preview = await this.service.validateFormulaStock(
        productId, Number(quantity), warehouseId, orgId
      );
      res.json({ data: preview });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('No formula')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
}

module.exports = { ProductFormulaController };
