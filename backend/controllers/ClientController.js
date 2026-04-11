const { Logger } = require('../utils/Logger');

/**
 * Client controller handling HTTP requests
 * Follows the separation of concerns principle with multi-tenant support
 */
class ClientController {
  constructor(clientService) {
    this.clientService = clientService;
    this.logger = new Logger('ClientController');
  }

  /**
   * Get all clients for organization (with filtering and pagination)
   * GET /api/clients
   */
  async getClients(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const options = this.buildQueryOptions(req.query);
      
      const clients = await this.clientService.getOrganizationClients(organizationId, options);
      
      res.json({
        data: clients,
        meta: {
          total: clients.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single client by ID
   * GET /api/clients/:id
   */
  async getClientById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const client = await this.clientService.getClientById(id, organizationId);
      
      res.json({ data: client });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get client by CUIT
   * GET /api/clients/cuit/:cuit
   */
  async getClientByCuit(req, res, next) {
    try {
      const { cuit } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const client = await this.clientService.getClientByCuit(cuit, organizationId);
      
      if (!client) {
        return res.status(404).json({
          error: 'Client not found',
          message: `No client found with CUIT: ${cuit}`
        });
      }
      
      res.json({ data: client });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new client
   * POST /api/clients
   */
  async createClient(req, res, next) {
    try {
      const clientData = req.body;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      // Add organization context and user reference
      const clientToCreate = {
        ...clientData,
        organization_id: organizationId,
        user_id: currentUserId
      };

      this.logger.info('Creating new client', {
        name: clientData.name,
        cuit: clientData.cuit,
        organizationId,
        createdBy: currentUserId
      });

      const newClient = await this.clientService.createClient(clientToCreate);
      
      this.logger.info('Client created successfully', {
        clientId: newClient.client_id,
        name: newClient.name,
        cuit: newClient.cuit
      });

      res.status(201).json({ data: newClient });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update client
   * PUT /api/clients/:id
   */
  async updateClient(req, res, next) {
    try {
      const { id } = req.params;
      const clientData = req.body;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      // Remove organization_id from updates to prevent tampering
      delete clientData.organization_id;
      delete clientData.user_id;

      this.logger.info('Updating client', {
        clientId: id,
        updatedBy: currentUserId,
        fieldsToUpdate: Object.keys(clientData)
      });

      const updatedClient = await this.clientService.updateClient(id, clientData, organizationId);
      
      this.logger.info('Client updated successfully', {
        clientId: id,
        updatedBy: currentUserId
      });

      res.json({ data: updatedClient });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk delete clients
   * DELETE /api/clients/bulk
   */
  async bulkDeleteClients(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'No organization context found.' });
      }
      
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required and must not be empty' });
      }
      
      const result = await this.clientService.bulkDeleteClients(ids, organizationId);
      res.json({ data: result, message: 'Bulk delete complete' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete client
   * DELETE /api/clients/:id
   */
  async deleteClient(req, res, next) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      this.logger.info('Deleting client', {
        clientId: id,
        deletedBy: currentUserId
      });

      await this.clientService.deleteClient(id, organizationId);
      
      this.logger.info('Client deleted successfully', {
        clientId: id,
        deletedBy: currentUserId
      });

      res.json({
        message: 'Client deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search clients
   * GET /api/clients/search?q=query
   */
  async searchClients(req, res, next) {
    try {
      const { q: query } = req.query;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          error: 'Search query is required',
          message: 'Please provide a search query using the "q" parameter'
        });
      }

      const options = this.buildQueryOptions(req.query);
      
      const clients = await this.clientService.searchClients(organizationId, query.trim(), options);
      
      res.json({
        data: clients,
        meta: {
          query: query.trim(),
          total: clients.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get clients by branch
   * GET /api/clients/branch/:branchId
   */
  async getClientsByBranch(req, res, next) {
    try {
      const { branchId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const options = this.buildQueryOptions(req.query);
      
      const clients = await this.clientService.getClientsByBranch(organizationId, branchId, options);
      
      res.json({
        data: clients,
        meta: {
          branchId,
          total: clients.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get client statistics
   * GET /api/clients/stats
   */
  async getClientStats(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const stats = await this.clientService.getClientStats(organizationId);
      
      res.json({
        data: stats,
        meta: {
          organizationId,
          calculated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate client data
   * POST /api/clients/validate
   */
  async validateClient(req, res, next) {
    try {
      const { cuit, email } = req.body;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      if (!cuit && !email) {
        return res.status(400).json({
          error: 'CUIT or email is required for validation'
        });
      }

      const validation = {
        cuit: { valid: true, exists: false },
        email: { valid: true, exists: false }
      };

      // Validate CUIT
      if (cuit) {
        try {
          const existingClient = await this.clientService.getClientByCuit(cuit, organizationId);
          validation.cuit.exists = !!existingClient;
        } catch (error) {
          validation.cuit.valid = false;
          validation.cuit.error = error.message;
        }
      }

      // Validate email
      if (email) {
        try {
          const existingClient = await this.clientService.findByEmail(email, organizationId);
          validation.email.exists = !!existingClient;
        } catch (error) {
          validation.email.valid = false;
          validation.email.error = error.message;
        }
      }

      res.json({
        data: validation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Build query options from request query parameters
   * @private
   */
  buildQueryOptions(query) {
    const options = {
      page: Math.max(1, parseInt(query.page) || 1),
      limit: Math.min(100, Math.max(1, parseInt(query.limit) || 10)),
      search: query.search || '',
      branch_id: query.branch_id || ''
    };

    // Calculate offset for pagination
    options.offset = (options.page - 1) * options.limit;

    return options;
  }
}

module.exports = ClientController;