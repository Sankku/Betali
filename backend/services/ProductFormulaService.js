const { Logger } = require('../utils/Logger');

class ProductFormulaService {
  constructor(productFormulaRepository, productRepository, warehouseRepository, supabaseClient, logger) {
    this.formulaRepository = productFormulaRepository;
    this.productRepository = productRepository;
    this.warehouseRepository = warehouseRepository;
    this.supabaseClient = supabaseClient;
    this.logger = logger || new Logger('ProductFormulaService');
  }

  async getFormula(finishedProductId, organizationId) {
    try {
      await this._validateFinishedProduct(finishedProductId, organizationId);
      return await this.formulaRepository.findByFinishedProduct(finishedProductId, organizationId);
    } catch (error) {
      this.logger.error(`Error getting formula: ${error.message}`);
      throw error;
    }
  }

  async addFormulaItem(data, organizationId) {
    const { finished_product_id, raw_material_id, quantity_required } = data;

    if (!finished_product_id || !raw_material_id || !quantity_required) {
      throw new Error('finished_product_id, raw_material_id, and quantity_required are required');
    }
    if (quantity_required <= 0) {
      throw new Error('quantity_required must be greater than 0');
    }
    if (finished_product_id === raw_material_id) {
      throw new Error('A product cannot be its own raw material');
    }

    try {
      await this._validateFinishedProduct(finished_product_id, organizationId);
      await this._validateRawMaterial(raw_material_id, organizationId);

      const hasCycle = await this.formulaRepository.wouldCreateCycle(
        finished_product_id, raw_material_id, organizationId
      );
      if (hasCycle) {
        throw new Error('Adding this component would create a cycle in the formula');
      }

      return await this.formulaRepository.create({
        finished_product_id,
        raw_material_id,
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

  async validateFormulaStock(finishedProductId, quantity, warehouseId, organizationId) {
    try {
      const formula = await this.formulaRepository.findByFinishedProduct(
        finishedProductId, organizationId
      );
      if (formula.length === 0) {
        throw new Error('No formula defined for this product');
      }

      const materialsCheck = await Promise.all(
        formula.map(async (item) => {
          const required = item.quantity_required * quantity;

          const { data: movements } = await this.supabaseClient
            .from('stock_movements')
            .select('movement_type, quantity')
            .eq('product_id', item.raw_material_id)
            .eq('warehouse_id', warehouseId)
            .eq('organization_id', organizationId);

          const currentStock = (movements || []).reduce((acc, m) => {
            if (m.movement_type === 'entry') return acc + Number(m.quantity);
            if (['exit', 'production'].includes(m.movement_type)) return acc - Number(m.quantity);
            return acc;
          }, 0);

          return {
            product_id: item.raw_material_id,
            name: item.raw_material?.name || item.raw_material_id,
            quantity_required: required,
            current_stock: currentStock,
            sufficient: currentStock >= required,
          };
        })
      );

      const canProduce = materialsCheck.every(m => m.sufficient);
      const finishedProduct = await this.productRepository.findById(finishedProductId, organizationId);

      return {
        finished_product: { product_id: finishedProductId, name: finishedProduct?.name },
        quantity_to_produce: quantity,
        materials_to_consume: materialsCheck,
        can_produce: canProduce,
      };
    } catch (error) {
      this.logger.error(`Error validating formula stock: ${error.message}`);
      throw error;
    }
  }

  async _validateFinishedProduct(productId, organizationId) {
    const product = await this.productRepository.findById(productId, organizationId);
    if (!product) throw new Error('Finished product not found');
    if (product.organization_id !== organizationId) throw new Error('Product does not belong to your organization');
    if (product.product_type !== 'finished_good') {
      throw new Error('Product must be of type finished_good to have a formula');
    }
    return product;
  }

  async _validateRawMaterial(productId, organizationId) {
    const product = await this.productRepository.findById(productId, organizationId);
    if (!product) throw new Error('Raw material not found');
    if (product.organization_id !== organizationId) throw new Error('Raw material does not belong to your organization');
    if (product.product_type !== 'raw_material') {
      throw new Error('Component product must be of type raw_material');
    }
    return product;
  }
}

module.exports = { ProductFormulaService };
