const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing tax rates
 * Handles configurable tax rates for organizations
 */
class TaxRateRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'tax_rates');
    this.logger = new Logger('TaxRateRepository');
  }

  /**
   * Get default tax rate for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async getDefaultTaxRate(organizationId) {
    try {
      this.logger.info('Getting default tax rate', { organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error getting default tax rate', { error: error.message });
        
        // Handle table not existing
        if (error.message && error.message.includes('relation "public.tax_rates" does not exist')) {
          this.logger.warn('Tax rates table does not exist, returning null');
          return null;
        }
        
        throw error;
      }

      this.logger.info('Default tax rate retrieved', { 
        organizationId,
        taxRateFound: !!data,
        rate: data?.rate 
      });

      return data;
    } catch (error) {
      this.logger.error('Error getting default tax rate', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting default tax rate: ${error.message}`);
    }
  }

  /**
   * Get all active tax rates for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getActiveTaxRates(organizationId) {
    try {
      this.logger.info('Getting active tax rates', { organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        this.logger.error('Error getting active tax rates', { error: error.message });
        throw error;
      }

      this.logger.info('Active tax rates retrieved', { 
        organizationId,
        taxRateCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting active tax rates', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting active tax rates: ${error.message}`);
    }
  }

  /**
   * Create a new tax rate
   * @param {Object} taxRateData - Tax rate data
   * @returns {Promise<Object>}
   */
  async createTaxRate(taxRateData) {
    try {
      this.logger.info('Creating tax rate', { 
        name: taxRateData.name,
        organizationId: taxRateData.organization_id 
      });

      // Validate tax rate data
      if (!taxRateData.name || !taxRateData.organization_id || taxRateData.rate === undefined) {
        throw new Error('Missing required fields: name, organization_id, rate');
      }

      if (taxRateData.rate < 0 || taxRateData.rate > 1) {
        throw new Error('Tax rate must be between 0 and 1 (e.g., 0.165 for 16.5%)');
      }

      const now = new Date().toISOString();
      const taxRateToCreate = {
        ...taxRateData,
        created_at: now,
        updated_at: now,
        is_active: taxRateData.is_active !== undefined ? taxRateData.is_active : true
      };

      const { data, error } = await this.client
        .from(this.table)
        .insert([taxRateToCreate])
        .select()
        .single();

      if (error) {
        this.logger.error('Error creating tax rate', { error: error.message });
        throw error;
      }

      this.logger.info('Tax rate created', { 
        taxRateId: data.tax_rate_id,
        name: taxRateData.name 
      });

      return data;
    } catch (error) {
      this.logger.error('Error creating tax rate', { 
        error: error.message,
        name: taxRateData.name 
      });
      throw new Error(`Error creating tax rate: ${error.message}`);
    }
  }

  /**
   * Update a tax rate
   * @param {string} taxRateId - Tax rate ID
   * @param {string} organizationId - Organization ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async updateTaxRate(taxRateId, organizationId, updateData) {
    try {
      this.logger.info('Updating tax rate', { taxRateId, organizationId });

      // Validate rate if being updated
      if (updateData.rate !== undefined && (updateData.rate < 0 || updateData.rate > 1)) {
        throw new Error('Tax rate must be between 0 and 1 (e.g., 0.165 for 16.5%)');
      }

      const updateToApply = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from(this.table)
        .update(updateToApply)
        .eq('tax_rate_id', taxRateId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error updating tax rate', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Tax rate not found or access denied');
      }

      this.logger.info('Tax rate updated', { taxRateId });
      return data;
    } catch (error) {
      this.logger.error('Error updating tax rate', { 
        error: error.message,
        taxRateId 
      });
      throw new Error(`Error updating tax rate: ${error.message}`);
    }
  }

  /**
   * Delete a tax rate
   * @param {string} taxRateId - Tax rate ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async deleteTaxRate(taxRateId, organizationId) {
    try {
      this.logger.info('Deleting tax rate', { taxRateId, organizationId });

      // Check if tax rate is being used by any products
      const { data: productTaxGroups, error: checkError } = await this.client
        .from('product_tax_groups')
        .select('product_tax_group_id')
        .eq('tax_rate_id', taxRateId)
        .eq('organization_id', organizationId)
        .limit(1);

      if (checkError) {
        this.logger.error('Error checking tax rate usage', { error: checkError.message });
        throw checkError;
      }

      if (productTaxGroups && productTaxGroups.length > 0) {
        throw new Error('Cannot delete tax rate: it is currently assigned to products');
      }

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('tax_rate_id', taxRateId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error deleting tax rate', { error: error.message });
        throw error;
      }

      if (!data) {
        throw new Error('Tax rate not found or access denied');
      }

      this.logger.info('Tax rate deleted', { taxRateId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting tax rate', { 
        error: error.message,
        taxRateId 
      });
      throw new Error(`Error deleting tax rate: ${error.message}`);
    }
  }

  /**
   * Get all tax rates for an organization (including inactive)
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOrganizationTaxRates(organizationId, options = {}) {
    try {
      this.logger.info('Getting organization tax rates', { organizationId });

      let query = this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId);

      // Apply filters
      if (options.is_active !== undefined) {
        query = query.eq('is_active', options.is_active);
      }

      // Apply ordering
      query = query.order('name', { ascending: true });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error getting organization tax rates', { error: error.message });
        
        // Handle table not existing (return empty array instead of throwing)
        if (error.message && error.message.includes('relation "public.tax_rates" does not exist')) {
          this.logger.warn('Tax rates table does not exist, returning empty array');
          return [];
        }
        
        throw error;
      }

      this.logger.info('Organization tax rates retrieved', { 
        organizationId,
        taxRateCount: data.length 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting organization tax rates', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting organization tax rates: ${error.message}`);
    }
  }

  /**
   * Find tax rate by ID
   * @param {string} taxRateId - Tax rate ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async findById(taxRateId, organizationId) {
    try {
      this.logger.info('Finding tax rate by ID', { taxRateId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('tax_rate_id', taxRateId)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error('Error finding tax rate', { error: error.message });
        throw error;
      }

      this.logger.info('Tax rate found', { 
        taxRateId,
        found: !!data 
      });

      return data;
    } catch (error) {
      this.logger.error('Error finding tax rate by ID', { 
        error: error.message,
        taxRateId 
      });
      throw new Error(`Error finding tax rate: ${error.message}`);
    }
  }

  /**
   * Check if tax rate name is unique within organization
   * @param {string} name - Tax rate name
   * @param {string} organizationId - Organization ID
   * @param {string|null} excludeId - Tax rate ID to exclude (for updates)
   * @returns {Promise<boolean>}
   */
  async isNameUnique(name, organizationId, excludeId = null) {
    try {
      let query = this.client
        .from(this.table)
        .select('tax_rate_id')
        .eq('organization_id', organizationId)
        .ilike('name', name);

      if (excludeId) {
        query = query.neq('tax_rate_id', excludeId);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        this.logger.error('Error checking name uniqueness', { error: error.message });
        throw error;
      }

      return !data || data.length === 0;
    } catch (error) {
      this.logger.error('Error checking tax rate name uniqueness', { 
        error: error.message,
        name 
      });
      throw new Error(`Error checking name uniqueness: ${error.message}`);
    }
  }
}

module.exports = TaxRateRepository;