const { BaseRepository } = require('./BaseRepository');

class ProductTypeRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'product_types');
  }

  async findById(id, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('product_type_id', id)
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding product type by ID: ${error?.message || String(error)}`);
    }
  }

  async findByOrg(organizationId, options = {}) {
    if (!organizationId) throw new Error('organizationId is required');
    return this.findAll({ organization_id: organizationId }, options);
  }

  async findBySku(sku, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('sku', sku)
        .eq('organization_id', organizationId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      throw new Error(`Error finding product type by SKU: ${error?.message || String(error)}`);
    }
  }

  async search(searchTerm, organizationId) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error searching product types: ${error?.message || String(error)}`);
    }
  }
}

module.exports = { ProductTypeRepository };
