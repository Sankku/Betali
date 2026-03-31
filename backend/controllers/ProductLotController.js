const { Logger } = require('../utils/Logger');

/**
 * ProductLot controller handling HTTP requests for product lot instances
 * Follows the separation of concerns principle
 */
class ProductLotController {
  constructor(productLotService) {
    this.service = productLotService;
  }

  async getAllLots(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lots = await this.service.lotRepo.findByOrg(organizationId);
      res.json({ data: lots, meta: { total: lots.length } });
    } catch (error) { next(error); }
  }

  async getLotsByType(req, res, next) {
    try {
      const { typeId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lots = await this.service.getLotsByType(typeId, organizationId);
      res.json({ data: lots, meta: { total: lots.length } });
    } catch (error) { next(error); }
  }

  async getLotById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lot = await this.service.getLotById(id, organizationId);
      res.json({ data: lot });
    } catch (error) { next(error); }
  }

  async createLot(req, res, next) {
    try {
      const { typeId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lot = await this.service.createLot(req.body, typeId, organizationId);
      res.status(201).json({ data: lot, message: 'Product lot created successfully' });
    } catch (error) { next(error); }
  }

  async updateLot(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const lot = await this.service.updateLot(id, req.body, organizationId);
      res.json({ data: lot, message: 'Product lot updated successfully' });
    } catch (error) { next(error); }
  }

  async deleteLot(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      await this.service.deleteLot(id, organizationId);
      res.json({ message: 'Product lot deleted successfully' });
    } catch (error) { next(error); }
  }

  async bulkImport(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const { products: rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'products array is required and must not be empty' });
      }
      if (rows.length > 500) {
        return res.status(400).json({ error: 'Cannot import more than 500 products at once' });
      }
      const result = await this.service.bulkImport(rows, userId, organizationId);
      res.status(200).json({
        data: result,
        message: `Import complete: ${result.created} created, ${result.updated} updated, ${result.failed.length} failed`
      });
    } catch (error) { next(error); }
  }
}

module.exports = { ProductLotController };
