const { SubscriptionRepository } = require('../repositories/SubscriptionRepository');
const { Logger } = require('../utils/Logger');
const subscriptionPlanRepository = require('../repositories/SubscriptionPlanRepository');

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

  /**
   * Request a plan change - creates a pending subscription
   * @param {string} organizationId
   * @param {string} planId
   * @param {string} currency
   */
  async requestPlanChange(organizationId, planId, currency = 'ARS') {
    try {
      // Check if there's already a subscription for this organization
      const existingSubscription = await this.subscriptionRepository.getCurrentByOrganizationId(organizationId);

      if (existingSubscription) {
        // If subscription is pending payment, don't allow creating another one
        if (existingSubscription.status === 'pending_payment') {
          this.logger.warn('Organization already has a pending payment subscription', {
            subscriptionId: existingSubscription.subscription_id,
            organizationId
          });
          // Return the existing pending subscription so they can complete payment
          return existingSubscription;
        }

        // If subscription is already trialing or active with same plan, return it
        if (existingSubscription.plan_id === planId &&
            (existingSubscription.status === 'trialing' || existingSubscription.status === 'active')) {
          this.logger.info('Returning existing active subscription', {
            subscriptionId: existingSubscription.subscription_id,
            organizationId,
            planId
          });
          return existingSubscription;
        }

        // If there's a different subscription, cancel it first
        this.logger.info('Canceling existing subscription before creating new one', {
          oldSubscriptionId: existingSubscription.subscription_id,
          oldPlanId: existingSubscription.plan_id,
          newPlanId: planId
        });

        // Delete the old subscription to avoid unique constraint violation
        await this.subscriptionRepository.delete(existingSubscription.subscription_id);
      }

      // Get the subscription plan details directly from repository to get the amount
      const plan = await subscriptionPlanRepository.findById(planId);

      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Determine the amount based on currency
      let amount = plan.price_monthly; // Default to monthly
      if (currency === 'USD') {
        amount = plan.price_monthly_usd || plan.price_monthly;
      }

      // Create a pending subscription - periods will be set after first payment
      const subscriptionData = {
        organization_id: organizationId,
        plan_id: planId,
        status: 'pending_payment', // Wait for payment before activating
        billing_cycle: 'monthly', // Default, can be parameterized
        currency: currency,
        amount: amount,
        current_period_start: null, // Will be set when payment is confirmed
        current_period_end: null, // Will be set when payment is confirmed
        payment_gateway: 'mercadopago',
        metadata: {
          pending_payment: true,
          created_via: 'request_plan_change'
        }
      };

      const subscription = await this.subscriptionRepository.create(subscriptionData);

      this.logger.info('Created pending subscription', {
        subscriptionId: subscription.subscription_id,
        organizationId,
        planId,
        amount,
        currency
      });

      return subscription;
    } catch (error) {
      this.logger.error('Error requesting plan change:', error);
      throw error;
    }
  }
}

module.exports = { SubscriptionService };
