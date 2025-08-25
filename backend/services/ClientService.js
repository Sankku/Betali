/**
 * Client business logic service
 * Handles business rules and validation for client management
 */
class ClientService {
  constructor(clientRepository, logger) {
    this.repository = clientRepository;
    this.logger = logger;
  }

  /**
   * Get all clients for an organization with filtering and pagination
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getOrganizationClients(organizationId, options = {}) {
    try {
      this.logger.info('Fetching organization clients', { organizationId, options });
      return await this.repository.findByOrganization(organizationId, options);
    } catch (error) {
      this.logger.error(`Error fetching organization clients: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get client by ID with organization validation
   * @param {string} clientId - Client ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getClientById(clientId, organizationId) {
    try {
      this.logger.info(`Fetching client: ${clientId}`);
      const client = await this.repository.findById(clientId);
      
      if (!client) {
        const error = new Error('Client not found');
        error.status = 404;
        throw error;
      }
      
      // Validate organization access
      if (client.organization_id !== organizationId) {
        const error = new Error('Access denied: Client does not belong to your organization');
        error.status = 403;
        throw error;
      }
      
      return client;
    } catch (error) {
      this.logger.error(`Error fetching client ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get client by CUIT within organization
   * @param {string} cuit - Client CUIT
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>}
   */
  async getClientByCuit(cuit, organizationId) {
    try {
      this.logger.info(`Fetching client by CUIT: ${cuit}`);
      return await this.repository.findByCuit(cuit, organizationId);
    } catch (error) {
      this.logger.error(`Error fetching client by CUIT ${cuit}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new client
   * @param {Object} clientData - Client data
   * @returns {Promise<Object>}
   */
  async createClient(clientData) {
    try {
      // Validate business rules
      await this.validateClientCreation(clientData);
      
      this.logger.info('Creating new client', { 
        name: clientData.name,
        cuit: clientData.cuit,
        organizationId: clientData.organization_id
      });
      
      // Add timestamps
      const clientToCreate = {
        ...clientData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const newClient = await this.repository.create(clientToCreate);
      
      this.logger.info('Client created successfully', { 
        clientId: newClient.client_id,
        name: newClient.name,
        cuit: newClient.cuit
      });
      
      return newClient;
    } catch (error) {
      this.logger.error(`Error creating client: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update client with organization validation
   * @param {string} clientId - Client ID
   * @param {Object} clientData - Client data to update
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async updateClient(clientId, clientData, organizationId) {
    try {
      // Check if client exists and belongs to organization
      const existingClient = await this.getClientById(clientId, organizationId);
      
      // Validate business rules for update
      await this.validateClientUpdate(existingClient, clientData, organizationId);
      
      this.logger.info(`Updating client: ${clientId}`, { 
        fieldsToUpdate: Object.keys(clientData) 
      });
      
      // Add update timestamp
      const dataToUpdate = {
        ...clientData,
        updated_at: new Date().toISOString()
      };
      
      const updatedClient = await this.repository.update(clientId, dataToUpdate);
      
      this.logger.info('Client updated successfully', { clientId });
      
      return updatedClient;
    } catch (error) {
      this.logger.error(`Error updating client ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete client with organization validation
   * @param {string} clientId - Client ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteClient(clientId, organizationId) {
    try {
      // Check if client exists and belongs to organization
      await this.getClientById(clientId, organizationId);
      
      this.logger.info(`Deleting client: ${clientId}`);
      
      await this.repository.delete(clientId);
      
      this.logger.info('Client deleted successfully', { clientId });
    } catch (error) {
      this.logger.error(`Error deleting client ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search clients
   * @param {string} organizationId - Organization ID
   * @param {string} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async searchClients(organizationId, query, options = {}) {
    try {
      this.logger.info(`Searching clients in organization ${organizationId} with query: ${query}`);
      
      const searchOptions = {
        ...options,
        search: query,
        organization_id: organizationId
      };
      
      return await this.repository.findAll(searchOptions);
    } catch (error) {
      this.logger.error(`Error searching clients: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get clients by branch
   * @param {string} organizationId - Organization ID
   * @param {string} branchId - Branch ID
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async getClientsByBranch(organizationId, branchId, options = {}) {
    try {
      this.logger.info(`Fetching clients for branch ${branchId} in organization ${organizationId}`);
      
      const branchOptions = {
        ...options,
        organization_id: organizationId,
        branch_id: branchId
      };
      
      return await this.repository.findAll(branchOptions);
    } catch (error) {
      this.logger.error(`Error fetching clients by branch: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get client statistics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>}
   */
  async getClientStats(organizationId) {
    try {
      this.logger.info(`Getting client statistics for organization: ${organizationId}`);
      
      const totalClients = await this.repository.getActiveCountByOrganization(organizationId);
      
      // You can extend this with more statistics as needed
      const stats = {
        total_clients: totalClients,
        organization_id: organizationId,
        calculated_at: new Date().toISOString()
      };
      
      return stats;
    } catch (error) {
      this.logger.error(`Error getting client statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate client creation business rules
   * @private
   */
  async validateClientCreation(clientData) {
    // Validate required fields
    if (!clientData.name || !clientData.cuit || !clientData.email) {
      const error = new Error('Name, CUIT, and email are required');
      error.status = 400;
      throw error;
    }

    // Validate organization requirement
    if (!clientData.organization_id) {
      const error = new Error('Organization ID is required');
      error.status = 400;
      throw error;
    }

    // Validate CUIT format (basic validation)
    if (!this.isValidCuit(clientData.cuit)) {
      const error = new Error('Invalid CUIT format');
      error.status = 400;
      throw error;
    }

    // Validate email format
    if (!this.isValidEmail(clientData.email)) {
      const error = new Error('Invalid email format');
      error.status = 400;
      throw error;
    }

    // Check if CUIT already exists within organization
    const existingClientByCuit = await this.repository.findByCuit(clientData.cuit, clientData.organization_id);
    if (existingClientByCuit) {
      const error = new Error('A client with this CUIT already exists in your organization');
      error.status = 409;
      throw error;
    }

    // Check if email already exists within organization
    const existingClientByEmail = await this.repository.findByEmail(clientData.email, clientData.organization_id);
    if (existingClientByEmail) {
      const error = new Error('A client with this email already exists in your organization');
      error.status = 409;
      throw error;
    }
  }

  /**
   * Validate client update business rules
   * @private
   */
  async validateClientUpdate(existingClient, clientData, organizationId) {
    // Validate CUIT format if being updated
    if (clientData.cuit && !this.isValidCuit(clientData.cuit)) {
      const error = new Error('Invalid CUIT format');
      error.status = 400;
      throw error;
    }

    // Validate email format if being updated
    if (clientData.email && !this.isValidEmail(clientData.email)) {
      const error = new Error('Invalid email format');
      error.status = 400;
      throw error;
    }

    // Check if CUIT is being changed and if it conflicts within organization
    if (clientData.cuit && clientData.cuit !== existingClient.cuit) {
      const clientWithCuit = await this.repository.findByCuit(clientData.cuit, organizationId);
      if (clientWithCuit && clientWithCuit.client_id !== existingClient.client_id) {
        const error = new Error('A client with this CUIT already exists in your organization');
        error.status = 409;
        throw error;
      }
    }

    // Check if email is being changed and if it conflicts within organization
    if (clientData.email && clientData.email !== existingClient.email) {
      const clientWithEmail = await this.repository.findByEmail(clientData.email, organizationId);
      if (clientWithEmail && clientWithEmail.client_id !== existingClient.client_id) {
        const error = new Error('A client with this email already exists in your organization');
        error.status = 409;
        throw error;
      }
    }
  }

  /**
   * Validate CUIT format
   * @private
   */
  isValidCuit(cuit) {
    // Basic CUIT validation - you can make this more sophisticated
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
}

module.exports = ClientService;