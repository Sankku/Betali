const { Logger } = require('../utils/Logger');

class ProductFormulaService {
  constructor(productFormulaRepository, productTypeRepository, warehouseRepository, supabaseClient, logger) {
    this.formulaRepository = productFormulaRepository;
    this.productTypeRepository = productTypeRepository;
    this.warehouseRepository = warehouseRepository;
    this.supabaseClient = supabaseClient;
    this.logger = logger || new Logger('ProductFormulaService');
  }

  async getFormula(finishedProductTypeId, organizationId) {
    try {
      await this._validateFinishedProductType(finishedProductTypeId, organizationId);
      return await this.formulaRepository.findByFinishedProduct(finishedProductTypeId, organizationId);
    } catch (error) {
      this.logger.error(`Error getting formula: ${error.message}`);
      throw error;
    }
  }

  async addFormulaItem(data, organizationId) {
    const { finished_product_type_id, raw_material_type_id, quantity_required } = data;

    if (!finished_product_type_id || !raw_material_type_id || !quantity_required) {
      throw new Error('finished_product_type_id, raw_material_type_id, and quantity_required are required');
    }
    if (quantity_required <= 0) {
      throw new Error('quantity_required must be greater than 0');
    }
    if (finished_product_type_id === raw_material_type_id) {
      throw new Error('A product type cannot be its own raw material');
    }

    try {
      await this._validateFinishedProductType(finished_product_type_id, organizationId);
      await this._validateRawMaterialType(raw_material_type_id, organizationId);

      const hasCycle = await this.formulaRepository.wouldCreateCycle(
        finished_product_type_id, raw_material_type_id, organizationId
      );
      if (hasCycle) {
        throw new Error('Adding this component would create a cycle in the formula');
      }

      return await this.formulaRepository.create({
        finished_product_type_id,
        raw_material_type_id,
        quantity_required,
        organization_id: organizationId,
      });
    } catch (error) {
      this.logger.error(`Error adding formula item: ${error.message}`);
      throw error;
    }
  }

  async updateFormulaItem(formulaId, quantity_required, organizationId) {
    if (!quantity_required || quantity_required <= 0) {
      throw new Error('quantity_required must be greater than 0');
    }
    try {
      const item = await this.formulaRepository.findById(formulaId, 'formula_id');
      if (!item) throw new Error('Formula item not found');
      if (item.organization_id !== organizationId) throw new Error('Access denied');

      return await this.formulaRepository.update(formulaId, { quantity_required }, 'formula_id');
    } catch (error) {
      this.logger.error(`Error updating formula item: ${error.message}`);
      throw error;
    }
  }

  async deleteFormulaItem(formulaId, organizationId) {
    try {
      const item = await this.formulaRepository.findById(formulaId, 'formula_id');
      if (!item) throw new Error('Formula item not found');
      if (item.organization_id !== organizationId) throw new Error('Access denied');

      await this.formulaRepository.delete(formulaId, 'formula_id');
      return true;
    } catch (error) {
      this.logger.error(`Error deleting formula item: ${error.message}`);
      throw error;
    }
  }

  async validateFormulaStock(finishedProductTypeId, quantity, warehouseId, organizationId) {
    try {
      const formula = await this.formulaRepository.findByFinishedProduct(
        finishedProductTypeId, organizationId
      );
      if (formula.length === 0) throw new Error('No formula defined for this product type');

      const materialsCheck = await Promise.all(formula.map(async (item) => {
        const required = item.quantity_required * quantity;

        // Step 1: fetch lot IDs for this raw material type (non-expired)
        const today = new Date().toISOString().split('T')[0];
        const { data: lots } = await this.supabaseClient
          .from('product_lots')
          .select('lot_id')
          .eq('product_type_id', item.raw_material_type_id)
          .eq('organization_id', organizationId)
          .gte('expiration_date', today);
        const lotIds = (lots || []).map(l => l.lot_id);

        if (lotIds.length === 0) {
          return {
            product_type_id: item.raw_material_type_id,
            quantity_required: required,
            current_stock: 0,
            sufficient: false,
          };
        }

        // Step 2: sum stock movements for those lots in the target warehouse
        const { data: movements } = await this.supabaseClient
          .from('stock_movements')
          .select('movement_type, quantity')
          .eq('warehouse_id', warehouseId)
          .eq('organization_id', organizationId)
          .in('lot_id', lotIds);

        const currentStock = (movements || []).reduce((acc, m) => {
          if (m.movement_type === 'entry') return acc + Number(m.quantity);
          if (['exit', 'production'].includes(m.movement_type)) return acc - Number(m.quantity);
          return acc;
        }, 0);

        return {
          product_type_id: item.raw_material_type_id,
          name: item.raw_material_type?.name || item.raw_material_type_id,
          quantity_required: required,
          current_stock: currentStock,
          sufficient: currentStock >= required,
        };
      }));

      const canProduce = materialsCheck.every(m => m.sufficient);
      const finishedProductType = await this.productTypeRepository.findById(finishedProductTypeId, organizationId);

      return {
        finished_product_type: { product_type_id: finishedProductTypeId, name: finishedProductType?.name },
        quantity_to_produce: quantity,
        materials_to_consume: materialsCheck,
        can_produce: canProduce,
      };
    } catch (error) {
      this.logger.error(`Error validating formula stock: ${error.message}`);
      throw error;
    }
  }

  async _validateFinishedProductType(productTypeId, organizationId) {
    const pt = await this.productTypeRepository.findById(productTypeId, organizationId);
    if (!pt) throw new Error('Finished product type not found');
    if (pt.organization_id !== organizationId) throw new Error('Product type does not belong to your organization');
    if (pt.product_type !== 'finished_good') throw new Error('Product type must be finished_good to have a formula');
    return pt;
  }

  async _validateRawMaterialType(productTypeId, organizationId) {
    const pt = await this.productTypeRepository.findById(productTypeId, organizationId);
    if (!pt) throw new Error('Raw material type not found');
    if (pt.organization_id !== organizationId) throw new Error('Raw material type does not belong to your organization');
    if (pt.product_type !== 'raw_material') throw new Error('Component product type must be raw_material');
    return pt;
  }
}

module.exports = { ProductFormulaService };
