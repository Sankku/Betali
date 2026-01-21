const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

class SubscriptionRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'subscriptions', 'subscription_id');
    this.logger = new Logger('SubscriptionRepository');
  }

  /**
   * Get current active subscription for an organization
   * @param {string} organizationId
   */
  async getCurrentByOrganizationId(organizationId) {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          subscription_plans:plan_id (*)
        `)
        .eq('organization_id', organizationId)
        .in('status', ['active', 'past_due', 'pending', 'trialing']) // Include pending and trialing
        .is('canceled_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      this.logger.error('Error fetching current subscription', {
        error: error?.message || String(error),
        organizationId
      });
      throw error;
    }
  }

  /**
   * Create a new subscription
   * @param {Object} subscriptionData
   */
  async create(subscriptionData) {
    return super.create(subscriptionData);
  }

  /**
   * Update subscription
   * @param {string} id
   * @param {Object} updates
   */
  async update(id, updates) {
    return super.update(id, updates);
  }
}

module.exports = { SubscriptionRepository };
