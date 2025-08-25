const { BaseRepository } = require('./BaseRepository');

/**
 * Supplier repository extending BaseRepository
 * Handles supplier-specific database operations with multi-tenant support
 */
class SupplierRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'suppliers');
  }

  /**
   * Find supplier by ID
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<Object|null>}
   */
  async findById(supplierId) {
    return super.findById(supplierId, 'supplier_id');
  }

  /**
   * Find supplier by CUIT
   * @param {string} cuit - Supplier CUIT
   * @param {string} organizationId - Organization ID for multi-tenant scoping
   * @returns {Promise<Object|null>}
   */
  async findByCuit(cuit, organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('cuit', cuit)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding supplier by CUIT: ${error.message}`);
    }
  }

  /**
   * Find supplier by email
   * @param {string} email - Supplier email
   * @param {string} organizationId - Organization ID for multi-tenant scoping
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email, organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding supplier by email: ${error.message}`);
    }
  }

  /**
   * Find all suppliers with filtering and pagination for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByOrganization(organizationId, options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', organizationId);

      // Apply filters
      if (options.branch_id) {
        query = query.eq('branch_id', options.branch_id);
      }

      if (options.is_active !== undefined) {
        query = query.eq('is_active', options.is_active);
      }

      if (options.is_preferred !== undefined) {
        query = query.eq('is_preferred', options.is_preferred);
      }

      if (options.business_type) {
        query = query.eq('business_type', options.business_type);
      }

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,cuit.ilike.%${options.search}%,contact_person.ilike.%${options.search}%`);
      }

      // Apply ordering
      if (options.orderBy) {
        const ascending = options.orderDirection !== 'desc';
        query = query.order(options.orderBy, { ascending });
      } else {
        // Default ordering: preferred first, then by name
        query = query.order('is_preferred', { ascending: false })
                     .order('name', { ascending: true });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding suppliers by organization: ${error.message}`);
    }
  }

  /**
   * Find all suppliers with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAll(options = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*');

      // Apply filters
      if (options.organization_id) {
        query = query.eq('organization_id', options.organization_id);
      }

      if (options.branch_id) {
        query = query.eq('branch_id', options.branch_id);
      }

      if (options.is_active !== undefined) {
        query = query.eq('is_active', options.is_active);
      }

      if (options.is_preferred !== undefined) {
        query = query.eq('is_preferred', options.is_preferred);
      }

      if (options.business_type) {
        query = query.eq('business_type', options.business_type);
      }

      // Apply search
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,cuit.ilike.%${options.search}%,contact_person.ilike.%${options.search}%`);
      }

      // Apply ordering
      if (options.orderBy) {
        const ascending = options.orderDirection !== 'desc';
        query = query.order(options.orderBy, { ascending });
      } else {
        // Default ordering: preferred first, then by name
        query = query.order('is_preferred', { ascending: false })
                     .order('name', { ascending: true });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error finding suppliers: ${error.message}`);
    }
  }

  /**
   * Get preferred suppliers for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async findPreferredByOrganization(organizationId) {
    return this.findByOrganization(organizationId, { 
      is_preferred: true, 
      is_active: true 
    });
  }

  /**
   * Get suppliers by business type
   * @param {string} organizationId - Organization ID
   * @param {string} businessType - Business type
   * @returns {Promise<Array>}
   */
  async findByBusinessType(organizationId, businessType) {
    return this.findByOrganization(organizationId, { 
      business_type: businessType, 
      is_active: true 
    });
  }

  /**
   * Create new supplier
   * @param {Object} supplierData - Supplier data
   * @returns {Promise<Object>}
   */
  async create(supplierData) {
    try {
      // Ensure CUIT is properly formatted
      if (supplierData.cuit) {
        supplierData.cuit = this._formatCuit(supplierData.cuit);
      }

      const { data, error } = await this.client
        .from(this.table)
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('cuit')) {
          throw new Error('A supplier with this CUIT already exists in your organization');
        }
        if (error.message.includes('email')) {
          throw new Error('A supplier with this email already exists in your organization');
        }
        throw new Error('Supplier data violates unique constraint');
      }
      
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid organization or branch reference');
      }

      if (error.code === '23514') { // Check constraint violation
        if (error.message.includes('cuit_format')) {
          throw new Error('CUIT format is invalid. Please use XX-XXXXXXXX-X format');
        }
        if (error.message.includes('email_format')) {
          throw new Error('Email format is invalid');
        }
      }

      throw new Error(`Error creating supplier: ${error.message}`);
    }
  }

  /**
   * Update supplier
   * @param {string} supplierId - Supplier ID
   * @param {Object} supplierData - Supplier data to update
   * @returns {Promise<Object>}
   */
  async update(supplierId, supplierData) {
    try {
      // Ensure CUIT is properly formatted if provided
      if (supplierData.cuit) {
        supplierData.cuit = this._formatCuit(supplierData.cuit);
      }

      const { data, error } = await this.client
        .from(this.table)
        .update(supplierData)
        .eq('supplier_id', supplierId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('cuit')) {
          throw new Error('A supplier with this CUIT already exists in your organization');
        }
        if (error.message.includes('email')) {
          throw new Error('A supplier with this email already exists in your organization');
        }
        throw new Error('Supplier data violates unique constraint');
      }
      
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid organization or branch reference');
      }

      if (error.code === '23514') { // Check constraint violation
        if (error.message.includes('cuit_format')) {
          throw new Error('CUIT format is invalid. Please use XX-XXXXXXXX-X format');
        }
        if (error.message.includes('email_format')) {
          throw new Error('Email format is invalid');
        }
      }

      throw new Error(`Error updating supplier: ${error.message}`);
    }
  }

  /**
   * Delete supplier (hard delete)
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<void>}
   */
  async delete(supplierId) {
    try {
      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('supplier_id', supplierId);

      if (error) throw error;
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Cannot delete supplier: supplier has existing purchase orders or related data');
      }
      throw new Error(`Error deleting supplier: ${error.message}`);
    }
  }

  /**
   * Soft delete supplier (set is_active to false)
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<Object>}
   */
  async softDelete(supplierId) {
    return this.update(supplierId, { is_active: false });
  }

  /**
   * Restore soft-deleted supplier
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<Object>}
   */
  async restore(supplierId) {
    return this.update(supplierId, { is_active: true });
  }

  /**
   * Count suppliers with optional filters
   * @param {Object} filters - Filter conditions
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    try {
      let query = this.client
        .from(this.table)
        .select('*', { count: 'exact', head: true });

      // Apply filters
      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }

      if (filters.branch_id) {
        query = query.eq('branch_id', filters.branch_id);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.is_preferred !== undefined) {
        query = query.eq('is_preferred', filters.is_preferred);
      }

      if (filters.business_type) {
        query = query.eq('business_type', filters.business_type);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new Error(`Error counting suppliers: ${error.message}`);
    }
  }

  /**
   * Check if supplier exists by CUIT within organization
   * @param {string} cuit - Supplier CUIT
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async existsByCuit(cuit, organizationId) {
    try {
      const supplier = await this.findByCuit(cuit, organizationId);
      return supplier !== null;
    } catch (error) {
      throw new Error(`Error checking supplier existence by CUIT: ${error.message}`);
    }
  }

  /**
   * Check if supplier exists by email within organization
   * @param {string} email - Supplier email
   * @param {string} organizationId - Organization ID
   * @returns {Promise<boolean>}
   */
  async existsByEmail(email, organizationId) {
    try {
      const supplier = await this.findByEmail(email, organizationId);
      return supplier !== null;
    } catch (error) {
      throw new Error(`Error checking supplier existence by email: ${error.message}`);
    }
  }

  /**
   * Get supplier statistics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getStatsByOrganization(organizationId) {
    try {
      const [total, active, preferred, businessTypes] = await Promise.all([
        this.count({ organization_id: organizationId }),
        this.count({ organization_id: organizationId, is_active: true }),
        this.count({ organization_id: organizationId, is_preferred: true }),
        this._getBusinessTypeCounts(organizationId)
      ]);

      return {
        total,
        active,
        inactive: total - active,
        preferred,
        businessTypes
      };
    } catch (error) {
      throw new Error(`Error getting supplier statistics: ${error.message}`);
    }
  }

  /**
   * Get business type counts for organization
   * @private
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async _getBusinessTypeCounts(organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('business_type')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;

      const counts = {};
      data?.forEach(supplier => {
        const type = supplier.business_type || 'Other';
        counts[type] = (counts[type] || 0) + 1;
      });

      return counts;
    } catch (error) {
      throw new Error(`Error getting business type counts: ${error.message}`);
    }
  }

  /**
   * Format CUIT for storage
   * @private
   * @param {string} cuit - Raw CUIT input
   * @returns {string} Formatted CUIT
   */
  _formatCuit(cuit) {
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

module.exports = SupplierRepository;