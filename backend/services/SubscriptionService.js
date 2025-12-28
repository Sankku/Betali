const { SubscriptionRepository } = require('../repositories/SubscriptionRepository');
const { Logger } = require('../utils/Logger');

class SubscriptionService {
  constructor(subscriptionRepository, logger) {
    this.subscriptionRepository = subscriptionRepository;
    this.logger = logger || new Logger('SubscriptionService');
  }

  /**
   * Get current subscription for an organization
   * @param {string} organizationId
   */
  async getCurrentSubscription(organizationId) {
    try {
      const subscription = await this.subscriptionRepository.getCurrentByOrganizationId(organizationId);
      
      if (!subscription) {
        // Return null or a default free subscription object structure?
        // Returning null allows the controller/frontend to handle "no subscription"
        return null;
      }
      
      return subscription;
    } catch (error) {
      this.logger.error('Error in getCurrentSubscription:', error);
      throw error;
    }
  }

  /**
   * Create a new subscription
   * @param {Object} data
   */
  async createSubscription(data) {
    try {
        return await this.subscriptionRepository.create(data);
    } catch (error) {
        this.logger.error('Error creating subscription:', error);
        throw error;
    }
  }
}

module.exports = { SubscriptionService };
