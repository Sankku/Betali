const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');
const mercadoPagoService = require('./MercadoPagoService');

/**
 * WebhookRetryService - Handles retrying failed webhook notifications
 *
 * This service:
 * 1. Finds failed webhooks in the database
 * 2. Attempts to reprocess them
 * 3. Implements exponential backoff
 * 4. Marks webhooks as permanently failed after max retries
 */
class WebhookRetryService {
  constructor() {
    this.logger = new Logger('WebhookRetryService');
    this.maxRetries = 5;
    this.baseDelayMinutes = 5; // 5, 10, 20, 40, 80 minutes
  }

  /**
   * Process all pending retry webhooks
   * Should be called by a cron job
   */
  async processRetryQueue() {
    this.logger.info('Processing webhook retry queue...');

    try {
      // Find webhooks that need retry
      const { data: failedWebhooks, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('processed', false)
        .eq('provider', 'mercadopago')
        .lt('retry_count', this.maxRetries)
        .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
        .order('created_at', { ascending: true })
        .limit(50); // Process in batches

      if (error) {
        this.logger.error('Error fetching failed webhooks:', error);
        return { success: false, error: error.message };
      }

      if (!failedWebhooks || failedWebhooks.length === 0) {
        this.logger.info('No webhooks pending retry');
        return { success: true, processed: 0 };
      }

      this.logger.info(`Found ${failedWebhooks.length} webhooks to retry`);

      let successCount = 0;
      let failCount = 0;

      for (const webhook of failedWebhooks) {
        const result = await this.retryWebhook(webhook);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      this.logger.info('Webhook retry processing completed:', {
        total: failedWebhooks.length,
        success: successCount,
        failed: failCount
      });

      return {
        success: true,
        processed: failedWebhooks.length,
        succeeded: successCount,
        failed: failCount
      };
    } catch (error) {
      this.logger.error('Error processing retry queue:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retry a single webhook
   */
  async retryWebhook(webhook) {
    const webhookId = webhook.id;
    const retryCount = (webhook.retry_count || 0) + 1;

    this.logger.info(`Retrying webhook ${webhookId}, attempt ${retryCount}/${this.maxRetries}`);

    try {
      // Get the original notification data
      const notification = webhook.event_data;

      if (!notification) {
        throw new Error('No event data found in webhook log');
      }

      // Attempt to process the notification
      const result = await mercadoPagoService.processWebhookNotification(notification);

      // Success - mark as processed
      await supabase
        .from('webhook_logs')
        .update({
          processed: true,
          retry_count: retryCount,
          last_retry_at: new Date().toISOString(),
          retry_result: {
            success: true,
            result,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', webhookId);

      this.logger.info(`Webhook ${webhookId} processed successfully on retry ${retryCount}`);

      return { success: true, webhookId };
    } catch (error) {
      this.logger.error(`Webhook ${webhookId} retry ${retryCount} failed:`, error);

      // Calculate next retry time with exponential backoff
      const delayMinutes = this.baseDelayMinutes * Math.pow(2, retryCount - 1);
      const nextRetryAt = new Date();
      nextRetryAt.setMinutes(nextRetryAt.getMinutes() + delayMinutes);

      const isPermanentlyFailed = retryCount >= this.maxRetries;

      // Update webhook with retry info
      await supabase
        .from('webhook_logs')
        .update({
          retry_count: retryCount,
          last_retry_at: new Date().toISOString(),
          next_retry_at: isPermanentlyFailed ? null : nextRetryAt.toISOString(),
          retry_result: {
            success: false,
            error: error.message,
            attempt: retryCount,
            permanently_failed: isPermanentlyFailed
          },
          // Mark as "processed" if max retries reached (give up)
          processed: isPermanentlyFailed
        })
        .eq('id', webhookId);

      if (isPermanentlyFailed) {
        this.logger.error(`Webhook ${webhookId} permanently failed after ${this.maxRetries} attempts`);
        await this.notifyPermanentFailure(webhook, error);
      } else {
        this.logger.info(`Webhook ${webhookId} scheduled for retry at ${nextRetryAt.toISOString()}`);
      }

      return { success: false, webhookId, error: error.message };
    }
  }

  /**
   * Mark a webhook for retry (called when initial processing fails)
   */
  async markForRetry(webhookId, error) {
    try {
      const nextRetryAt = new Date();
      nextRetryAt.setMinutes(nextRetryAt.getMinutes() + this.baseDelayMinutes);

      await supabase
        .from('webhook_logs')
        .update({
          processed: false,
          retry_count: 0,
          next_retry_at: nextRetryAt.toISOString(),
          retry_result: {
            initial_error: error.message,
            marked_for_retry_at: new Date().toISOString()
          }
        })
        .eq('id', webhookId);

      this.logger.info(`Webhook ${webhookId} marked for retry`);
    } catch (updateError) {
      this.logger.error(`Failed to mark webhook ${webhookId} for retry:`, updateError);
    }
  }

  /**
   * Notify administrators about permanently failed webhooks
   * This could send an email, Slack message, etc.
   */
  async notifyPermanentFailure(webhook, error) {
    try {
      // Log to a separate table for admin review
      await supabase
        .from('admin_alerts')
        .insert({
          type: 'webhook_permanent_failure',
          severity: 'high',
          title: 'MercadoPago webhook permanently failed',
          message: `Webhook ${webhook.id} failed after ${this.maxRetries} retry attempts`,
          data: {
            webhook_id: webhook.id,
            event_type: webhook.event_type,
            event_data: webhook.event_data,
            last_error: error.message,
            created_at: webhook.created_at
          },
          created_at: new Date().toISOString(),
          resolved: false
        });

      this.logger.info('Admin alert created for permanent webhook failure');

      // TODO: Could also send email notification here
      // await emailService.sendAdminAlert({ ... });
    } catch (alertError) {
      this.logger.error('Failed to create admin alert:', alertError);
    }
  }

  /**
   * Get retry queue status
   */
  async getQueueStatus() {
    try {
      // Pending retries
      const { count: pendingCount } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false)
        .eq('provider', 'mercadopago')
        .lt('retry_count', this.maxRetries);

      // Permanently failed
      const { count: failedCount } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .eq('processed', true)
        .eq('provider', 'mercadopago')
        .gte('retry_count', this.maxRetries);

      // Successfully processed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todaySuccess } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .eq('processed', true)
        .eq('provider', 'mercadopago')
        .lt('retry_count', this.maxRetries)
        .gte('created_at', today.toISOString());

      return {
        pendingRetries: pendingCount || 0,
        permanentlyFailed: failedCount || 0,
        processedToday: todaySuccess || 0
      };
    } catch (error) {
      this.logger.error('Error getting queue status:', error);
      return null;
    }
  }
}

module.exports = new WebhookRetryService();
