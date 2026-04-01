const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing product tax group assignments
 * Links products to their applicable tax rates
 */
class ProductTaxGroupRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'product_tax_groups');
    this.logger = new Logger('ProductTaxGroupRepository');
  }

  /**
   * Get tax rates for products
   * @param {Array<string>} productIds - Product IDs
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getProductTaxRates(productIds, organizationId) {
    try {
      this.logger.info('Getting product tax rates', { 
        productCount: productIds.length,
        organizationId 
      });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          product_type_id,
          tax_rates!product_tax_groups_tax_rate_id_fkey(
            tax_rate_id,
            name,
            rate,
            is_inclusive,
            is_active
          )
        `)
        .in('product_type_id', productIds)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error getting product tax rates', { error: error.message });
        throw error;
      }

      // Flatten the result to include tax rate details at the top level
      const flattenedData = [];
      if (data) {
        data.forEach(item => {
          if (item.tax_rates && item.tax_rates.is_active) {
            flattenedData.push({
              product_type_id: item.product_type_id,
              tax_rate_id: item.tax_rates.tax_rate_id,
              name: item.tax_rates.name,
              rate: item.tax_rates.rate,
              is_inclusive: item.tax_rates.is_inclusive
            });
          }
        });
      }

      this.logger.info('Product tax rates retrieved', { 
        organizationId,
        taxAssignmentCount: flattenedData.length 
      });

      return flattenedData;
    } catch (error) {
      this.logger.error('Error getting product tax rates', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting product tax rates: ${error.message}`);
    }
  }

  /**
   * Get tax assignments for a specific product
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getProductTaxAssignments(productId, organizationId) {
    try {
      this.logger.info('Getting product tax assignments', { productId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          tax_rates!product_tax_groups_tax_rate_id_fkey(
            tax_rate_id,
            name,
            rate,
            is_inclusive,
            is_active
          )
        `)
        .eq('product_type_id', productId)
        .eq('organization_id', organizationId);

      if (error) {
        this.logger.error('Error getting product tax assignments', { error: error.message });
        throw error;
      }

      this.logger.info('Product tax assignments retrieved', { 
        productId,
        assignmentCount: data?.length || 0 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting product tax assignments', { 
        error: error.message,
        productId 
      });
      throw new Error(`Error getting product tax assignments: ${error.message}`);
    }
  }

  /**
   * Assign tax rate to a product
   * @param {Object} assignmentData - Tax assignment data
   * @returns {Promise<Object>}
   */
  async assignTaxToProduct(assignmentData) {
    try {
      this.logger.info('Assigning tax to product', {
        productId: assignmentData.product_type_id,
        taxRateId: assignmentData.tax_rate_id,
        organizationId: assignmentData.organization_id
      });

      // Validate required fields
      if (!assignmentData.product_type_id || !assignmentData.tax_rate_id || !assignmentData.organization_id) {
        throw new Error('Missing required fields: product_type_id, tax_rate_id, organization_id');
      }

      // Check if assignment already exists
      const existingAssignment = await this.findExistingAssignment(
        assignmentData.product_type_id,
        assignmentData.tax_rate_id,
        assignmentData.organization_id
      );

      if (existingAssignment) {
        throw new Error('Tax rate is already assigned to this product');
      }

      const assignmentToCreate = {
        ...assignmentData,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([assignmentToCreate])
        .select()
        .single();

      if (error) {
        this.logger.error('Error assigning tax to product', { error: error.message });
        throw error;
      }

      this.logger.info('Tax assigned to product successfully', {
        assignmentId: data.product_tax_group_id,
        productId: assignmentData.product_type_id
      });

      return data;
    } catch (error) {
      this.logger.error('Error assigning tax to product', {
        error: error.message,
        productId: assignmentData.product_type_id 
      });
      throw new Error(`Error assigning tax to product: ${error.message}`);
    }
  }

  /**
   * Remove tax assignment from a product
   * @param {string} assignmentId - Assignment ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async removeTaxFromProduct(assignmentId, organizationId) {
    try {
      this.logger.info('Removing tax from product', { assignmentId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('product_tax_group_id', assignmentId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error removing tax from product', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Tax assignment not found or access denied');
      }

      this.logger.info('Tax removed from product successfully', { assignmentId });
      return true;
    } catch (error) {
      this.logger.error('Error removing tax from product', { 
        error: error.message,
        assignmentId 
      });
      throw new Error(`Error removing tax from product: ${error.message}`);
    }
  }

  /**
   * Bulk assign tax rate to multiple products
   * @param {string} taxRateId - Tax rate ID
   * @param {Array<string>} productIds - Product IDs
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async bulkAssignTaxToProducts(taxRateId, productIds, organizationId) {
    try {
      this.logger.info('Bulk assigning tax to products', { 
        taxRateId,
        productCount: productIds.length,
        organizationId 
      });

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return [];
      }

      // Check for existing assignments to avoid duplicates
      const existingAssignments = await this.getExistingAssignments(taxRateId, productIds, organizationId);
      const existingProductIds = existingAssignments.map(a => a.product_type_id);
      const newProductIds = productIds.filter(pid => !existingProductIds.includes(pid));

      if (newProductIds.length === 0) {
        this.logger.info('All products already have this tax assignment');
        return [];
      }

      const now = new Date().toISOString();
      const assignments = newProductIds.map(productId => ({
        organization_id: organizationId,
        product_type_id: productId,
        tax_rate_id: taxRateId,
        created_at: now
      }));

      const { data, error } = await this.client
        .from(this.table)
        .insert(assignments)
        .select();

      if (error) {
        this.logger.error('Error bulk assigning tax to products', { error: error.message });
        throw error;
      }

      this.logger.info('Tax bulk assigned to products successfully', { 
        taxRateId,
        assignedCount: data?.length || 0 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error bulk assigning tax to products', { 
        error: error.message,
        taxRateId,
        productCount: productIds.length 
      });
      throw new Error(`Error bulk assigning tax to products: ${error.message}`);
    }
  }

  /**
   * Remove all tax assignments for a product
   * @param {string} productId - Product ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>}
   */
  async removeAllProductTaxes(productId, organizationId) {
    try {
      this.logger.info('Removing all tax assignments for product', { productId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('product_type_id', productId)
        .eq('organization_id', organizationId)
        .select();

      if (error) {
        this.logger.error('Error removing all product taxes', { error: error.message });
        throw error;
      }

      const removedCount = data?.length || 0;

      this.logger.info('All tax assignments removed from product', { 
        productId,
        removedCount 
      });

      return removedCount;
    } catch (error) {
      this.logger.error('Error removing all product taxes', { 
        error: error.message,
        productId 
      });
      throw new Error(`Error removing all product taxes: ${error.message}`);
    }
  }

  /**
   * Get all tax assignments for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOrganizationTaxAssignments(organizationId, options = {}) {
    try {
      this.logger.info('Getting organization tax assignments', { organizationId });

      let query = this.client
        .from(this.table)
        .select(`
          *,
          product_types!product_tax_groups_product_type_id_fkey(product_type_id, name, sku),
          tax_rates!product_tax_groups_tax_rate_id_fkey(tax_rate_id, name, rate)
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (options.product_type_id) {
        query = query.eq('product_type_id', options.product_type_id);
      }

      if (options.tax_rate_id) {
        query = query.eq('tax_rate_id', options.tax_rate_id);
      }

      // Apply ordering
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error getting organization tax assignments', { error: error.message });
        throw error;
      }

      this.logger.info('Organization tax assignments retrieved', { 
        organizationId,
        assignmentCount: data?.length || 0 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting organization tax assignments', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting organization tax assignments: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Find existing tax assignment
   * @private
   */
  async findExistingAssignment(productId, taxRateId, organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('product_tax_group_id')
        .eq('product_type_id', productId)
        .eq('tax_rate_id', taxRateId)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Error finding existing assignment', { error: error.message });
      throw error;
    }
  }

  /**
   * Get existing assignments for bulk operations
   * @private
   */
  async getExistingAssignments(taxRateId, productIds, organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('product_type_id')
        .eq('tax_rate_id', taxRateId)
        .eq('organization_id', organizationId)
        .in('product_type_id', productIds);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error getting existing assignments', { error: error.message });
      throw error;
    }
  }
}

module.exports = ProductTaxGroupRepository;