const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');
const emailService = require('./EmailService');

/**
 * SubscriptionCronService - Handles scheduled subscription tasks
 *
 * This service should be run periodically (e.g., daily via cron or scheduler)
 * to handle:
 * - Trial period expirations
 * - Subscription renewals
 * - Payment reminders
 * - Scheduled plan changes
 */
class SubscriptionCronService {
  constructor() {
    this.logger = new Logger('SubscriptionCronService');
  }

  /**
   * Main entry point - run all scheduled tasks
   */
  async runAllTasks() {
    this.logger.info('Starting subscription cron tasks...');

    const results = {
      trialExpiring: await this.processTrialExpiring(),
      trialExpired: await this.processTrialExpired(),
      subscriptionsExpiring: await this.processSubscriptionsExpiring(),
      subscriptionsExpired: await this.processSubscriptionsExpired(),
      scheduledPlanChanges: await this.processScheduledPlanChanges()
    };

    this.logger.info('Subscription cron tasks completed:', results);
    return results;
  }

  /**
   * Send reminder emails for trials ending in 3 days
   */
  async processTrialExpiring() {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find trials ending in the next 3 days
      const { data: expiringTrials, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans(*),
          organizations!inner (
            organization_id,
            name,
            owner_id
          )
        `)
        .eq('status', 'trialing')
        .gte('trial_end', today.toISOString())
        .lte('trial_end', threeDaysFromNow.toISOString());

      if (error) {
        this.logger.error('Error fetching expiring trials:', error);
        return { success: false, error: error.message };
      }

      let sentCount = 0;
      for (const subscription of expiringTrials || []) {
        // Check if we already sent a reminder (avoid duplicates)
        const alreadySent = subscription.metadata?.trial_reminder_sent;
        if (alreadySent) continue;

        try {
          const ownerId = subscription.organizations?.owner_id;
          if (!ownerId) continue;

          const { data: owner } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', ownerId)
            .single();

          if (!owner?.email) continue;

          const daysLeft = Math.ceil(
            (new Date(subscription.trial_end) - new Date()) / (1000 * 60 * 60 * 24)
          );

          await emailService.sendTrialEndingSoonEmail({
            to: owner.email,
            userName: owner.name || owner.email.split('@')[0],
            planName: subscription.subscription_plans?.display_name || 'Plan',
            trialEndDate: subscription.trial_end,
            daysLeft
          });

          // Mark reminder as sent
          await supabase
            .from('subscriptions')
            .update({
              metadata: {
                ...subscription.metadata,
                trial_reminder_sent: new Date().toISOString()
              }
            })
            .eq('subscription_id', subscription.subscription_id);

          sentCount++;
          this.logger.info('Trial expiring reminder sent:', {
            subscriptionId: subscription.subscription_id,
            email: owner.email,
            daysLeft
          });
        } catch (emailError) {
          this.logger.error('Error sending trial reminder:', emailError);
        }
      }

      return { success: true, processed: expiringTrials?.length || 0, emailsSent: sentCount };
    } catch (error) {
      this.logger.error('Error processing expiring trials:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle trials that have expired - downgrade to free or cancel
   */
  async processTrialExpired() {
    try {
      const now = new Date();

      // Find expired trials
      const { data: expiredTrials, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans(*),
          organizations!inner (
            organization_id,
            name,
            owner_id
          )
        `)
        .eq('status', 'trialing')
        .lt('trial_end', now.toISOString());

      if (error) {
        this.logger.error('Error fetching expired trials:', error);
        return { success: false, error: error.message };
      }

      let processedCount = 0;
      for (const subscription of expiredTrials || []) {
        try {
          // Get free plan to downgrade to
          const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('name', 'free')
            .single();

          if (freePlan) {
            // Downgrade to free plan
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                plan_id: freePlan.plan_id,
                trial_end: null,
                updated_at: now.toISOString(),
                metadata: {
                  ...subscription.metadata,
                  downgraded_from: subscription.plan_id,
                  downgraded_at: now.toISOString(),
                  downgrade_reason: 'trial_expired'
                }
              })
              .eq('subscription_id', subscription.subscription_id);

            // Log to history
            await supabase
              .from('subscription_history')
              .insert({
                subscription_id: subscription.subscription_id,
                organization_id: subscription.organization_id,
                previous_plan_id: subscription.plan_id,
                new_plan_id: freePlan.plan_id,
                change_type: 'downgrade',
                reason: 'Trial period expired',
                changed_by: 'system_cron'
              });

            this.logger.info('Trial expired - downgraded to free:', {
              subscriptionId: subscription.subscription_id,
              previousPlan: subscription.plan_id
            });
          } else {
            // No free plan available - cancel subscription
            await supabase
              .from('subscriptions')
              .update({
                status: 'canceled',
                canceled_at: now.toISOString(),
                updated_at: now.toISOString()
              })
              .eq('subscription_id', subscription.subscription_id);

            this.logger.info('Trial expired - subscription canceled:', {
              subscriptionId: subscription.subscription_id
            });
          }

          processedCount++;
        } catch (subError) {
          this.logger.error('Error processing expired trial:', {
            subscriptionId: subscription.subscription_id,
            error: subError
          });
        }
      }

      return { success: true, processed: processedCount };
    } catch (error) {
      this.logger.error('Error processing expired trials:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send reminder emails for subscriptions expiring in 7 days
   */
  async processSubscriptionsExpiring() {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find subscriptions expiring in the next 7 days
      const { data: expiringSubscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans(*),
          organizations!inner (
            organization_id,
            name,
            owner_id
          )
        `)
        .eq('status', 'active')
        .gte('current_period_end', today.toISOString())
        .lte('current_period_end', sevenDaysFromNow.toISOString());

      if (error) {
        this.logger.error('Error fetching expiring subscriptions:', error);
        return { success: false, error: error.message };
      }

      let sentCount = 0;
      for (const subscription of expiringSubscriptions || []) {
        // Skip free plans
        if (subscription.subscription_plans?.price_monthly === 0) continue;

        // Check if we already sent a reminder this period
        const alreadySent = subscription.metadata?.expiring_reminder_sent;
        if (alreadySent) {
          const sentDate = new Date(alreadySent);
          const daysSinceSent = (new Date() - sentDate) / (1000 * 60 * 60 * 24);
          if (daysSinceSent < 7) continue; // Don't send more than once per week
        }

        try {
          const ownerId = subscription.organizations?.owner_id;
          if (!ownerId) continue;

          const { data: owner } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', ownerId)
            .single();

          if (!owner?.email) continue;

          const daysLeft = Math.ceil(
            (new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24)
          );

          await emailService.sendSubscriptionExpiringSoonEmail({
            to: owner.email,
            userName: owner.name || owner.email.split('@')[0],
            planName: subscription.subscription_plans?.display_name || 'Plan',
            expirationDate: subscription.current_period_end,
            daysLeft
          });

          // Mark reminder as sent
          await supabase
            .from('subscriptions')
            .update({
              metadata: {
                ...subscription.metadata,
                expiring_reminder_sent: new Date().toISOString()
              }
            })
            .eq('subscription_id', subscription.subscription_id);

          sentCount++;
          this.logger.info('Subscription expiring reminder sent:', {
            subscriptionId: subscription.subscription_id,
            email: owner.email,
            daysLeft
          });
        } catch (emailError) {
          this.logger.error('Error sending subscription expiring reminder:', emailError);
        }
      }

      return { success: true, processed: expiringSubscriptions?.length || 0, emailsSent: sentCount };
    } catch (error) {
      this.logger.error('Error processing expiring subscriptions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle subscriptions that have expired
   * Note: In a real system with recurring billing, this would attempt to charge the card
   * For now, we downgrade to free or mark as expired
   */
  async processSubscriptionsExpired() {
    try {
      const now = new Date();

      // Find expired subscriptions (not free plans)
      const { data: expiredSubscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans!inner(*),
          organizations!inner (
            organization_id,
            name,
            owner_id
          )
        `)
        .eq('status', 'active')
        .gt('subscription_plans.price_monthly', 0)
        .lt('current_period_end', now.toISOString());

      if (error) {
        this.logger.error('Error fetching expired subscriptions:', error);
        return { success: false, error: error.message };
      }

      let processedCount = 0;
      for (const subscription of expiredSubscriptions || []) {
        try {
          // Get free plan to downgrade to
          const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('name', 'free')
            .single();

          if (freePlan) {
            // Downgrade to free plan
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                plan_id: freePlan.plan_id,
                updated_at: now.toISOString(),
                metadata: {
                  ...subscription.metadata,
                  downgraded_from: subscription.plan_id,
                  downgraded_at: now.toISOString(),
                  downgrade_reason: 'subscription_expired'
                }
              })
              .eq('subscription_id', subscription.subscription_id);

            // Log to history
            await supabase
              .from('subscription_history')
              .insert({
                subscription_id: subscription.subscription_id,
                organization_id: subscription.organization_id,
                previous_plan_id: subscription.plan_id,
                new_plan_id: freePlan.plan_id,
                change_type: 'downgrade',
                reason: 'Subscription period expired',
                changed_by: 'system_cron'
              });

            // Send email notification
            const ownerId = subscription.organizations?.owner_id;
            if (ownerId) {
              const { data: owner } = await supabase
                .from('users')
                .select('email, name')
                .eq('id', ownerId)
                .single();

              if (owner?.email) {
                await emailService.sendSubscriptionCancelledEmail({
                  to: owner.email,
                  userName: owner.name || owner.email.split('@')[0],
                  planName: subscription.subscription_plans?.display_name || 'Plan',
                  endDate: subscription.current_period_end
                });
              }
            }

            this.logger.info('Subscription expired - downgraded to free:', {
              subscriptionId: subscription.subscription_id,
              previousPlan: subscription.plan_id
            });
          } else {
            // Mark as expired
            await supabase
              .from('subscriptions')
              .update({
                status: 'expired',
                updated_at: now.toISOString()
              })
              .eq('subscription_id', subscription.subscription_id);

            this.logger.info('Subscription expired:', {
              subscriptionId: subscription.subscription_id
            });
          }

          processedCount++;
        } catch (subError) {
          this.logger.error('Error processing expired subscription:', {
            subscriptionId: subscription.subscription_id,
            error: subError
          });
        }
      }

      return { success: true, processed: processedCount };
    } catch (error) {
      this.logger.error('Error processing expired subscriptions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply scheduled plan changes when their effective date has passed
   */
  async processScheduledPlanChanges() {
    try {
      const now = new Date();

      // Find subscriptions with scheduled plan changes
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans(*),
          organizations!inner (
            organization_id,
            name,
            owner_id
          )
        `)
        .not('metadata->scheduled_plan_change', 'is', null);

      if (error) {
        this.logger.error('Error fetching scheduled plan changes:', error);
        return { success: false, error: error.message };
      }

      let processedCount = 0;
      for (const subscription of subscriptions || []) {
        const scheduledChange = subscription.metadata?.scheduled_plan_change;
        if (!scheduledChange) continue;

        const effectiveDate = new Date(scheduledChange.effective_date);
        if (effectiveDate > now) continue; // Not yet time to apply

        try {
          // Get new plan details
          const { data: newPlan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('plan_id', scheduledChange.new_plan_id)
            .single();

          if (!newPlan) {
            this.logger.error('New plan not found for scheduled change:', {
              subscriptionId: subscription.subscription_id,
              planId: scheduledChange.new_plan_id
            });
            continue;
          }

          // Apply the plan change
          const newPeriodEnd = new Date(now);
          if (subscription.billing_cycle === 'yearly') {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
          } else {
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
          }

          // Determine new status based on plan price
          const newStatus = newPlan.price_monthly === 0 ? 'active' : 'pending_payment';

          await supabase
            .from('subscriptions')
            .update({
              plan_id: scheduledChange.new_plan_id,
              status: newStatus,
              amount: scheduledChange.new_amount,
              currency: scheduledChange.new_currency,
              current_period_start: now.toISOString(),
              current_period_end: newStatus === 'active' ? newPeriodEnd.toISOString() : null,
              updated_at: now.toISOString(),
              metadata: {
                ...subscription.metadata,
                scheduled_plan_change: null, // Clear the scheduled change
                plan_change_applied_at: now.toISOString(),
                previous_plan_id: subscription.plan_id
              }
            })
            .eq('subscription_id', subscription.subscription_id);

          // Log to history
          await supabase
            .from('subscription_history')
            .insert({
              subscription_id: subscription.subscription_id,
              organization_id: subscription.organization_id,
              previous_plan_id: subscription.plan_id,
              new_plan_id: scheduledChange.new_plan_id,
              change_type: newPlan.price_monthly > (subscription.subscription_plans?.price_monthly || 0) ? 'upgrade' : 'downgrade',
              reason: 'Scheduled plan change applied',
              changed_by: 'system_cron'
            });

          this.logger.info('Scheduled plan change applied:', {
            subscriptionId: subscription.subscription_id,
            previousPlan: subscription.plan_id,
            newPlan: scheduledChange.new_plan_id
          });

          processedCount++;
        } catch (changeError) {
          this.logger.error('Error applying scheduled plan change:', {
            subscriptionId: subscription.subscription_id,
            error: changeError
          });
        }
      }

      return { success: true, processed: processedCount };
    } catch (error) {
      this.logger.error('Error processing scheduled plan changes:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SubscriptionCronService();
