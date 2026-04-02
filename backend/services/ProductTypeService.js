const { Logger } = require('../utils/Logger');

class ProductTypeService {
  constructor(productTypeRepository, logger, stockMovementRepository) {
    this.repo = productTypeRepository;
    this.logger = logger || new Logger('ProductTypeService');
    this.stockMovementRepo = stockMovementRepository || null;
  }

  async getTypes(organizationId, options = {}) {
    return this.repo.findByOrg(organizationId, options);
  }

  async getTypeById(id, organizationId) {
    const type = await this.repo.findById(id, organizationId);
    if (!type) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }
    return type;
  }

  async searchTypes(searchTerm, organizationId) {
    return this.repo.search(searchTerm, organizationId);
  }

  async createType(data, organizationId) {
    const { sku, name, product_type, unit } = data;
    if (!sku || !name || !product_type || !unit) {
      const err = new Error('sku, name, product_type, and unit are required');
      err.status = 400;
      throw err;
    }

    const existing = await this.repo.findBySku(sku, organizationId);
    if (existing) {
      const err = new Error('A product type with this SKU already exists in your organization');
      err.status = 409;
      throw err;
    }

    return this.repo.create({ ...data, organization_id: organizationId });
  }

  async updateType(id, data, organizationId) {
    const existing = await this.repo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }

    if (data.sku && data.sku !== existing.sku) {
      const conflict = await this.repo.findBySku(data.sku, organizationId);
      if (conflict) {
        const err = new Error('A product type with this SKU already exists in your organization');
        err.status = 409;
        throw err;
      }
    }

    return this.repo.update(id, data, 'product_type_id');
  }

  async getAvailableStock(productTypeId, warehouseId, organizationId) {
    if (!this.stockMovementRepo) {
      throw new Error('Stock movement repository not available');
    }
    // Get non-expired lots for this product type (same filter as FEFO dispatch)
    const now = new Date().toISOString();
    const { data: lots, error } = await this.repo.client
      .from('product_lots')
      .select('lot_id')
      .eq('product_type_id', productTypeId)
      .eq('organization_id', organizationId)
      .or(`expiration_date.is.null,expiration_date.gt.${now}`);

    if (error) throw new Error(`Error fetching lots: ${error.message}`);
    if (!lots || lots.length === 0) {
      return { product_type_id: productTypeId, warehouse_id: warehouseId, available_stock: 0 };
    }

    const lotIds = lots.map(l => l.lot_id);
    const stockByLot = await this.stockMovementRepo.getCurrentStockBulk(lotIds, warehouseId, organizationId);
    const total = Object.values(stockByLot).reduce((sum, s) => sum + s, 0);

    return {
      product_type_id: productTypeId,
      warehouse_id: warehouseId,
      organization_id: organizationId,
      available_stock: total,
      timestamp: new Date().toISOString(),
    };
  }

  async deleteType(id, organizationId) {
    const existing = await this.repo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }

    // Organization ownership already verified via findById above.
    // Single eq() to match the mock-compatible chain pattern.
    const { data: lots, error: lotsError } = await this.repo.client
      .from('product_lots')
      .select('lot_id')
      .eq('product_type_id', id);
    const lotCount = lotsError ? 0 : (lots?.length ?? 0);
    if (lotCount > 0) {
      const err = new Error(`Cannot delete product type: ${lotCount} lot(s) are still associated`);
      err.status = 409;
      err.lot_count = lotCount;
      throw err;
    }

    await this.repo.delete(id, 'product_type_id');
    return true;
  }
}

module.exports = { ProductTypeService };
