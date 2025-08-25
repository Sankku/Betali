const { Logger } = require('../utils/Logger');

/**
 * Supplier controller handling HTTP requests
 * Follows the separation of concerns principle with multi-tenant support
 */
class SupplierController {
  constructor(supplierService) {
    this.supplierService = supplierService;
    this.logger = new Logger('SupplierController');
  }

  /**
   * Get all suppliers for organization (with filtering and pagination)
   * GET /api/suppliers
   */
  async getSuppliers(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const options = this.buildQueryOptions(req.query);
      
      const suppliers = await this.supplierService.getOrganizationSuppliers(organizationId, options);
      
      res.json({
        data: suppliers,
        meta: {
          total: suppliers.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single supplier by ID
   * GET /api/suppliers/:id
   */
  async getSupplierById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const supplier = await this.supplierService.getSupplierById(id, organizationId);
      
      res.json({ data: supplier });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supplier by CUIT within organization
   * GET /api/suppliers/cuit/:cuit
   */
  async getSupplierByCuit(req, res, next) {
    try {
      const { cuit } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const supplier = await this.supplierService.getSupplierByCuit(cuit, organizationId);
      
      if (!supplier) {
        return res.status(404).json({
          error: 'Supplier not found',
          message: `No supplier found with CUIT: ${cuit}`
        });
      }
      
      res.json({ data: supplier });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get preferred suppliers for organization
   * GET /api/suppliers/preferred
   */
  async getPreferredSuppliers(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const suppliers = await this.supplierService.getPreferredSuppliers(organizationId);
      
      res.json({
        data: suppliers,
        meta: {
          total: suppliers.length,
          organizationId,
          type: 'preferred'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get suppliers by business type
   * GET /api/suppliers/business-type/:type
   */
  async getSuppliersByBusinessType(req, res, next) {
    try {
      const { type } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }
      
      const suppliers = await this.supplierService.getSuppliersByBusinessType(organizationId, type);
      
      res.json({
        data: suppliers,
        meta: {
          total: suppliers.length,
          organizationId,
          businessType: type
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new supplier
   * POST /api/suppliers
   */
  async createSupplier(req, res, next) {
    try {
      const supplierData = req.body;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      // Add organization context and user reference
      const supplierToCreate = {
        ...supplierData,
        organization_id: organizationId,
        user_id: currentUserId
      };

      this.logger.info('Creating new supplier', {
        name: supplierData.name,
        cuit: supplierData.cuit,
        businessType: supplierData.business_type,
        organizationId,
        createdBy: currentUserId
      });

      const newSupplier = await this.supplierService.createSupplier(supplierToCreate);
      
      this.logger.info('Supplier created successfully', {
        supplierId: newSupplier.supplier_id,
        name: newSupplier.name,
        cuit: newSupplier.cuit,
        businessType: newSupplier.business_type
      });

      res.status(201).json({ data: newSupplier });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update supplier
   * PUT /api/suppliers/:id
   */
  async updateSupplier(req, res, next) {
    try {
      const { id } = req.params;
      const supplierData = req.body;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      // Remove organization_id from updates to prevent tampering
      delete supplierData.organization_id;
      delete supplierData.user_id;

      this.logger.info('Updating supplier', {
        supplierId: id,
        updatedBy: currentUserId,
        fieldsToUpdate: Object.keys(supplierData)
      });

      const updatedSupplier = await this.supplierService.updateSupplier(id, supplierData, organizationId);
      
      this.logger.info('Supplier updated successfully', {
        supplierId: id,
        updatedBy: currentUserId
      });

      res.json({ data: updatedSupplier });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete supplier (hard delete)
   * DELETE /api/suppliers/:id
   */
  async deleteSupplier(req, res, next) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      this.logger.info('Deleting supplier', {
        supplierId: id,
        deletedBy: currentUserId
      });

      await this.supplierService.deleteSupplier(id, organizationId);
      
      this.logger.info('Supplier deleted successfully', {
        supplierId: id,
        deletedBy: currentUserId
      });

      res.json({
        message: 'Supplier deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate supplier (soft delete)
   * PUT /api/suppliers/:id/deactivate
   */
  async deactivateSupplier(req, res, next) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      this.logger.info('Deactivating supplier', {
        supplierId: id,
        deactivatedBy: currentUserId
      });

      const deactivatedSupplier = await this.supplierService.deactivateSupplier(id, organizationId);
      
      this.logger.info('Supplier deactivated successfully', {
        supplierId: id,
        deactivatedBy: currentUserId
      });

      res.json({ 
        data: deactivatedSupplier,
        message: 'Supplier deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate supplier
   * PUT /api/suppliers/:id/reactivate
   */
  async reactivateSupplier(req, res, next) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      this.logger.info('Reactivating supplier', {
        supplierId: id,
        reactivatedBy: currentUserId
      });

      const reactivatedSupplier = await this.supplierService.reactivateSupplier(id, organizationId);
      
      this.logger.info('Supplier reactivated successfully', {
        supplierId: id,
        reactivatedBy: currentUserId
      });

      res.json({ 
        data: reactivatedSupplier,
        message: 'Supplier reactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set preferred status
   * PUT /api/suppliers/:id/preferred
   */
  async setPreferredStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { is_preferred } = req.body;
      const currentUserId = req.user.id;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      if (typeof is_preferred !== 'boolean') {
        return res.status(400).json({
          error: 'is_preferred must be a boolean value'
        });
      }

      this.logger.info('Setting supplier preferred status', {
        supplierId: id,
        isPreferred: is_preferred,
        updatedBy: currentUserId
      });

      const updatedSupplier = await this.supplierService.setPreferredStatus(id, is_preferred, organizationId);
      
      this.logger.info('Supplier preferred status updated successfully', {
        supplierId: id,
        isPreferred: is_preferred,
        updatedBy: currentUserId
      });

      res.json({ 
        data: updatedSupplier,
        message: `Supplier ${is_preferred ? 'marked as' : 'removed from'} preferred`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search suppliers
   * GET /api/suppliers/search?q=query
   */
  async searchSuppliers(req, res, next) {
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
      
      const suppliers = await this.supplierService.searchSuppliers(organizationId, query.trim(), options);
      
      res.json({
        data: suppliers,
        meta: {
          query: query.trim(),
          total: suppliers.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get suppliers by branch
   * GET /api/suppliers/branch/:branchId
   */
  async getSuppliersByBranch(req, res, next) {
    try {
      const { branchId } = req.params;
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const options = this.buildQueryOptions(req.query);
      
      const suppliers = await this.supplierService.getSuppliersByBranch(organizationId, branchId, options);
      
      res.json({
        data: suppliers,
        meta: {
          branchId,
          total: suppliers.length,
          organizationId,
          ...options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supplier statistics
   * GET /api/suppliers/stats
   */
  async getSupplierStats(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const stats = await this.supplierService.getSupplierStats(organizationId);
      
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
   * Validate supplier data
   * POST /api/suppliers/validate
   */
  async validateSupplier(req, res, next) {
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
          const existingSupplier = await this.supplierService.getSupplierByCuit(cuit, organizationId);
          validation.cuit.exists = !!existingSupplier;
        } catch (error) {
          validation.cuit.valid = false;
          validation.cuit.error = error.message;
        }
      }

      // Validate email
      if (email) {
        try {
          // Use repository directly for email validation
          const existingSupplier = await this.supplierService.repository.findByEmail(email, organizationId);
          validation.email.exists = !!existingSupplier;
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
   * Get business types list
   * GET /api/suppliers/business-types
   */
  async getBusinessTypes(req, res, next) {
    try {
      const businessTypes = [
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

      res.json({
        data: businessTypes,
        meta: {
          total: businessTypes.length,
          timestamp: new Date().toISOString()
        }
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
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      search: query.search || '',
      branch_id: query.branch_id || '',
      business_type: query.business_type || '',
      is_active: query.is_active !== undefined ? query.is_active === 'true' : undefined,
      is_preferred: query.is_preferred !== undefined ? query.is_preferred === 'true' : undefined,
      orderBy: query.orderBy || '',
      orderDirection: query.orderDirection || 'asc'
    };

    // Calculate offset for pagination
    options.offset = (options.page - 1) * options.limit;

    return options;
  }
}

module.exports = SupplierController;