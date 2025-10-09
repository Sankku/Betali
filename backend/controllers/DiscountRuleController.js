/**
 * Discount Rule Controller
 * Handles HTTP requests for discount rule management
 */
class DiscountRuleController {
  constructor(discountRuleService) {
    this.discountRuleService = discountRuleService;
  }

  /**
   * GET /api/discount-rules
   * Get all discount rules for the organization
   */
  async getDiscountRules(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const options = {
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        type: req.query.type,
        has_coupon: req.query.has_coupon === 'true' ? true : req.query.has_coupon === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset) : undefined
      };

      const discountRules = await this.discountRuleService.getOrganizationDiscountRules(organizationId, options);

      res.status(200).json({
        success: true,
        data: discountRules,
        meta: {
          total: discountRules.length,
          organizationId,
          filters: options
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/discount-rules/active
   * Get all active discount rules for the organization
   */
  async getActiveDiscountRules(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const orderDate = req.query.order_date ? new Date(req.query.order_date) : new Date();

      const discountRules = await this.discountRuleService.getActiveDiscountRules(organizationId, orderDate);

      res.status(200).json({
        success: true,
        data: discountRules,
        meta: {
          total: discountRules.length,
          organizationId,
          active_only: true,
          order_date: orderDate.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/discount-rules/stats
   * Get discount statistics for the organization
   */
  async getDiscountStats(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;

      const stats = await this.discountRuleService.getDiscountStats(organizationId);

      res.status(200).json({
        success: true,
        data: stats,
        meta: {
          organizationId,
          generated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/discount-rules/validate-coupon
   * Validate a coupon code
   */
  async validateCoupon(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const { coupon_code } = req.body;

      if (!coupon_code) {
        return res.status(400).json({
          success: false,
          error: 'Missing coupon code',
          message: 'Coupon code is required'
        });
      }

      const discountRule = await this.discountRuleService.findByCouponCode(coupon_code, organizationId);

      if (!discountRule) {
        return res.status(404).json({
          success: false,
          error: 'Invalid coupon code',
          message: 'Coupon code not found or not valid'
        });
      }

      res.status(200).json({
        success: true,
        data: discountRule,
        message: 'Coupon code is valid',
        meta: {
          organizationId,
          coupon_code,
          valid: true
        }
      });
    } catch (error) {
      // Handle specific coupon validation errors
      if (error.message.includes('coupon')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coupon',
          message: error.message
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/discount-rules/:id
   * Get discount rule by ID
   */
  async getDiscountRuleById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      const discountRule = await this.discountRuleService.getDiscountRuleById(id, organizationId);

      if (!discountRule) {
        return res.status(404).json({
          success: false,
          error: 'Discount rule not found',
          message: `Discount rule with ID ${id} not found or access denied`
        });
      }

      res.status(200).json({
        success: true,
        data: discountRule,
        meta: {
          organizationId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/discount-rules
   * Create a new discount rule
   */
  async createDiscountRule(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      const discountRuleData = req.body;

      const discountRule = await this.discountRuleService.createDiscountRule(discountRuleData, organizationId);

      res.status(201).json({
        success: true,
        data: discountRule,
        message: 'Discount rule created successfully',
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
   * PUT /api/discount-rules/:id
   * Update a discount rule
   */
  async updateDiscountRule(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;
      const updateData = req.body;

      const discountRule = await this.discountRuleService.updateDiscountRule(id, updateData, organizationId);

      res.status(200).json({
        success: true,
        data: discountRule,
        message: 'Discount rule updated successfully',
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
   * DELETE /api/discount-rules/:id
   * Delete a discount rule
   */
  async deleteDiscountRule(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      await this.discountRuleService.deleteDiscountRule(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'Discount rule deleted successfully',
        meta: {
          organizationId,
          deleted: true,
          discountRuleId: id
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/discount-rules/:id/increment-usage
   * Increment usage count for a discount rule (typically called during order processing)
   */
  async incrementUsageCount(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      // First verify the discount rule exists and belongs to the organization
      const discountRule = await this.discountRuleService.getDiscountRuleById(id, organizationId);
      if (!discountRule) {
        return res.status(404).json({
          success: false,
          error: 'Discount rule not found',
          message: `Discount rule with ID ${id} not found or access denied`
        });
      }

      await this.discountRuleService.incrementUsageCount(id);

      res.status(200).json({
        success: true,
        message: 'Usage count incremented successfully',
        meta: {
          organizationId,
          discountRuleId: id,
          incremented: true
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { DiscountRuleController };