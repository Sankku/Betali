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
    // Default to a high limit so form dropdowns always see all types
    return this.findAll({ organization_id: organizationId }, { limit: 5000, ...options });
  }

  /**
   * Paginated + filtered query for the Products page.
   * Returns { data, total } so the controller can build meta.
   */
  async findByOrgFiltered(organizationId, { page = 1, limit = 100, search = '', type = '' } = {}) {
    if (!organizationId) throw new Error('organizationId is required');
    try {
      let query = this.client
        .from(this.table)
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId);

      if (search) {
        // Sanitise: strip % and _ to prevent injection into the ilike pattern
        const safe = search.replace(/[%_]/g, '');
        query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
      }
      if (type) {
        query = query.eq('product_type', type);
      }

      query = query.order('name', { ascending: true });

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    } catch (error) {
      throw new Error(`Error finding product types (filtered): ${error?.message || String(error)}`);
    }
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

  /**
   * Search product types by name or SKU.
   * IMPORTANT: `searchTerm` must be sanitised by the caller before passing here.
   * Direct interpolation into the PostgREST filter string means unsanitised input
   * could inject additional filter conditions.
   */
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
