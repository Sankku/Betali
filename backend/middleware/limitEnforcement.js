const supabase = require('../lib/supabaseClient');
const SubscriptionPlanRepository = require('../repositories/SubscriptionPlanRepository');
const { Logger } = require('../utils/Logger');

const logger = new Logger('LimitEnforcement');

/**
 * Middleware to check if organization has reached its plan limit for a specific resource
 * @param {string} resourceType - Type of resource to check (e.g., 'products', 'users', 'warehouses')
 * @returns {Function} Express middleware function
 */
const checkOrganizationLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Get organization from request (set by auth middleware)
      const organizationId = req.user?.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'No organization context found'
        });
      }

      // Get organization details
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('subscription_plan, subscription_status')
        .eq('organization_id', organizationId)
        .single();

      if (orgError || !organization) {
        logger.error('Error fetching organization:', orgError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch organization details'
        });
      }

      // Check if subscription is active
      if (organization.subscription_status !== 'active' && organization.subscription_status !== 'trialing') {
        return res.status(403).json({
          success: false,
          error: 'Subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          subscriptionStatus: organization.subscription_status
        });
      }

      // Get plan limits
      const planLimits = await SubscriptionPlanRepository.getPlanLimits(organization.subscription_plan);
      const limitKey = `max_${resourceType}`;
      const limit = planLimits[limitKey];

      // -1 means unlimited
      if (limit === -1 || limit === null) {
        return next();
      }

      // Get current usage
      const usage = await getCurrentUsage(organizationId, resourceType);

      // Check if limit exceeded
      if (usage >= limit) {
        logger.warn(`Organization ${organizationId} reached limit for ${resourceType}`, {
          usage,
          limit,
          plan: organization.subscription_plan
        });

        return res.status(403).json({
          success: false,
          error: `You have reached the ${resourceType} limit for your plan`,
          code: 'LIMIT_EXCEEDED',
          details: {
            resource: resourceType,
            current: usage,
            limit: limit,
            plan: organization.subscription_plan,
            upgradeAvailable: true
          }
        });
      }

      // Add usage info to request for later use
      req.organizationLimits = {
        resource: resourceType,
        current: usage,
        limit: limit,
        remaining: limit - usage,
        percentage: Math.round((usage / limit) * 100)
      };

      next();
    } catch (error) {
      logger.error('Error in checkOrganizationLimit:', error);
      next(error);
    }
  };
};

/**
 * Get current usage for a specific resource
 * @param {string} organizationId - Organization ID
 * @param {string} resourceType - Resource type
 * @returns {Promise<number>} Current usage count
 */
