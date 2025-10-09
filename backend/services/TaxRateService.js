/**
 * Tax rate business logic service
 * Handles tax rate management and calculation business rules
 */
class TaxRateService {
  constructor(taxRateRepository, logger) {
    this.taxRateRepository = taxRateRepository;
    this.logger = logger;
  }

  /**
   * Get all tax rates for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Tax rates
   */
  async getOrganizationTaxRates(organizationId, options = {}) {
    try {
      this.logger.info(`Fetching tax rates for organization: ${organizationId}`);
      
      const taxRates = await this.taxRateRepository.getOrganizationTaxRates(organizationId, options);
      
      this.logger.info(`Found ${taxRates.length} tax rates for organization ${organizationId}`);
      return taxRates;
      
    } catch (error) {
      this.logger.error(`Error fetching tax rates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active tax rates for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Active tax rates
   */
  async getActiveTaxRates(organizationId) {
    try {
      this.logger.info(`Fetching active tax rates for organization: ${organizationId}`);
      
      const taxRates = await this.taxRateRepository.getActiveTaxRates(organizationId);
      
      this.logger.info(`Found ${taxRates.length} active tax rates for organization ${organizationId}`);
      return taxRates;
      
    } catch (error) {
      this.logger.error(`Error fetching active tax rates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get default tax rate for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Default tax rate
   */
  async getDefaultTaxRate(organizationId) {
    try {
      this.logger.info(`Fetching default tax rate for organization: ${organizationId}`);
      
      const taxRate = await this.taxRateRepository.getDefaultTaxRate(organizationId);
      
      this.logger.info(`Default tax rate for organization ${organizationId}: ${taxRate ? 'found' : 'not found'}`);
      return taxRate;
      
    } catch (error) {
      this.logger.error(`Error fetching default tax rate: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get tax rate by ID
   * @param {string} taxRateId - Tax rate ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Tax rate
   */
  async getTaxRateById(taxRateId, organizationId) {
    try {
      this.logger.info(`Fetching tax rate: ${taxRateId} for organization: ${organizationId}`);
      
      const taxRate = await this.taxRateRepository.findById(taxRateId, organizationId);
      
      if (!taxRate) {
        return null;
      }
      
      this.logger.info(`Tax rate found: ${taxRateId}`);
      return taxRate;
      
    } catch (error) {
      this.logger.error(`Error fetching tax rate ${taxRateId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new tax rate
   * @param {Object} taxRateData - Tax rate data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Created tax rate
   */
  async createTaxRate(taxRateData, organizationId) {
    try {
      this.logger.info(`Creating new tax rate for organization: ${organizationId}`, { taxRateData });
      
      // Validate required fields
      this.validateTaxRateData(taxRateData);
      
      // Check name uniqueness
      const isNameUnique = await this.taxRateRepository.isNameUnique(taxRateData.name, organizationId);
      if (!isNameUnique) {
        throw new Error('Tax rate name must be unique within the organization');
      }
      
      const taxRateToCreate = {
        ...taxRateData,
        organization_id: organizationId,
        is_active: taxRateData.is_active !== undefined ? taxRateData.is_active : true, // Default to active
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const createdTaxRate = await this.taxRateRepository.createTaxRate(taxRateToCreate);
      
      this.logger.info(`Tax rate created: ${createdTaxRate.tax_rate_id}`);
      return createdTaxRate;
      
    } catch (error) {
      this.logger.error(`Error creating tax rate: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing tax rate
   * @param {string} taxRateId - Tax rate ID
   * @param {Object} updateData - Update data
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Updated tax rate
   */
  async updateTaxRate(taxRateId, updateData, organizationId) {
    try {
      this.logger.info(`Updating tax rate: ${taxRateId} for organization: ${organizationId}`, { updateData });
      
      // Check if tax rate exists and belongs to organization
      const existingTaxRate = await this.taxRateRepository.findById(taxRateId, organizationId);
      if (!existingTaxRate) {
        throw new Error('Tax rate not found');
      }
      
      // Validate update data if provided
      if (updateData.name || updateData.rate !== undefined) {
        this.validateTaxRateData(updateData, true);
      }
      
      // Check name uniqueness if name is being updated
      if (updateData.name && updateData.name !== existingTaxRate.name) {
        const isNameUnique = await this.taxRateRepository.isNameUnique(updateData.name, organizationId, taxRateId);
        if (!isNameUnique) {
          throw new Error('Tax rate name must be unique within the organization');
        }
      }
      
      const updatedTaxRate = await this.taxRateRepository.updateTaxRate(taxRateId, organizationId, updateData);
      
      this.logger.info(`Tax rate updated: ${taxRateId}`);
      return updatedTaxRate;
      
    } catch (error) {
      this.logger.error(`Error updating tax rate ${taxRateId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a tax rate
   * @param {string} taxRateId - Tax rate ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTaxRate(taxRateId, organizationId) {
    try {
      this.logger.info(`Deleting tax rate: ${taxRateId} for organization: ${organizationId}`);
      
      // Check if tax rate exists and belongs to organization
      const existingTaxRate = await this.taxRateRepository.findById(taxRateId, organizationId);
      if (!existingTaxRate) {
        throw new Error('Tax rate not found');
      }
      
      await this.taxRateRepository.deleteTaxRate(taxRateId, organizationId);
      
      this.logger.info(`Tax rate deleted: ${taxRateId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Error deleting tax rate ${taxRateId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate tax rate data
   * @param {Object} taxRateData - Tax rate data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @throws {Error} If validation fails
   */
  validateTaxRateData(taxRateData, isUpdate = false) {
    if (!isUpdate) {
      // Required fields for creation
      const required = ['name', 'rate'];
      
      for (const field of required) {
        if (!taxRateData[field] && taxRateData[field] !== 0) {
          throw new Error(`Required field: ${field}`);
        }
      }
    }
    
    // Validate name
    if (taxRateData.name !== undefined) {
      if (typeof taxRateData.name !== 'string' || taxRateData.name.trim().length === 0) {
        throw new Error('Tax rate name must be a non-empty string');
      }
      if (taxRateData.name.length > 255) {
        throw new Error('Tax rate name must be 255 characters or less');
      }
    }
    
    // Validate rate
    if (taxRateData.rate !== undefined) {
      if (typeof taxRateData.rate !== 'number') {
        throw new Error('Tax rate must be a number');
      }
      if (taxRateData.rate < 0 || taxRateData.rate > 1) {
        throw new Error('Tax rate must be between 0 and 1 (e.g., 0.165 for 16.5%)');
      }
    }

    // Validate description if provided
    if (taxRateData.description !== undefined && taxRateData.description !== null) {
      if (typeof taxRateData.description !== 'string') {
        throw new Error('Tax rate description must be a string');
      }
      if (taxRateData.description.length > 500) {
        throw new Error('Tax rate description must be 500 characters or less');
      }
    }

    // Validate is_active if provided
    if (taxRateData.is_active !== undefined) {
      if (typeof taxRateData.is_active !== 'boolean') {
        throw new Error('is_active must be a boolean');
      }
    }
  }
}

module.exports = { TaxRateService };