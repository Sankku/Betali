const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');

const logger = new Logger('SubscriptionPlanRepository');

class SubscriptionPlanRepository {
  constructor() {
    this.tableName = 'subscription_plans';
  }

  /**
   * Get all active subscription plans
   * @param {Object} options - Query options
   * @param {boolean} options.publicOnly - Filter only public plans
   * @param {boolean} options.activeOnly - Filter only active plans
   * @returns {Promise<Array>} Array of subscription plans
   */
  async findAll(options = {}) {
    try {
      const { publicOnly = true, activeOnly = true } = options;

      let query = supabase
        .from(this.tableName)
        .select('*')
        .order('sort_order', { ascending: true });

      if (publicOnly) {
        query = query.eq('is_public', true);
      }

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching subscription plans:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in findAll:', error);
      throw error;
    }
  }

  /**
   * Get a subscription plan by ID
   * @param {string} planId - Plan ID
   * @returns {Promise<Object|null>} Subscription plan or null
   */
  async findById(planId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('plan_id', planId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        logger.error('Error fetching subscription plan by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in findById:', error);
      throw error;
    }
  }

  /**
   * Get a subscription plan by name
   * @param {string} name - Plan name (e.g., 'free', 'starter', 'professional', 'enterprise')
   * @returns {Promise<Object|null>} Subscription plan or null
   */
  async findByName(name) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('name', name.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        logger.error('Error fetching subscription plan by name:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in findByName:', error);
      throw error;
    }
  }

  /**
   * Create a new subscription plan (admin only)
   * @param {Object} planData - Plan data
   * @returns {Promise<Object>} Created subscription plan
   */
  async create(planData) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([planData])
        .select()
        .single();

      if (error) {
        logger.error('Error creating subscription plan:', error);
        throw error;
      }

      logger.info(`Subscription plan created: ${data.name}`);
      return data;
    } catch (error) {
      logger.error('Error in create:', error);
      throw error;
    }
  }

  /**
   * Update a subscription plan (admin only)
   * @param {string} planId - Plan ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated subscription plan
   */
  async update(planId, updates) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(updates)
        .eq('plan_id', planId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating subscription plan:', error);
        throw error;
      }

      logger.info(`Subscription plan updated: ${planId}`);
      return data;
    } catch (error) {
      logger.error('Error in update:', error);
      throw error;
    }
  }

  /**
   * Delete a subscription plan (admin only)
   * Note: This will fail if there are active subscriptions using this plan
   * @param {string} planId - Plan ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(planId) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('plan_id', planId);

      if (error) {
        logger.error('Error deleting subscription plan:', error);
        throw error;
      }

      logger.info(`Subscription plan deleted: ${planId}`);
      return true;
    } catch (error) {
      logger.error('Error in delete:', error);
      throw error;
    }
  }

  /**
   * Get plan limits
   * @param {string} planName - Plan name
   * @returns {Promise<Object>} Plan limits
   */
  async getPlanLimits(planName) {
    try {
      const plan = await this.findByName(planName);

      if (!plan) {
        throw new Error(`Plan not found: ${planName}`);
      }

      return {
        max_users: plan.max_users,
        max_products: plan.max_products,
        max_warehouses: plan.max_warehouses,
        max_stock_movements_per_month: plan.max_stock_movements_per_month,
        max_orders_per_month: plan.max_orders_per_month,
        max_clients: plan.max_clients,
        max_suppliers: plan.max_suppliers,
        max_storage_mb: plan.max_storage_mb,
      };
    } catch (error) {
      logger.error('Error in getPlanLimits:', error);
      throw error;
    }
  }

  /**
   * Check if plan has a specific feature
   * @param {string} planName - Plan name
   * @param {string} featureName - Feature key (e.g., 'api_access')
   * @returns {Promise<boolean>} Whether plan has the feature
   */
  async hasFeature(planName, featureName) {
    try {
      const plan = await this.findByName(planName);

      if (!plan) {
        return false;
      }

      return plan.features?.[featureName] === true;
    } catch (error) {
      logger.error('Error in hasFeature:', error);
      return false;
    }
  }

  /**
   * Get plans comparison data (for pricing page)
   * @returns {Promise<Array>} Plans with formatted data for comparison
   */
  async getPlansComparison() {
    try {
      const plans = await this.findAll({ publicOnly: true, activeOnly: true });

      return plans.map(plan => ({
        id: plan.plan_id,
        name: plan.name,
        displayName: plan.display_name,
        description: plan.description,
        pricing: {
          monthly: plan.price_monthly,
          yearly: plan.price_yearly,
          currency: plan.currency,
          savings: plan.price_yearly > 0
            ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
            : 0
        },
        limits: {
          users: plan.max_users === -1 ? 'Unlimited' : plan.max_users,
          products: plan.max_products === -1 ? 'Unlimited' : plan.max_products,
          warehouses: plan.max_warehouses === -1 ? 'Unlimited' : plan.max_warehouses,
          stockMovements: plan.max_stock_movements_per_month === -1 ? 'Unlimited' : plan.max_stock_movements_per_month,
          orders: plan.max_orders_per_month === -1 ? 'Unlimited' : plan.max_orders_per_month,
          clients: plan.max_clients === -1 ? 'Unlimited' : plan.max_clients,
          suppliers: plan.max_suppliers === -1 ? 'Unlimited' : plan.max_suppliers,
          storage: plan.max_storage_mb === -1 ? 'Unlimited' : `${plan.max_storage_mb}MB`
        },
        features: plan.features,
        trial: {
          days: plan.trial_days,
          available: plan.trial_days > 0
        },
        sortOrder: plan.sort_order
      }));
    } catch (error) {
      logger.error('Error in getPlansComparison:', error);
      throw error;
    }
  }
}

module.exports = new SubscriptionPlanRepository();
