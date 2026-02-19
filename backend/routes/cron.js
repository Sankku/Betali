const express = require('express');
const router = express.Router();
const subscriptionCronService = require('../services/SubscriptionCronService');
const webhookRetryService = require('../services/WebhookRetryService');
const { Logger } = require('../utils/Logger');

const logger = new Logger('CronRoutes');

/**
 * Middleware to verify cron secret
 */
function verifyCronSecret(req, res, next) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'];

  if (cronSecret && providedSecret !== cronSecret) {
    logger.warn('Unauthorized cron attempt:', {
      ip: req.ip,
      endpoint: req.path
    });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  next();
}

/**
 * Cron job endpoints - These should be protected in production
 * Either by:
 * 1. Internal network only access
 * 2. Secret key/token validation
 * 3. IP whitelist
 */

/**
 * Run all subscription cron tasks
 * POST /api/cron/subscriptions/process
 *
 * Headers required:
 * - x-cron-secret: The CRON_SECRET environment variable value
 */
router.post('/subscriptions/process', async (req, res) => {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers['x-cron-secret'];

    if (cronSecret && providedSecret !== cronSecret) {
      logger.warn('Unauthorized cron attempt:', {
        ip: req.ip,
        providedSecret: providedSecret ? '[REDACTED]' : 'none'
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    logger.info('Starting subscription cron job via API...');

    const results = await subscriptionCronService.runAllTasks();

    logger.info('Subscription cron job completed:', results);

    return res.status(200).json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error running subscription cron:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Run specific cron task
 * POST /api/cron/subscriptions/:task
 *
 * Available tasks:
 * - trial-expiring: Send reminders for expiring trials
 * - trial-expired: Process expired trials
 * - subscriptions-expiring: Send reminders for expiring subscriptions
 * - subscriptions-expired: Process expired subscriptions
 * - plan-changes: Apply scheduled plan changes
 */
router.post('/subscriptions/:task', async (req, res) => {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers['x-cron-secret'];

    if (cronSecret && providedSecret !== cronSecret) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const { task } = req.params;
    let result;

    switch (task) {
      case 'trial-expiring':
        result = await subscriptionCronService.processTrialExpiring();
        break;
      case 'trial-expired':
        result = await subscriptionCronService.processTrialExpired();
        break;
      case 'subscriptions-expiring':
        result = await subscriptionCronService.processSubscriptionsExpiring();
        break;
      case 'subscriptions-expired':
        result = await subscriptionCronService.processSubscriptionsExpired();
        break;
      case 'plan-changes':
        result = await subscriptionCronService.processScheduledPlanChanges();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown task: ${task}`
        });
    }

    logger.info(`Cron task ${task} completed:`, result);

    return res.status(200).json({
      success: true,
      task,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error running cron task ${req.params.task}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check for cron jobs
 * GET /api/cron/health
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Cron service is healthy',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// WEBHOOK RETRY ENDPOINTS
// ============================================================================

/**
 * Process webhook retry queue
 * POST /api/cron/webhooks/retry
 *
 * Processes all failed webhooks that are due for retry
 */
router.post('/webhooks/retry', verifyCronSecret, async (req, res) => {
  try {
    logger.info('Starting webhook retry processing...');

    const results = await webhookRetryService.processRetryQueue();

    logger.info('Webhook retry processing completed:', results);

    return res.status(200).json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error processing webhook retries:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get webhook retry queue status
 * GET /api/cron/webhooks/status
 */
router.get('/webhooks/status', verifyCronSecret, async (req, res) => {
  try {
    const status = await webhookRetryService.getQueueStatus();

    return res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting webhook status:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Run ALL cron tasks (subscriptions + webhooks)
 * POST /api/cron/all
 */
router.post('/all', verifyCronSecret, async (req, res) => {
  try {
    logger.info('Starting all cron tasks...');

    const [subscriptionResults, webhookResults] = await Promise.all([
      subscriptionCronService.runAllTasks(),
      webhookRetryService.processRetryQueue()
    ]);

    const results = {
      subscriptions: subscriptionResults,
      webhooks: webhookResults
    };

    logger.info('All cron tasks completed:', results);

    return res.status(200).json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error running all cron tasks:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
