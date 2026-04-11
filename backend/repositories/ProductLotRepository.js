// backend/repositories/ProductLotRepository.js
const { BaseRepository } = require('./BaseRepository');

class ProductLotRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'product_lots');
  }

  async findById(id, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*, product_types(*)')
        .eq('lot_id', id)
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding product lot by ID: ${error?.message || String(error)}`);
    }
  }

  async findByOrg(organizationId, options = {}) {
    if (!organizationId) throw new Error('organizationId is required');
    return this.findAll({ organization_id: organizationId }, options);
  }

  /** Fetch all lots for an org without a row cap — used by the Products accordion. */
  async findAllByOrg(organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding all lots: ${error?.message || String(error)}`);
    }
  }

  async findByType(productTypeId, organizationId, options = {}) {
    if (!organizationId) throw new Error('organizationId is required');
    return this.findAll({ product_type_id: productTypeId, organization_id: organizationId }, options);
  }

  async findByLotNumber(lotNumber, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('lot_number', lotNumber)
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding lot by number: ${error?.message || String(error)}`);
    }
  }

  async findExpiringByOrg(days = 30, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const { data, error } = await this.client
        .from(this.table)
        .select('*, product_types(name, sku)')
        .eq('organization_id', organizationId)
        .gte('expiration_date', new Date().toISOString().split('T')[0])
        .lte('expiration_date', futureDate.toISOString().split('T')[0]);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding expiring lots: ${error?.message || String(error)}`);
    }
  }

  /**
   * Find non-expired lots for a product type, ordered by expiration_date ASC (FEFO order).
   * warehouseId is not used to filter here — the service layer checks per-warehouse stock.
   */
  async findForFefo(productTypeId, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await this.client
        .from(this.table)
        .select('lot_id, lot_number, expiration_date')
        .eq('product_type_id', productTypeId)
        .eq('organization_id', organizationId)
        .gte('expiration_date', today)
        .order('expiration_date', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding FEFO lots: ${error?.message || String(error)}`);
    }
  }
}

module.exports = { ProductLotRepository };
