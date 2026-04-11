const { Logger } = require('../utils/Logger');

const PRICE_SENSITIVE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

function stripPurchasePrice(type) {
  const { purchase_price, ...rest } = type;
  return rest;
}

function filterPurchasePrice(data, role) {
  if (PRICE_SENSITIVE_ROLES.includes(role)) return data;
  if (Array.isArray(data)) return data.map(stripPurchasePrice);
  return stripPurchasePrice(data);
}

/**
 * ProductType controller handling HTTP requests for product type definitions
 * Follows the separation of concerns principle
 */
class ProductTypeController {
  constructor(productTypeService) {
    this.service = productTypeService;
  }

  async getTypes(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });

      const { page, limit: limitParam, search, type } = req.query;

      if (page !== undefined) {
        // Paginated mode — used by the Products table
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(500, Math.max(1, parseInt(limitParam) || 100));
        const { data, total } = await this.service.getTypesPaginated(organizationId, {
          page: pageNum,
          limit: limitNum,
          search: search?.trim() || '',
          type: type || '',
        });
        const filtered = filterPurchasePrice(data, req.user.currentOrganizationRole);
        return res.json({
          data: filtered,
          meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
        });
      }

      // Legacy mode — used by form dropdowns (no pagination)
      const types = await this.service.getTypes(organizationId);
      const data = filterPurchasePrice(types, req.user.currentOrganizationRole);
      res.json({ data, meta: { total: data.length } });
    } catch (error) { next(error); }
  }

  async getTypeById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const type = await this.service.getTypeById(id, organizationId);
      res.json({ data: filterPurchasePrice(type, req.user.currentOrganizationRole) });
    } catch (error) { next(error); }
  }

  async searchTypes(req, res, next) {
    try {
      const { q } = req.query;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      if (!q) return res.status(400).json({ error: 'Search term is required' });
      const types = await this.service.searchTypes(q, organizationId);
      const data = filterPurchasePrice(types, req.user.currentOrganizationRole);
      res.json({ data, meta: { searchTerm: q, total: data.length } });
    } catch (error) { next(error); }
  }

  async createType(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const type = await this.service.createType(req.body, organizationId);
      res.status(201).json({ data: type, message: 'Product type created successfully' });
    } catch (error) { next(error); }
  }

  async updateType(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const type = await this.service.updateType(id, req.body, organizationId);
      res.json({ data: type, message: 'Product type updated successfully' });
    } catch (error) { next(error); }
  }

  async getAvailableStock(req, res, next) {
    try {
      const { id } = req.params;
      const { warehouse_id } = req.query;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const result = await this.service.getAvailableStock(id, warehouse_id, organizationId);
      res.json({ data: result });
    } catch (error) { next(error); }
  }

  async deleteType(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      await this.service.deleteType(id, organizationId);
      res.json({ message: 'Product type deleted successfully' });
    } catch (error) { next(error); }
  }

  async bulkDeleteTypes(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) return res.status(400).json({ error: 'No organization context found.' });
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required and must not be empty' });
      }
      if (ids.length > 1000) {
        return res.status(400).json({ error: 'Cannot delete more than 1000 product types at once' });
      }
      const result = await this.service.bulkDeleteTypes(ids, organizationId);
      res.json({
        data: result,
        message: `Bulk delete complete: ${result.deleted} deleted, ${result.blocked} blocked (have lots), ${result.not_found} not found`,
      });
    } catch (error) { next(error); }
  }
}

module.exports = { ProductTypeController };
