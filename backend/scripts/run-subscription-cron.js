#!/usr/bin/env node

/**
 * Subscription Cron Job Script
 *
 * This script can be executed via system cron or cloud scheduler.
 * It processes subscription lifecycle events.
 *
 * Usage:
 *   node scripts/run-subscription-cron.js
 *
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key
 *   RESEND_API_KEY - Resend API key for emails
 *
 * Recommended cron schedule:
 *   0 0 * * * - Run daily at midnight
 *   0 */6 * * * - Run every 6 hours
 *
 * Example crontab entry:
 *   0 0 * * * cd /path/to/backend && node scripts/run-subscription-cron.js >> /var/log/subscription-cron.log 2>&1
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const subscriptionCronService = require('../services/SubscriptionCronService');

async function main() {
  console.log('='.repeat(60));
  console.log(`Subscription Cron Job Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    const results = await subscriptionCronService.runAllTasks();

    console.log('\nResults:');
    console.log(JSON.stringify(results, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log(`Subscription Cron Job Completed: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\nError running subscription cron:', error);
    console.error('\n' + '='.repeat(60));
    console.error(`Subscription Cron Job Failed: ${new Date().toISOString()}`);
    console.error('='.repeat(60));

    process.exit(1);
  }
}

main();
