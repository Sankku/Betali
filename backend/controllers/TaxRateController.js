/**
 * Tax Rate Controller
 * Handles HTTP requests for tax rate management
 */
class TaxRateController {
  constructor(taxRateService) {
    this.taxRateService = taxRateService;
  }

  /**
   * GET /api/tax-rates
   * Get all tax rates for the organization
   */
  async getTaxRates(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const options = {
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset) : undefined
      };

      const taxRates = await this.taxRateService.getOrganizationTaxRates(organizationId, options);

      res.status(200).json({
        success: true,
        data: taxRates,
        meta: {
          total: taxRates.length,
          organizationId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tax-rates/active
   * Get all active tax rates for the organization
   */
  async getActiveTaxRates(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      const taxRates = await this.taxRateService.getActiveTaxRates(organizationId);

      res.status(200).json({
        success: true,
        data: taxRates,
        meta: {
          total: taxRates.length,
          organizationId,
          active_only: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tax-rates/default
   * Get the default tax rate for the organization
   */
  async getDefaultTaxRate(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      const taxRate = await this.taxRateService.getDefaultTaxRate(organizationId);

      if (!taxRate) {
        return res.status(404).json({
          success: false,
          error: 'No default tax rate found',
          message: 'No default tax rate has been configured for this organization'
        });
      }

      res.status(200).json({
        success: true,
        data: taxRate,
        meta: {
          organizationId,
          is_default: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tax-rates/:id
   * Get tax rate by ID
   */
  async getTaxRateById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      const taxRate = await this.taxRateService.getTaxRateById(id, organizationId);

      if (!taxRate) {
        return res.status(404).json({
          success: false,
          error: 'Tax rate not found',
          message: `Tax rate with ID ${id} not found or access denied`
        });
      }

      res.status(200).json({
        success: true,
        data: taxRate,
        meta: {
          organizationId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tax-rates
   * Create a new tax rate
   */
  async createTaxRate(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const taxRateData = req.body;

      const taxRate = await this.taxRateService.createTaxRate(taxRateData, organizationId);

      res.status(201).json({
        success: true,
        data: taxRate,
        message: 'Tax rate created successfully',
        meta: {
          organizationId,
          created: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tax-rates/:id
   * Update a tax rate
   */
  async updateTaxRate(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const updateData = req.body;

      const taxRate = await this.taxRateService.updateTaxRate(id, updateData, organizationId);

      res.status(200).json({
        success: true,
        data: taxRate,
        message: 'Tax rate updated successfully',
        meta: {
          organizationId,
          updated: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tax-rates/:id
   * Delete a tax rate
   */
  async deleteTaxRate(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      await this.taxRateService.deleteTaxRate(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'Tax rate deleted successfully',
        meta: {
          organizationId,
          deleted: true,
          taxRateId: id
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { TaxRateController };