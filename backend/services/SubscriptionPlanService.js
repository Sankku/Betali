const SubscriptionPlanRepository = require('../repositories/SubscriptionPlanRepository');
const { Logger } = require('../utils/Logger');

const logger = new Logger('SubscriptionPlanService');

class SubscriptionPlanService {
  /**
   * Get all public subscription plans
   * @returns {Promise<Array>} List of public plans
   */
  async getPublicPlans() {
    try {
      return await SubscriptionPlanRepository.findAll({
        publicOnly: true,
        activeOnly: true
      });
    } catch (error) {
      logger.error('Error in getPublicPlans:', error);
      throw new Error('Failed to fetch subscription plans');
    }
  }

  /**
   * Get all plans (admin only)
   * @returns {Promise<Array>} List of all plans
   */
  async getAllPlans() {
    try {
      return await SubscriptionPlanRepository.findAll({
        publicOnly: false,
        activeOnly: false
      });
    } catch (error) {
      logger.error('Error in getAllPlans:', error);
      throw new Error('Failed to fetch all subscription plans');
    }
  }

  /**
   * Get a specific plan by ID
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Subscription plan
   */
  async getPlanById(planId) {
    try {
      const plan = await SubscriptionPlanRepository.findById(planId);

      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      return plan;
    } catch (error) {
      logger.error('Error in getPlanById:', error);
      throw error;
    }
  }

  /**
   * Get a specific plan by name
   * @param {string} planName - Plan name
   * @returns {Promise<Object>} Subscription plan
   */
  async getPlanByName(planName) {
    try {
      const plan = await SubscriptionPlanRepository.findByName(planName);

      if (!plan) {
        throw new Error(`Subscription plan not found: ${planName}`);
      }

      return plan;
    } catch (error) {
      logger.error('Error in getPlanByName:', error);
      throw error;
    }
  }

  /**
   * Get plans comparison data for pricing page
   * @returns {Promise<Array>} Formatted plans for comparison
   */
  async getPlansComparison() {
    try {
      return await SubscriptionPlanRepository.getPlansComparison();
    } catch (error) {
      logger.error('Error in getPlansComparison:', error);
      throw new Error('Failed to fetch plans comparison data');
    }
  }

  /**
   * Get plan limits
   * @param {string} planName - Plan name
   * @returns {Promise<Object>} Plan limits
   */
  async getPlanLimits(planName) {
    try {
      return await SubscriptionPlanRepository.getPlanLimits(planName);
    } catch (error) {
      logger.error('Error in getPlanLimits:', error);
      throw error;
    }
  }

  /**
   * Check if a plan has a specific feature
   * @param {string} planName - Plan name
   * @param {string} featureName - Feature key
   * @returns {Promise<boolean>} Whether plan has the feature
   */
  async hasFeature(planName, featureName) {
    try {
      return await SubscriptionPlanRepository.hasFeature(planName, featureName);
    } catch (error) {
      logger.error('Error in hasFeature:', error);
      return false;
    }
  }

  /**
   * Check if user can upgrade from current plan to target plan
   * @param {string} currentPlan - Current plan name
   * @param {string} targetPlan - Target plan name
   * @returns {Promise<Object>} Upgrade validation result
   */
  async canUpgrade(currentPlan, targetPlan) {
    try {
      const current = await this.getPlanByName(currentPlan);
      const target = await this.getPlanByName(targetPlan);

      // Can always upgrade to a higher-priced plan
      const canUpgrade = target.price_monthly >= current.price_monthly;

      return {
        canUpgrade,
        currentPlan: current.display_name,
        targetPlan: target.display_name,
        priceDifference: target.price_monthly - current.price_monthly,
        isUpgrade: target.price_monthly > current.price_monthly,
        isDowngrade: target.price_monthly < current.price_monthly,
        isSamePlan: target.name === current.name
      };
    } catch (error) {
      logger.error('Error in canUpgrade:', error);
      throw error;
    }
  }

