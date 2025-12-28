const { Logger } = require('../utils/Logger');

/**
 * Subscription Service - Manages manual billing and subscriptions
 * Handles plan selection, activation, and payment tracking
 */
class SubscriptionService {
  constructor(supabaseClient, logger) {
    this.supabase = supabaseClient;
    this.logger = logger || new Logger('SubscriptionService');
  }

  /**
   * Get all available subscription plans
   */
  async getPlans() {
    try {
      const { data, error } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error getting plans', { error: error.message });
      throw error;
    }
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId) {
    try {
      const { data, error } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_id', planId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error getting plan', { error: error.message, planId });
      throw error;
    }
  }

  /**
   * Get organization's current subscription
   */
  async getOrganizationSubscription(organizationId) {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      this.logger.error('Error getting subscription', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Request plan upgrade/change (creates pending subscription)
   */
  async requestPlanChange(organizationId, planId, currency, userId) {
    try {
      this.logger.info('Requesting plan change', { organizationId, planId, currency });

      // Get plan details
      const plan = await this.getPlanById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get current subscription
      const currentSubscription = await this.getOrganizationSubscription(organizationId);

      // Determine amount based on billing cycle (use price_monthly for manual billing)
      const amount = plan.price_monthly || 0;

      // If changing from free plan, create new subscription
      if (currentSubscription.plan_id === 'free') {
        const { data, error } = await this.supabase
          .from('subscriptions')
          .update({
            plan_id: planId,
            status: 'pending',
            amount,
            currency,
            notes: 'Awaiting payment confirmation',
            updated_at: new Date().toISOString()
          })
          .eq('subscription_id', currentSubscription.subscription_id)
          .select()
          .single();

        if (error) throw error;

        // Log history
        await this.logSubscriptionHistory(
          currentSubscription.subscription_id,
          organizationId,
          'plan_change_requested',
          currentSubscription.plan_id,
          planId,
          userId
        );

        return data;
      }

      // For other plan changes, also update
      const { data, error } = await this.supabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          amount,
          currency,
          notes: 'Plan change requested - awaiting confirmation',
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', currentSubscription.subscription_id)
        .select()
        .single();

      if (error) throw error;

      // Log history
      await this.logSubscriptionHistory(
        currentSubscription.subscription_id,
        organizationId,
        'plan_change_requested',
        currentSubscription.plan_id,
        planId,
        userId
      );

      return data;
    } catch (error) {
      this.logger.error('Error requesting plan change', { error: error.message });
      throw error;
    }
  }

  /**
   * Activate subscription (admin only)
   */
  async activateSubscription(subscriptionId, adminUserId) {
    try {
      this.logger.info('Activating subscription', { subscriptionId, adminUserId });

      const { data: subscription, error: fetchError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate next billing date (30 days from now)
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);

      const { data, error } = await this.supabase
        .from('subscriptions')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      // Log history
      await this.logSubscriptionHistory(
        subscriptionId,
        subscription.organization_id,
        'activated',
        null,
        subscription.plan_id,
        adminUserId
      );

      return data;
    } catch (error) {
      this.logger.error('Error activating subscription', { error: error.message });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, userId, reason) {
    try {
      this.logger.info('Cancelling subscription', { subscriptionId, userId });

      const { data: subscription, error: fetchError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await this.supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          admin_notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      // Log history
      await this.logSubscriptionHistory(
        subscriptionId,
        subscription.organization_id,
        'cancelled',
        subscription.plan_id,
        null,
        userId,
        reason
      );

      return data;
    } catch (error) {
      this.logger.error('Error cancelling subscription', { error: error.message });
      throw error;
    }
  }

  /**
   * Record manual payment
   */
  async recordPayment(paymentData, recordedBy) {
    try {
      this.logger.info('Recording manual payment', {
        subscriptionId: paymentData.subscription_id,
        amount: paymentData.amount
      });

      const { data, error } = await this.supabase
        .from('manual_payments')
        .insert([{
          subscription_id: paymentData.subscription_id,
          organization_id: paymentData.organization_id,
          amount: paymentData.amount,
          currency: paymentData.currency || 'USD',
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date || new Date().toISOString(),
          transaction_reference: paymentData.transaction_reference,
          notes: paymentData.notes,
          receipt_url: paymentData.receipt_url,
          recorded_by: recordedBy,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error recording payment', { error: error.message });
      throw error;
    }
  }

  /**
   * Confirm payment (admin only)
   */
  async confirmPayment(paymentId, adminUserId) {
    try {
      this.logger.info('Confirming payment', { paymentId, adminUserId });

      const { data, error } = await this.supabase
        .from('manual_payments')
        .update({
          status: 'confirmed',
          confirmed_by: adminUserId,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', paymentId)
        .select()
        .single();

      if (error) throw error;

      // If payment has subscription, activate it
      if (data.subscription_id) {
        await this.activateSubscription(data.subscription_id, adminUserId);
      }

      return data;
    } catch (error) {
      this.logger.error('Error confirming payment', { error: error.message });
      throw error;
    }
  }

  /**
   * Get payments for organization
   */
  async getOrganizationPayments(organizationId) {
    try {
      const { data, error } = await this.supabase
        .from('manual_payments')
        .select(`
          *,
          recorded_by_user:users!manual_payments_recorded_by_fkey(user_id, email, name),
          confirmed_by_user:users!manual_payments_confirmed_by_fkey(user_id, email, name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error getting payments', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all pending subscriptions (admin)
   */
  async getPendingSubscriptions() {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans(*),
          organizations(organization_id, name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error getting pending subscriptions', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all pending payments (admin)
   */
  async getPendingPayments() {
    try {
      const { data, error } = await this.supabase
        .from('manual_payments')
        .select(`
          *,
          organizations(organization_id, name),
          recorded_by_user:users!manual_payments_recorded_by_fkey(email, name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error getting pending payments', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if organization has feature access
   */
  async hasFeatureAccess(organizationId, featureName) {
    try {
      const { data, error } = await this.supabase
        .rpc('has_feature_access', {
          org_id: organizationId,
          feature_name: featureName
        });

      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('Error checking feature access', { error: error.message });
      // Default to false on error
      return false;
    }
  }

  /**
   * Get plan limits for organization
   */
  async getPlanLimits(organizationId) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_plan_limits', {
          org_id: organizationId
        });

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      this.logger.error('Error getting plan limits', { error: error.message });
      throw error;
    }
  }

  /**
   * Log subscription history
   */
  async logSubscriptionHistory(subscriptionId, organizationId, eventType, oldPlanId, newPlanId, userId, notes) {
    try {
      await this.supabase
        .from('subscription_history')
        .insert([{
          subscription_id: subscriptionId,
          organization_id: organizationId,
          event_type: eventType,
          old_plan_id: oldPlanId,
          new_plan_id: newPlanId,
          changed_by: userId,
          notes
        }]);
    } catch (error) {
      this.logger.error('Error logging subscription history', { error: error.message });
      // Don't throw - history logging shouldn't break main flow
    }
  }
}

module.exports = SubscriptionService;
