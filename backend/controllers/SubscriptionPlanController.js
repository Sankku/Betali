const SubscriptionPlanService = require('../services/SubscriptionPlanService');
const { Logger } = require('../utils/Logger');

const logger = new Logger('SubscriptionPlanController');

class SubscriptionPlanController {
  /**
   * Get all public subscription plans
   * GET /api/subscription-plans
   * Public endpoint - no auth required
   */
  async getPublicPlans(req, res) {
    try {
      const plans = await SubscriptionPlanService.getPublicPlans();

      res.status(200).json({
        success: true,
        data: plans,
        message: 'Subscription plans retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getPublicPlans:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch subscription plans'
      });
    }
  }

  /**
   * Get plans comparison data for pricing page
   * GET /api/subscription-plans/comparison
   * Public endpoint - no auth required
   */
  async getPlansComparison(req, res) {
    try {
      const comparison = await SubscriptionPlanService.getPlansComparison();

      res.status(200).json({
        success: true,
        data: comparison,
        message: 'Plans comparison data retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getPlansComparison:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch plans comparison'
      });
    }
  }

  /**
   * Get a specific plan by ID
   * GET /api/subscription-plans/:planId
   * Public endpoint - no auth required
   */
  async getPlanById(req, res) {
    try {
      const { planId } = req.params;

      if (!planId) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID is required'
        });
      }

      const plan = await SubscriptionPlanService.getPlanById(planId);

      res.status(200).json({
        success: true,
        data: plan,
        message: 'Subscription plan retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getPlanById:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription plan'
      });
    }
  }

  /**
   * Get a specific plan by name
   * GET /api/subscription-plans/name/:planName
   * Public endpoint - no auth required
   */
  async getPlanByName(req, res) {
    try {
      const { planName } = req.params;

      if (!planName) {
        return res.status(400).json({
          success: false,
          message: 'Plan name is required'
        });
      }

      const plan = await SubscriptionPlanService.getPlanByName(planName);

      res.status(200).json({
        success: true,
        data: plan,
        message: 'Subscription plan retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getPlanByName:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription plan'
      });
    }
  }

  /**
   * Get plan limits
   * GET /api/subscription-plans/:planName/limits
   * Public endpoint - useful for showing limits on UI
   */
  async getPlanLimits(req, res) {
    try {
      const { planName } = req.params;

      if (!planName) {
        return res.status(400).json({
          success: false,
          message: 'Plan name is required'
        });
      }

      const limits = await SubscriptionPlanService.getPlanLimits(planName);

      res.status(200).json({
        success: true,
        data: limits,
        message: 'Plan limits retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getPlanLimits:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch plan limits'
      });
    }
  }

  /**
   * Check if plan has a feature
   * GET /api/subscription-plans/:planName/features/:featureName
   * Public endpoint
   */
  async checkFeature(req, res) {
    try {
      const { planName, featureName } = req.params;

      if (!planName || !featureName) {
        return res.status(400).json({
          success: false,
          message: 'Plan name and feature name are required'
        });
      }

      const hasFeature = await SubscriptionPlanService.hasFeature(planName, featureName);

      res.status(200).json({
        success: true,
        data: {
          planName,
          featureName,
          hasFeature
        },
        message: 'Feature check completed'
      });
    } catch (error) {
      logger.error('Error in checkFeature:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check feature'
      });
    }
  }

  /**
   * Check if user can upgrade
   * POST /api/subscription-plans/can-upgrade
   * Requires authentication
   */
  async canUpgrade(req, res) {
    try {
      const { currentPlan, targetPlan } = req.body;

      if (!currentPlan || !targetPlan) {
        return res.status(400).json({
          success: false,
          message: 'Current plan and target plan are required'
        });
      }

      const result = await SubscriptionPlanService.canUpgrade(currentPlan, targetPlan);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Upgrade check completed'
      });
    } catch (error) {
      logger.error('Error in canUpgrade:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check upgrade eligibility'
      });
    }
  }

  /**
   * Get recommended plan based on usage
   * POST /api/subscription-plans/recommend
   * Requires authentication
   */
  async getRecommendedPlan(req, res) {
    try {
      const { usage } = req.body;

      if (!usage) {
        return res.status(400).json({
          success: false,
          message: 'Usage data is required'
        });
      }

      const recommendation = await SubscriptionPlanService.getRecommendedPlan(usage);

      res.status(200).json({
        success: true,
        data: recommendation,
        message: 'Plan recommendation generated'
      });
    } catch (error) {
      logger.error('Error in getRecommendedPlan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate plan recommendation'
      });
    }
  }

  /**
   * Calculate proration for plan change
   * POST /api/subscription-plans/calculate-proration
   * Requires authentication
   */
  async calculateProration(req, res) {
    try {
      const { currentSubscription, newPlanName } = req.body;

      if (!currentSubscription || !newPlanName) {
        return res.status(400).json({
          success: false,
          message: 'Current subscription and new plan name are required'
        });
      }

      const proration = await SubscriptionPlanService.calculateProration(
        currentSubscription,
        newPlanName
      );

      res.status(200).json({
        success: true,
        data: proration,
        message: 'Proration calculated successfully'
      });
    } catch (error) {
      logger.error('Error in calculateProration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate proration'
      });
    }
  }

  /**
   * Get all plans (admin only)
   * GET /api/admin/subscription-plans
   * Requires super_admin role
   */
  async getAllPlans(req, res) {
    try {
      const plans = await SubscriptionPlanService.getAllPlans();

      res.status(200).json({
        success: true,
        data: plans,
        message: 'All subscription plans retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getAllPlans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch all subscription plans'
      });
    }
  }

  /**
   * Create a new plan (admin only)
   * POST /api/admin/subscription-plans
   * Requires super_admin role
   */
  async createPlan(req, res) {
    try {
      const planData = req.body;

      const newPlan = await SubscriptionPlanService.createPlan(planData);

      res.status(201).json({
        success: true,
        data: newPlan,
        message: 'Subscription plan created successfully'
      });
    } catch (error) {
      logger.error('Error in createPlan:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create subscription plan'
      });
    }
  }

  /**
   * Update a plan (admin only)
   * PUT /api/admin/subscription-plans/:planId
   * Requires super_admin role
   */
  async updatePlan(req, res) {
    try {
      const { planId } = req.params;
      const updates = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID is required'
        });
      }

      const updatedPlan = await SubscriptionPlanService.updatePlan(planId, updates);

      res.status(200).json({
        success: true,
        data: updatedPlan,
        message: 'Subscription plan updated successfully'
      });
    } catch (error) {
      logger.error('Error in updatePlan:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update subscription plan'
      });
    }
  }
}

module.exports = new SubscriptionPlanController();