  /**
   * Get recommended plan based on usage
   * @param {Object} usage - Current usage data
   * @returns {Promise<Object>} Recommended plan
   */
  async getRecommendedPlan(usage) {
    try {
      const plans = await this.getPublicPlans();

      // Find the smallest plan that fits the usage
      for (const plan of plans) {
        const fitsUsers = plan.max_users === -1 || usage.users_count <= plan.max_users;
        const fitsProducts = plan.max_products === -1 || usage.products_count <= plan.max_products;
        const fitsWarehouses = plan.max_warehouses === -1 || usage.warehouses_count <= plan.max_warehouses;
        const fitsMovements = plan.max_stock_movements_per_month === -1 || usage.stock_movements_count <= plan.max_stock_movements_per_month;
        const fitsOrders = plan.max_orders_per_month === -1 || usage.orders_count <= plan.max_orders_per_month;
        const fitsClients = plan.max_clients === -1 || usage.clients_count <= plan.max_clients;
        const fitsSuppliers = plan.max_suppliers === -1 || usage.suppliers_count <= plan.max_suppliers;

        if (fitsUsers && fitsProducts && fitsWarehouses && fitsMovements && fitsOrders && fitsClients && fitsSuppliers) {
          return {
            plan,
            reason: 'This plan fits your current usage',
            isCurrentPlanSufficient: true
          };
        }
      }

      // If no plan fits, recommend enterprise
      const enterprise = plans.find(p => p.name === 'enterprise');
      return {
        plan: enterprise,
        reason: 'Your usage requires the Enterprise plan',
        isCurrentPlanSufficient: false
      };
    } catch (error) {
      logger.error('Error in getRecommendedPlan:', error);
      throw error;
    }
  }

  /**
   * Create a new plan (admin only)
   * @param {Object} planData - Plan data
   * @returns {Promise<Object>} Created plan
   */
  async createPlan(planData) {
    try {
      // Validate plan data
      this.validatePlanData(planData);

      return await SubscriptionPlanRepository.create(planData);
    } catch (error) {
      logger.error('Error in createPlan:', error);
      throw error;
    }
  }

  /**
   * Update a plan (admin only)
   * @param {string} planId - Plan ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated plan
   */
  async updatePlan(planId, updates) {
    try {
      // Don't allow changing the plan name as it's used as a reference
      if (updates.name) {
        delete updates.name;
      }

      return await SubscriptionPlanRepository.update(planId, updates);
    } catch (error) {
      logger.error('Error in updatePlan:', error);
      throw error;
    }
  }

  /**
   * Validate plan data
   * @param {Object} planData - Plan data to validate
   * @throws {Error} If validation fails
   */
  validatePlanData(planData) {
    const required = ['name', 'display_name', 'price_monthly', 'price_yearly'];

    for (const field of required) {
      if (!planData[field] && planData[field] !== 0) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate plan name format
    if (!/^[a-z_]+$/.test(planData.name)) {
      throw new Error('Plan name must be lowercase letters and underscores only');
    }

    // Validate prices
    if (planData.price_monthly < 0 || planData.price_yearly < 0) {
      throw new Error('Prices cannot be negative');
    }

    // Validate limits are numbers or -1 (unlimited)
    const limitFields = [
      'max_users',
      'max_products',
      'max_warehouses',
      'max_stock_movements_per_month',
      'max_orders_per_month',
      'max_clients',
      'max_suppliers',
      'max_storage_mb'
    ];

    for (const field of limitFields) {
      if (planData[field] !== undefined && planData[field] !== null) {
        const value = parseInt(planData[field]);
        if (isNaN(value) || (value < -1)) {
          throw new Error(`${field} must be a positive number or -1 for unlimited`);
        }
      }
    }
  }

  /**
   * Calculate proration amount when changing plans mid-cycle
   * @param {Object} currentSubscription - Current subscription data
   * @param {string} newPlanName - New plan name
   * @returns {Promise<Object>} Proration calculation
   */
  async calculateProration(currentSubscription, newPlanName) {
    try {
      const currentPlan = await this.getPlanByName(currentSubscription.plan_name);
      const newPlan = await this.getPlanByName(newPlanName);

      const now = new Date();
      const periodStart = new Date(currentSubscription.current_period_start);
      const periodEnd = new Date(currentSubscription.current_period_end);

      const totalDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));

      // Calculate unused amount from current plan
      const dailyRate = currentPlan.price_monthly / totalDays;
      const unusedAmount = dailyRate * remainingDays;

      // Calculate prorated amount for new plan
      const newDailyRate = newPlan.price_monthly / totalDays;
      const proratedAmount = newDailyRate * remainingDays;

      // Amount to charge now
      const chargeAmount = Math.max(0, proratedAmount - unusedAmount);

      return {
        currentPlan: currentPlan.display_name,
        newPlan: newPlan.display_name,
        remainingDays,
        totalDays,
        unusedAmount: unusedAmount.toFixed(2),
        proratedAmount: proratedAmount.toFixed(2),
        chargeAmount: chargeAmount.toFixed(2),
        effectiveDate: now.toISOString(),
        nextBillingDate: periodEnd.toISOString()
      };
    } catch (error) {
      logger.error('Error in calculateProration:', error);
      throw error;
    }
  }
}

module.exports = new SubscriptionPlanService();
