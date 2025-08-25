/**
 * Supplier business logic service
 * Handles business rules and validation for supplier management
 */
class SupplierService {
  constructor(supplierRepository, logger) {
    this.repository = supplierRepository;
    this.logger = logger;
  }

  /**
   * Get all suppliers for an organization with filtering and pagination
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOrganizationSuppliers(organizationId, options = {}) {
    try {
      this.logger.info('Fetching organization suppliers', { organizationId, options });
      return await this.repository.findByOrganization(organizationId, options);
    } catch (error) {
      this.logger.error(`Error fetching organization suppliers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get supplier by ID with organization validation
   * @param {string} supplierId - Supplier ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getSupplierById(supplierId, organizationId) {
    try {
      this.logger.info(`Fetching supplier: ${supplierId}`);
      const supplier = await this.repository.findById(supplierId);
      
      if (!supplier) {
        const error = new Error('Supplier not found');
        error.status = 404;
        throw error;
      }
      
      // Validate organization access
      if (supplier.organization_id !== organizationId) {
        const error = new Error('Access denied: Supplier does not belong to your organization');
        error.status = 403;
        throw error;
      }
      
      return supplier;
    } catch (error) {
      this.logger.error(`Error fetching supplier ${supplierId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get supplier by CUIT within organization
   * @param {string} cuit - Supplier CUIT
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async getSupplierByCuit(cuit, organizationId) {
    try {
      this.logger.info(`Fetching supplier by CUIT: ${cuit} in organization: ${organizationId}`);
      return await this.repository.findByCuit(cuit, organizationId);
    } catch (error) {
      this.logger.error(`Error fetching supplier by CUIT ${cuit}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get preferred suppliers for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getPreferredSuppliers(organizationId) {
    try {
      this.logger.info(`Fetching preferred suppliers for organization: ${organizationId}`);
      return await this.repository.findPreferredByOrganization(organizationId);
    } catch (error) {
      this.logger.error(`Error fetching preferred suppliers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get suppliers by business type
   * @param {string} organizationId - Organization ID
   * @param {string} businessType - Business type
   * @returns {Promise<Array>}
   */
  async getSuppliersByBusinessType(organizationId, businessType) {
    try {
      this.logger.info(`Fetching suppliers by business type: ${businessType} in organization: ${organizationId}`);
      return await this.repository.findByBusinessType(organizationId, businessType);
    } catch (error) {
      this.logger.error(`Error fetching suppliers by business type: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new supplier
   * @param {Object} supplierData - Supplier data
   * @returns {Promise<Object>}
   */
  async createSupplier(supplierData) {
    try {
      // Validate business rules
      await this.validateSupplierCreation(supplierData);
      
      this.logger.info('Creating new supplier', { 
        name: supplierData.name,
        cuit: supplierData.cuit,
        organizationId: supplierData.organization_id,
        businessType: supplierData.business_type
      });
      
      // Add timestamps and format data
      const supplierToCreate = {
        ...supplierData,
        // Format CUIT
        cuit: this.formatCuit(supplierData.cuit),
        // Set defaults
        is_active: supplierData.is_active !== undefined ? supplierData.is_active : true,
        is_preferred: supplierData.is_preferred !== undefined ? supplierData.is_preferred : false,
        // Add timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const newSupplier = await this.repository.create(supplierToCreate);
      
      this.logger.info('Supplier created successfully', { 
        supplierId: newSupplier.supplier_id,
        name: newSupplier.name,
        cuit: newSupplier.cuit,
        businessType: newSupplier.business_type
      });
      
      return newSupplier;
    } catch (error) {
      this.logger.error(`Error creating supplier: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update supplier with organization validation
   * @param {string} supplierId - Supplier ID
   * @param {Object} supplierData - Supplier data to update
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async updateSupplier(supplierId, supplierData, organizationId) {
    try {
      // Check if supplier exists and belongs to organization
      const existingSupplier = await this.getSupplierById(supplierId, organizationId);
      
      // Validate business rules for update
      await this.validateSupplierUpdate(existingSupplier, supplierData, organizationId);
      
      this.logger.info(`Updating supplier: ${supplierId}`, { 
        fieldsToUpdate: Object.keys(supplierData) 
      });
      
      // Format and prepare data for update
      const dataToUpdate = {
        ...supplierData,
        updated_at: new Date().toISOString()
      };

      // Format CUIT if provided
      if (dataToUpdate.cuit) {
        dataToUpdate.cuit = this.formatCuit(dataToUpdate.cuit);
      }
      
      const updatedSupplier = await this.repository.update(supplierId, dataToUpdate);
      
      this.logger.info('Supplier updated successfully', { supplierId });
      
      return updatedSupplier;
    } catch (error) {
      this.logger.error(`Error updating supplier ${supplierId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete supplier with organization validation
   * @param {string} supplierId - Supplier ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteSupplier(supplierId, organizationId) {
    try {
      // Check if supplier exists and belongs to organization
      await this.getSupplierById(supplierId, organizationId);
      
      this.logger.info(`Deleting supplier: ${supplierId}`);
      
      await this.repository.delete(supplierId);
      
      this.logger.info('Supplier deleted successfully', { supplierId });
    } catch (error) {
      this.logger.error(`Error deleting supplier ${supplierId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft delete supplier (deactivate) with organization validation
   * @param {string} supplierId - Supplier ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async deactivateSupplier(supplierId, organizationId) {
    try {
      this.logger.info(`Deactivating supplier: ${supplierId}`);
      return await this.updateSupplier(supplierId, { is_active: false }, organizationId);
    } catch (error) {
      this.logger.error(`Error deactivating supplier ${supplierId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reactivate supplier with organization validation
   * @param {string} supplierId - Supplier ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async reactivateSupplier(supplierId, organizationId) {
    try {
      this.logger.info(`Reactivating supplier: ${supplierId}`);
      return await this.updateSupplier(supplierId, { is_active: true }, organizationId);
    } catch (error) {
      this.logger.error(`Error reactivating supplier ${supplierId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Toggle preferred status with organization validation
   * @param {string} supplierId - Supplier ID
   * @param {boolean} isPreferred - Preferred status
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async setPreferredStatus(supplierId, isPreferred, organizationId) {
    try {
      this.logger.info(`Setting supplier ${supplierId} preferred status to: ${isPreferred}`);
      return await this.updateSupplier(supplierId, { is_preferred: isPreferred }, organizationId);
    } catch (error) {
      this.logger.error(`Error setting preferred status for supplier ${supplierId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search suppliers
   * @param {string} organizationId - Organization ID
   * @param {string} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async searchSuppliers(organizationId, query, options = {}) {
    try {
      this.logger.info(`Searching suppliers in organization ${organizationId} with query: ${query}`);
      
      const searchOptions = {
        ...options,
        search: query,
        organization_id: organizationId
      };
      
      return await this.repository.findAll(searchOptions);
    } catch (error) {
      this.logger.error(`Error searching suppliers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get suppliers by branch
   * @param {string} organizationId - Organization ID
   * @param {string} branchId - Branch ID
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async getSuppliersByBranch(organizationId, branchId, options = {}) {
    try {
      this.logger.info(`Fetching suppliers for branch ${branchId} in organization ${organizationId}`);
      
      const branchOptions = {
        ...options,
        organization_id: organizationId,
        branch_id: branchId
      };
      
      return await this.repository.findAll(branchOptions);
    } catch (error) {
      this.logger.error(`Error fetching suppliers by branch: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get supplier statistics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getSupplierStats(organizationId) {
    try {
      this.logger.info(`Getting supplier statistics for organization: ${organizationId}`);
      
      const stats = await this.repository.getStatsByOrganization(organizationId);
      
      return {
        ...stats,
        organization_id: organizationId,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error getting supplier statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate supplier creation business rules
   * @private
   */
  async validateSupplierCreation(supplierData) {
    // Validate required fields
    if (!supplierData.name || !supplierData.cuit || !supplierData.email) {
      const error = new Error('Name, CUIT, and email are required');
      error.status = 400;
      throw error;
    }

    // Validate organization requirement
    if (!supplierData.organization_id) {
      const error = new Error('Organization ID is required');
      error.status = 400;
      throw error;
    }

    // Validate CUIT format
    if (!this.isValidCuit(supplierData.cuit)) {
      const error = new Error('Invalid CUIT format');
      error.status = 400;
      throw error;
    }

    // Validate email format
    if (!this.isValidEmail(supplierData.email)) {
      const error = new Error('Invalid email format');
      error.status = 400;
      throw error;
    }

    // Validate business type if provided
    if (supplierData.business_type && !this.isValidBusinessType(supplierData.business_type)) {
      const error = new Error('Invalid business type');
      error.status = 400;
      throw error;
    }

    // Validate credit limit if provided
    if (supplierData.credit_limit !== undefined && supplierData.credit_limit < 0) {
      const error = new Error('Credit limit cannot be negative');
      error.status = 400;
      throw error;
    }

    // Validate website URL if provided
    if (supplierData.website && !this.isValidUrl(supplierData.website)) {
      const error = new Error('Invalid website URL format');
      error.status = 400;
      throw error;
    }

    // Check if CUIT already exists in organization
    const existingSupplierByCuit = await this.repository.findByCuit(
      supplierData.cuit, 
      supplierData.organization_id
    );
    if (existingSupplierByCuit) {
      const error = new Error('A supplier with this CUIT already exists in your organization');
      error.status = 409;
      throw error;
    }

    // Check if email already exists in organization
    const existingSupplierByEmail = await this.repository.findByEmail(
      supplierData.email, 
      supplierData.organization_id
    );
    if (existingSupplierByEmail) {
      const error = new Error('A supplier with this email already exists in your organization');
      error.status = 409;
      throw error;
    }
  }

  /**
   * Validate supplier update business rules
   * @private
   */
  async validateSupplierUpdate(existingSupplier, supplierData, _organizationId) {
    // Validate CUIT format if being updated
    if (supplierData.cuit && !this.isValidCuit(supplierData.cuit)) {
      const error = new Error('Invalid CUIT format');
      error.status = 400;
      throw error;
    }

    // Validate email format if being updated
    if (supplierData.email && !this.isValidEmail(supplierData.email)) {
      const error = new Error('Invalid email format');
      error.status = 400;
      throw error;
    }

    // Validate business type if being updated
    if (supplierData.business_type && !this.isValidBusinessType(supplierData.business_type)) {
      const error = new Error('Invalid business type');
      error.status = 400;
      throw error;
    }

    // Validate credit limit if being updated
    if (supplierData.credit_limit !== undefined && supplierData.credit_limit < 0) {
      const error = new Error('Credit limit cannot be negative');
      error.status = 400;
      throw error;
    }

    // Validate website URL if being updated
    if (supplierData.website && !this.isValidUrl(supplierData.website)) {
      const error = new Error('Invalid website URL format');
      error.status = 400;
      throw error;
    }

    // Check if CUIT is being changed and if it conflicts
    if (supplierData.cuit && supplierData.cuit !== existingSupplier.cuit) {
      const supplierWithCuit = await this.repository.findByCuit(
        supplierData.cuit, 
        existingSupplier.organization_id
      );
      if (supplierWithCuit && supplierWithCuit.supplier_id !== existingSupplier.supplier_id) {
        const error = new Error('A supplier with this CUIT already exists in your organization');
        error.status = 409;
        throw error;
      }
    }

    // Check if email is being changed and if it conflicts
    if (supplierData.email && supplierData.email !== existingSupplier.email) {
      const supplierWithEmail = await this.repository.findByEmail(
        supplierData.email, 
        existingSupplier.organization_id
      );
      if (supplierWithEmail && supplierWithEmail.supplier_id !== existingSupplier.supplier_id) {
        const error = new Error('A supplier with this email already exists in your organization');
        error.status = 409;
        throw error;
      }
    }
  }

  /**
   * Validate CUIT format (same as client service)
   * @private
   */
  isValidCuit(cuit) {
    if (!cuit || typeof cuit !== 'string') return false;
    
    // Remove any non-digit characters
    const cleanCuit = cuit.replace(/\D/g, '');
    
    // CUIT should have 11 digits
    if (cleanCuit.length !== 11) return false;
    
    // Basic checksum validation (Argentina CUIT algorithm)
    const digits = cleanCuit.split('').map(Number);
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * multipliers[i];
    }
    
    const checkDigit = 11 - (sum % 11);
    const finalCheckDigit = checkDigit === 11 ? 0 : checkDigit === 10 ? 9 : checkDigit;
    
    return finalCheckDigit === digits[10];
  }

  /**
   * Validate email format
   * @private
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate business type
   * @private
   */
  isValidBusinessType(businessType) {
    const validTypes = [
      'Manufacturer',
      'Distributor', 
      'Wholesaler',
      'Retailer',
      'Importer',
      'Exporter',
      'Service Provider',
      'Contractor',
      'Other'
    ];
    return validTypes.includes(businessType);
  }

  /**
   * Validate URL format
   * @private
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format CUIT for storage
   * @private
   */
  formatCuit(cuit) {
    // Remove all non-digits
    const cleaned = cuit.replace(/\D/g, '');
    
    // Format as XX-XXXXXXXX-X if 11 digits
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`;
    }
    
    // Return as-is if already formatted or invalid length
    return cuit;
  }
}

module.exports = SupplierService;