const { SubscriptionRepository } = require('../repositories/SubscriptionRepository');
const { Logger } = require('../utils/Logger');
const subscriptionPlanRepository = require('../repositories/SubscriptionPlanRepository');
const supabase = require('../lib/supabaseClient');

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
   * Plans eligible for a free trial on first subscription.
   * Enterprise is excluded — it goes through a manual sales process.
   */
  static get TRIAL_ELIGIBLE_PLANS() {
    return ['starter', 'professional'];
  }

  /**
   * Returns true if this organization can start a free trial for the given plan.
   * Conditions:
   *   1. Plan has trial_days > 0
   *   2. Plan name is in TRIAL_ELIGIBLE_PLANS
   *   3. The org has NEVER started a trial before (trial_start is null)
   * @param {Object} plan
   * @param {Object|null} existingSubscription
   */
  _canApplyTrial(plan, existingSubscription) {
    if (!plan.trial_days || plan.trial_days <= 0) return false;
    if (!SubscriptionService.TRIAL_ELIGIBLE_PLANS.includes(plan.name)) return false;
    if (existingSubscription && existingSubscription.trial_start !== null) return false;
    return true;
  }

  /**
   * Build subscription data for a new trial period.
   * @param {Object} plan
   * @param {string} currency
   * @param {Object} extraFields  - merged into the result (e.g. organization_id or reactivated_from)
   */
  _buildTrialData(plan, currency, extraFields = {}) {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + plan.trial_days);

    const { metadata: extraMetadata, ...otherExtraFields } = extraFields;

    return {
      plan_id: plan.plan_id,
      status: 'trialing',
      billing_cycle: 'monthly',
      currency,
      amount: plan.price_monthly || 0,
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      payment_gateway: 'mercadopago',
      updated_at: now.toISOString(),
      metadata: {
        trial_applied: true,
        trial_days: plan.trial_days,
        created_via: 'request_plan_change',
        ...extraMetadata
      },
      ...otherExtraFields
    };
  }

  /**
   * Sync organizations.subscription_plan and subscription_status so limit-enforcement
   * middleware picks up the new plan immediately.
   * @param {string} organizationId
   * @param {Object} plan
   * @param {string} status  - e.g. 'trialing' | 'active' | 'pending_payment'
   */
  async _syncOrgPlan(organizationId, plan, status) {
    const { error } = await supabase
      .from('organizations')
      .update({
        subscription_plan: plan.name,
        subscription_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error('Failed to sync organizations.subscription_plan', {
        organizationId,
        planName: plan.name,
        status,
        error
      });
    }
  }

  /**
   * Request a plan change
   * - For active/trialing subscriptions: schedules change for end of period
   * - For pending_payment subscriptions: returns existing to complete payment
   * - For no subscription / first-time subscriber on eligible plan: starts free trial
   * - Otherwise: creates new pending_payment subscription
   * @param {string} organizationId
   * @param {string} planId
   * @param {string} currency
   */
  async requestPlanChange(organizationId, planId, currency = 'ARS') {
    try {
      // Get plan details to retrieve the price
      const plan = await subscriptionPlanRepository.findById(planId);

      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // Use monthly price by default (billing_cycle is monthly)
      const amount = plan.price_monthly || 0;

      // Check if there's already a subscription for this organization
      const existingSubscription = await this.subscriptionRepository.getCurrentByOrganizationId(organizationId);

      if (existingSubscription) {
        // If subscription is pending payment, update plan if different or return as-is
        if (existingSubscription.status === 'pending_payment') {
          if (existingSubscription.plan_id === planId) {
            // Same plan — return so the user can complete the existing payment
            this.logger.info('Returning existing pending_payment subscription (same plan)', {
              subscriptionId: existingSubscription.subscription_id,
              organizationId
            });
            return existingSubscription;
          }

          // Different plan — update the pending subscription to the new plan
          const subscription = await this.subscriptionRepository.update(
            existingSubscription.subscription_id,
            {
              plan_id: planId,
              amount,
              currency,
              updated_at: new Date().toISOString(),
              metadata: {
                ...existingSubscription.metadata,
                plan_switched_at: new Date().toISOString(),
                previous_plan_id: existingSubscription.plan_id
              }
            }
          );

          this.logger.info('Updated pending_payment subscription to new plan', {
            subscriptionId: subscription.subscription_id,
            organizationId,
            previousPlanId: existingSubscription.plan_id,
            newPlanId: planId
          });

          return subscription;
        }

        // If subscription is already active/trialing with same plan, return it
        if (existingSubscription.plan_id === planId &&
            (existingSubscription.status === 'trialing' || existingSubscription.status === 'active')) {
          this.logger.info('Returning existing active subscription (same plan)', {
            subscriptionId: existingSubscription.subscription_id,
            organizationId,
            planId
          });
          return existingSubscription;
        }

        // For active/trialing subscriptions changing to a different plan:
        // Schedule the change for the end of the current period (don't interrupt service)
        if (existingSubscription.status === 'active' || existingSubscription.status === 'trialing') {
          const updateData = {
            updated_at: new Date().toISOString(),
            metadata: {
              ...existingSubscription.metadata,
              scheduled_plan_change: {
                new_plan_id: planId,
                new_amount: amount,
                new_currency: currency,
                scheduled_at: new Date().toISOString(),
                effective_date: existingSubscription.current_period_end
              }
            }
          };

          const subscription = await this.subscriptionRepository.update(
            existingSubscription.subscription_id,
            updateData
          );

          this.logger.info('Scheduled plan change for end of period', {
            subscriptionId: subscription.subscription_id,
            organizationId,
            currentPlanId: existingSubscription.plan_id,
            newPlanId: planId,
            effectiveDate: existingSubscription.current_period_end
          });

          return {
            ...subscription,
            scheduled_change: true,
            effective_date: existingSubscription.current_period_end
          };
        }

        // For other statuses (cancelled, expired, past_due, etc.):
        // UPDATE the existing row instead of inserting — the table has a unique
        // constraint on organization_id (one row per org, ever).

        // If the org never used their trial and the plan qualifies, start a trial
        if (this._canApplyTrial(plan, existingSubscription)) {
          const trialData = this._buildTrialData(plan, currency, {
            metadata: { reactivated_from: existingSubscription.status }
          });

          const subscription = await this.subscriptionRepository.update(
            existingSubscription.subscription_id,
            trialData
          );

          await this._syncOrgPlan(organizationId, plan, 'trialing');

          this.logger.info('Started free trial on reactivation', {
            subscriptionId: subscription.subscription_id,
            organizationId,
            planId,
            trialDays: plan.trial_days,
            trialEnd: trialData.trial_end
          });

          return subscription;
        }

        const subscriptionData = {
          plan_id: planId,
          status: 'pending_payment',
          billing_cycle: 'monthly',
          currency: currency,
          amount: amount,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
          payment_gateway: 'mercadopago',
          updated_at: new Date().toISOString(),
          metadata: {
            pending_payment: true,
            created_via: 'request_plan_change',
            reactivated_from: existingSubscription.status
          }
        };

        const subscription = await this.subscriptionRepository.update(
          existingSubscription.subscription_id,
          subscriptionData
        );

        this.logger.info('Reactivated existing subscription row to pending_payment', {
          subscriptionId: subscription.subscription_id,
          organizationId,
          planId,
          previousStatus: existingSubscription.status
        });

        return subscription;
      }

      // Truly no subscription row exists yet — create one
      // If the plan qualifies for trial, start the trial immediately (no payment required)
      if (this._canApplyTrial(plan, null)) {
        const trialData = this._buildTrialData(plan, currency, {
          organization_id: organizationId
        });

        const subscription = await this.subscriptionRepository.create(trialData);

        await this._syncOrgPlan(organizationId, plan, 'trialing');

        this.logger.info('Started free trial for new subscriber', {
          subscriptionId: subscription.subscription_id,
          organizationId,
          planId,
          trialDays: plan.trial_days,
          trialEnd: trialData.trial_end
        });

        return subscription;
      }

      const subscriptionData = {
        organization_id: organizationId,
        plan_id: planId,
        status: 'pending_payment',
        billing_cycle: 'monthly',
        currency: currency,
        amount: amount,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
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

  /**
   * Apply scheduled plan change (called by webhook or cron at period end)
   * @param {string} subscriptionId
   */
  async applyScheduledPlanChange(subscriptionId) {
    try {
      const subscription = await this.subscriptionRepository.findById(subscriptionId);

      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      const scheduledChange = subscription.metadata?.scheduled_plan_change;
      if (!scheduledChange) {
        this.logger.info('No scheduled plan change found', { subscriptionId });
        return subscription;
      }

      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);

      // Calculate new period dates
      const newPeriodStart = periodEnd;
      const newPeriodEnd = new Date(periodEnd);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      const updateData = {
        plan_id: scheduledChange.new_plan_id,
        amount: scheduledChange.new_amount,
        currency: scheduledChange.new_currency,
        current_period_start: newPeriodStart.toISOString(),
        current_period_end: newPeriodEnd.toISOString(),
        updated_at: now.toISOString(),
        metadata: {
          ...subscription.metadata,
          scheduled_plan_change: null,
          last_plan_change: {
            from_plan_id: subscription.plan_id,
            to_plan_id: scheduledChange.new_plan_id,
            applied_at: now.toISOString()
          }
        }
      };

      const updatedSubscription = await this.subscriptionRepository.update(subscriptionId, updateData);

      // Sync organizations table so limitEnforcement middleware picks up the new plan
      const newPlan = await subscriptionPlanRepository.findById(scheduledChange.new_plan_id);
      if (newPlan) {
        const { error: orgSyncError } = await supabase
          .from('organizations')
          .update({
            subscription_plan: newPlan.name,
            subscription_status: 'active',
            updated_at: now.toISOString()
          })
          .eq('organization_id', subscription.organization_id);

        if (orgSyncError) {
          this.logger.error('Failed to sync organizations.subscription_plan on scheduled change:', {
            subscriptionId,
            organizationId: subscription.organization_id,
            error: orgSyncError
          });
        }
      }

      this.logger.info('Applied scheduled plan change', {
        subscriptionId,
        fromPlanId: subscription.plan_id,
        toPlanId: scheduledChange.new_plan_id
      });

      return updatedSubscription;
    } catch (error) {
      this.logger.error('Error applying scheduled plan change:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled plan change
   * @param {string} organizationId
   */
  async cancelScheduledPlanChange(organizationId) {
    try {
      const subscription = await this.subscriptionRepository.getCurrentByOrganizationId(organizationId);

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      if (!subscription.metadata?.scheduled_plan_change) {
        throw new Error('No scheduled plan change to cancel');
      }

      const updateData = {
        updated_at: new Date().toISOString(),
        metadata: {
          ...subscription.metadata,
          scheduled_plan_change: null
        }
      };

      const updatedSubscription = await this.subscriptionRepository.update(
        subscription.subscription_id,
        updateData
      );

      this.logger.info('Cancelled scheduled plan change', {
        subscriptionId: subscription.subscription_id,
        organizationId
      });

      return updatedSubscription;
    } catch (error) {
      this.logger.error('Error cancelling scheduled plan change:', error);
      throw error;
    }
  }
}

module.exports = { SubscriptionService };
