const { BaseRepository } = require('./BaseRepository');

/**
 * Client repository extending BaseRepository
 * Handles client-specific database operations with multi-tenant support
 */
class ClientRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'clients');
  }

  /**
   * Find client by ID
   * @param {string} clientId - Client ID
   * @returns {Promise<Object|null>}
   */
  async findById(clientId) {
    return super.findById(clientId, 'client_id');
  }

  /**
   * Find client by CUIT within organization
   * @param {string} cuit - Client CUIT
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Object|null>}
   */
  async findByCuit(cuit, organizationId = null) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .eq('cuit', cuit);
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding client by CUIT: ${error.message}`);
    }
  }

  /**
   * Find client by email within organization
   * @param {string} email - Client email
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email, organizationId = null) {
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .eq('email', email);
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding client by email: ${error.message}`);
    }
  }

  /**
   * Find all clients with filtering and pagination for organization
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

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,cuit.ilike.%${options.search}%`);
      }

      // Apply ordering
      query = query.order('created_at', { ascending: false });

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
      throw new Error(`Error finding clients by organization: ${error.message}`);
    }
  }

  /**
   * Find all clients with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAll(options = {}) {
    if (!options.organization_id) {
      throw new Error('[Security] organization_id is required for findAll');
    }
    try {
      let query = this.client
        .from(this.table)
        .select('*')
        .eq('organization_id', options.organization_id);

      if (options.branch_id) {
        query = query.eq('branch_id', options.branch_id);
      }

      // Apply search
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,cuit.ilike.%${options.search}%`);
      }

      // Apply ordering
      query = query.order('created_at', { ascending: false });

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
      throw new Error(`Error finding clients: ${error.message}`);
    }
  }

  /**
   * Create new client
   * @param {Object} clientData - Client data
   * @returns {Promise<Object>}
   */
  async create(clientData) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('cuit')) {
          throw new Error('A client with this CUIT already exists in your organization');
        }
        if (error.message.includes('email')) {
          throw new Error('Email constraint violation (unexpected - emails should not be unique)');
        }
        throw new Error('Client data violates unique constraint');
      }
      
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid organization or branch reference');
      }

      throw new Error(`Error creating client: ${error.message}`);
    }
  }

  /**
   * Update client
   * @param {string} clientId - Client ID
   * @param {Object} clientData - Client data to update
   * @returns {Promise<Object>}
   */
  async update(clientId, clientData) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .update(clientData)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('cuit')) {
          throw new Error('A client with this CUIT already exists in your organization');
        }
        if (error.message.includes('email')) {
          throw new Error('Email constraint violation (unexpected - emails should not be unique)');
        }
        throw new Error('Client data violates unique constraint');
      }
      
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid organization or branch reference');
      }

      throw new Error(`Error updating client: ${error.message}`);
    }
  }

  /**
   * Delete client (hard delete)
   * @param {string} clientId - Client ID
   * @returns {Promise<void>}
   */
  async delete(clientId) {
    try {
      const { error } = await this.client
        .from(this.table)
        .delete()
        .eq('client_id', clientId);

      if (error) throw error;
    } catch (error) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Cannot delete client: client has existing orders or related data');
      }
      throw new Error(`Error deleting client: ${error.message}`);
    }
  }

  /**
   * Count clients with optional filters
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

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw new Error(`Error counting clients: ${error.message}`);
    }
  }

  /**
   * Check if client exists by CUIT within organization
   * @param {string} cuit - Client CUIT
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<boolean>}
   */
  async existsByCuit(cuit, organizationId = null) {
    try {
      const client = await this.findByCuit(cuit, organizationId);
      return client !== null;
    } catch (error) {
      throw new Error(`Error checking client existence by CUIT: ${error.message}`);
    }
  }

  /**
   * Check if client exists by email within organization
   * @param {string} email - Client email
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<boolean>}
   */
  async existsByEmail(email, organizationId = null) {
    try {
      const client = await this.findByEmail(email, organizationId);
      return client !== null;
    } catch (error) {
      throw new Error(`Error checking client existence by email: ${error.message}`);
    }
  }

  /**
   * Get active clients count by organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>}
   */
  async getActiveCountByOrganization(organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('client_id')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data ? data.length : 0;
    } catch (error) {
      throw new Error(`Error getting active client count: ${error.message}`);
    }
  }
}

module.exports = ClientRepository;