// backend/services/ProductTypeService.js
const { Logger } = require('../utils/Logger');

class ProductTypeService {
  constructor(productTypeRepository, logger) {
    this.repo = productTypeRepository;
    this.logger = logger || new Logger('ProductTypeService');
  }

  async getTypes(organizationId) {
    return this.repo.findByOrg(organizationId);
  }

  async getTypesPaginated(organizationId, options) {
    return this.repo.findByOrgFiltered(organizationId, options);
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

  async searchTypes(query, organizationId) {
    return this.repo.search(query, organizationId);
  }

  async createType(data, organizationId) {
    const { sku } = data;
    if (!sku) {
      const err = new Error('SKU is required');
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
      const duplicate = await this.repo.findBySku(data.sku, organizationId);
      if (duplicate) {
        const err = new Error('Another product type with this SKU already exists');
        err.status = 409;
        throw err;
      }
    }

    return this.repo.update(id, data, 'product_type_id');
  }

  async getAvailableStock(id, warehouseId, organizationId) {
    // Basic implementation — can be extended with specific stock logic
    const { data, error } = await this.repo.client
      .from('stock_movements')
      .select('movement_type, quantity')
      .eq('organization_id', organizationId)
      .eq('product_type_id', id)
      .filter('warehouse_id', warehouseId ? 'eq' : 'not.is.null', warehouseId || null);

    if (error) throw error;

    let total = 0;
    (data || []).forEach(m => {
      if (m.movement_type === 'entry') total += parseFloat(m.quantity);
      else total -= parseFloat(m.quantity);
    });

    return total;
  }

  async deleteType(id, organizationId) {
    const existing = await this.repo.findById(id, organizationId);
    if (!existing) {
      const err = new Error('Product type not found');
      err.status = 404;
      throw err;
    }

    // Organization ownership already verified via findById above.
    const { data: lots, error: lotsError } = await this.repo.client
      .from('product_lots')
      .select('lot_number')
      .eq('product_type_id', id);
    
    if (lots && lots.length > 0) {
      const lotNumbers = lots.map(l => l.lot_number).join(', ');
      const err = new Error(`Cannot delete product type: it has ${lots.length} associated lot(s) (${lotNumbers})`);
      err.status = 409;
      err.lot_count = lots.length;
      err.key = 'errors.product_types.delete_blocked_by_lots';
      err.params = { count: lots.length, lot_numbers: lotNumbers };
      throw err;
    }

    await this.repo.delete(id, 'product_type_id');
    return true;
  }

  /**
   * Helper to process operations in chunks to avoid URL length limits
   */
  async _runInChunks(ids, chunkSize, action) {
    const results = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      results.push(await action(chunk));
    }
    return results.flat();
  }

  async bulkDeleteTypes(ids, organizationId) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids array is required and must not be empty');
      err.status = 400;
      throw err;
    }

    this.logger.info(`Bulk deleting up to ${ids.length} product types in chunks`);

    // 1. Verify existence and ownership in chunks
    const existingData = await this._runInChunks(ids, 100, async (chunk) => {
      const { data, error } = await this.repo.client
        .from('product_types')
        .select('product_type_id')
        .in('product_type_id', chunk)
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    });

    const foundIds = existingData.map(r => r.product_type_id);
    const notFoundCount = ids.length - foundIds.length;

    // 2. Check for associated lots in chunks
    const lotsData = await this._runInChunks(foundIds, 100, async (chunk) => {
      const { data, error } = await this.repo.client
        .from('product_lots')
        .select('product_type_id')
        .in('product_type_id', chunk);
      if (error) throw error;
      return data || [];
    });

    const blockedIds = [...new Set(lotsData.map(l => l.product_type_id))];
    const deletableIds = foundIds.filter(id => !blockedIds.includes(id));

    // 3. Delete deletable IDs in chunks
    if (deletableIds.length > 0) {
      await this._runInChunks(deletableIds, 100, async (chunk) => {
        const { error } = await this.repo.client
          .from('product_types')
          .delete()
          .in('product_type_id', chunk)
          .eq('organization_id', organizationId);
        if (error) throw error;
      });
    }

    return {
      deleted: deletableIds.length,
      blocked: blockedIds.length,
      not_found: notFoundCount,
      blocked_ids: blockedIds,
    };
  }
}

module.exports = { ProductTypeService };