async function getCurrentUsage(organizationId, resourceType) {
  try {
    let tableName, countField;

    // Map resource types to tables
    switch (resourceType) {
      case 'users':
        tableName = 'user_organizations';
        countField = 'user_id';
        break;
      case 'products':
        tableName = 'products';
        countField = 'product_id';
        break;
      case 'product_types':
        tableName = 'product_types';
        countField = 'product_type_id';
        break;
      case 'warehouses':
        tableName = 'warehouse';
        countField = 'warehouse_id';
        break;
      case 'clients':
        tableName = 'clients';
        countField = 'client_id';
        break;
      case 'suppliers':
        tableName = 'suppliers';
        countField = 'supplier_id';
        break;
      case 'stock_movements_per_month':
        // Get current month's stock movements
        return await getMonthlyResourceCount(organizationId, 'stock_movements');
      case 'orders_per_month':
        // Get current month's orders
        return await getMonthlyResourceCount(organizationId, 'orders');
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }

    // Count resources for organization
    const { count, error } = await supabase
      .from(tableName)
      .select(countField, { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (error) {
      logger.error(`Error counting ${resourceType}:`, error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    logger.error('Error in getCurrentUsage:', error);
    throw error;
  }
}

/**
 * Get monthly resource count from usage_tracking table
 * @param {string} organizationId - Organization ID
 * @param {string} resourceType - Resource type
 * @returns {Promise<number>} Count for current month
 */
async function getMonthlyResourceCount(organizationId, resourceType) {
  try {
    const currentDate = new Date();
    const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const countField = `${resourceType}_count`;

    const { data, error } = await supabase
      .from('usage_tracking')
      .select(countField)
      .eq('organization_id', organizationId)
      .gte('period_start', periodStart.toISOString().split('T')[0])
      .single();

    if (error) {
      // If no record exists yet this month, count is 0
      if (error.code === 'PGRST116') {
        return 0;
      }
      logger.error('Error fetching monthly usage:', error);
      throw error;
    }

    return data?.[countField] || 0;
  } catch (error) {
    logger.error('Error in getMonthlyResourceCount:', error);
    return 0; // Return 0 on error to not block operations
  }
}

/**
 * Middleware to check if organization has access to a specific feature
 * @param {string} featureName - Feature name (e.g., 'api_access', 'advanced_analytics')
 * @returns {Function} Express middleware function
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'No organization context found'
        });
      }

      // Get organization plan
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('subscription_plan')
        .eq('organization_id', organizationId)
        .single();

      if (orgError || !organization) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch organization details'
        });
      }

      // Check if plan has feature
      const hasFeature = await SubscriptionPlanRepository.hasFeature(
        organization.subscription_plan,
        featureName
      );

      if (!hasFeature) {
        logger.warn(`Organization ${organizationId} tried to access feature: ${featureName}`, {
          plan: organization.subscription_plan
        });

        return res.status(403).json({
          success: false,
          error: `This feature is not available in your plan`,
          code: 'FEATURE_NOT_AVAILABLE',
          details: {
            feature: featureName,
            plan: organization.subscription_plan,
            upgradeRequired: true
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Error in requireFeature:', error);
      next(error);
    }
  };
};

/**
 * Increment usage counter for a resource
 * Should be called after successful resource creation
 * @param {string} organizationId - Organization ID
 * @param {string} resourceType - Resource type
 * @param {number} increment - Amount to increment (default 1)
 */
async function incrementUsage(organizationId, resourceType, increment = 1) {
  try {
    // For monthly tracked resources
    if (resourceType.includes('per_month')) {
      const cleanResourceType = resourceType.replace('_per_month', '');
      const countField = `${cleanResourceType}_count`;

      // Call database function to increment
      const { error } = await supabase.rpc('increment_usage', {
        org_id: organizationId,
        counter_name: countField,
        increment_by: increment
      });

      if (error) {
        logger.error('Error incrementing usage:', error);
      }
    }
    // For non-monthly resources, count is handled by table rows
  } catch (error) {
    logger.error('Error in incrementUsage:', error);
    // Don't throw - usage tracking shouldn't break operations
  }
}

/**
 * Get usage summary for organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Usage summary
 */
async function getUsageSummary(organizationId) {
  try {
    const [
      users,
      products,
      warehouses,
      clients,
      suppliers,
      monthlyMovements,
      monthlyOrders
    ] = await Promise.all([
      getCurrentUsage(organizationId, 'users'),
      getCurrentUsage(organizationId, 'products'),
      getCurrentUsage(organizationId, 'warehouses'),
      getCurrentUsage(organizationId, 'clients'),
      getCurrentUsage(organizationId, 'suppliers'),
      getCurrentUsage(organizationId, 'stock_movements_per_month'),
      getCurrentUsage(organizationId, 'orders_per_month')
    ]);

    return {
      users_count: users,
      products_count: products,
      warehouses_count: warehouses,
      clients_count: clients,
      suppliers_count: suppliers,
      stock_movements_count: monthlyMovements,
      orders_count: monthlyOrders
    };
  } catch (error) {
    logger.error('Error in getUsageSummary:', error);
    throw error;
  }
}

module.exports = {
  checkOrganizationLimit,
  requireFeature,
  incrementUsage,
  getUsageSummary,
  getCurrentUsage
};
