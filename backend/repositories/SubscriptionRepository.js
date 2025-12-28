const { BaseRepository } = require('./BaseRepository');

class SubscriptionRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'subscriptions', 'subscription_id');
  }

  /**
   * Get current active subscription for an organization
   * @param {string} organizationId
   */
  async getCurrentByOrganizationId(organizationId) {
    try {
      const { data, error } = await this.supabase
        .from(this.table)
        .select(`
          *,
          subscription_plans:plan_id (*)
        `)
        .eq('organization_id', organizationId)
        .in('status', ['active', 'past_due', 'pending']) // Include pending?
        .is('cancelled_at', null)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      this.logger.error('Error fetching current subscription', { error: error.message, organizationId });
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
