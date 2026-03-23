const { BaseRepository } = require('./BaseRepository');

class ProductFormulaRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'product_formulas');
  }

  /**
   * Find all formula items for a finished product within an organization,
   * joining raw material name and unit for display.
   */
  async findByFinishedProduct(finishedProductId, organizationId) {
    if (!organizationId) {
      throw new Error('organizationId is required');
    }
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select(`
          formula_id,
          finished_product_id,
          raw_material_id,
          quantity_required,
          organization_id,
          created_at,
          raw_material:products!product_formulas_raw_material_id_fkey(
            product_id, name, unit
          )
        `)
        .eq('finished_product_id', finishedProductId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding formula: ${error?.message || String(error)}`);
    }
  }

  /**
   * Check for direct cycles: returns true if adding (finishedProductId → rawMaterialId)
   * would create a direct cycle (e.g., A is ingredient of B, and B is ingredient of A).
   */
  async wouldCreateCycle(finishedProductId, rawMaterialId, organizationId) {
    try {
      const { data } = await this.client
        .from(this.table)
        .select('formula_id')
        .eq('finished_product_id', rawMaterialId)
        .eq('raw_material_id', finishedProductId)
        .eq('organization_id', organizationId)
        .limit(1);
      return (data || []).length > 0;
    } catch {
      return false;
    }
  }
}

module.exports = { ProductFormulaRepository };
