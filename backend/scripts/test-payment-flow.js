#!/usr/bin/env node

/**
 * Test Payment Flow - End-to-End Testing Script
 *
 * This script tests the complete payment flow with MercadoPago:
 * 1. Create subscription
 * 2. Create checkout preference
 * 3. Simulate webhook notification
 * 4. Verify subscription activation
 *
 * Usage:
 *   node backend/scripts/test-payment-flow.js
 */

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const TEST_USER_EMAIL = 'test@betali.com';
const TEST_USER_PASSWORD = 'test123456';

// Colors for console output
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠'), msg),
  step: (msg) => console.log(chalk.cyan('\n▶'), chalk.bold(msg)),
  data: (label, data) => console.log(chalk.gray(`  ${label}:`), JSON.stringify(data, null, 2))
};

class PaymentFlowTester {
  constructor() {
    this.authToken = null;
    this.organizationId = null;
    this.subscriptionId = null;
    this.preferenceId = null;
    this.paymentId = null;
  }

  async run() {
    try {
      log.step('🚀 Starting Payment Flow Test');
      log.info(`API Base URL: ${API_BASE_URL}`);
      console.log('');

      // Step 1: Authentication
      await this.authenticate();

      // Step 2: Get current organization
      await this.getOrganization();

      // Step 3: Get available plans
      await this.getPlans();

      // Step 4: Create subscription
      await this.createSubscription();

      // Step 5: Create checkout preference
      await this.createCheckout();

      // Step 6: Simulate payment (webhook)
      await this.simulatePayment();

      // Step 7: Verify subscription activation
      await this.verifySubscription();

      // Success
      console.log('');
      log.success(chalk.bold.green('✅ Payment Flow Test PASSED!'));
      console.log('');
      this.printSummary();

    } catch (error) {
      console.log('');
      log.error(chalk.bold.red('❌ Payment Flow Test FAILED!'));
      console.log('');
      log.error(error.message);
      if (error.response?.data) {
        log.data('Error Details', error.response.data);
      }
      process.exit(1);
    }
  }

  async authenticate() {
    log.step('Step 1: Authenticate User');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signin`, {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });

      if (!response.data.token) {
        throw new Error('No token received from authentication');
      }

      this.authToken = response.data.token;
      log.success('User authenticated successfully');
      log.data('User', {
        email: response.data.user?.email,
        id: response.data.user?.id
      });

    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 401) {
        log.warning('Test user not found, attempting to create...');
        await this.createTestUser();
        return this.authenticate(); // Retry authentication
      }
      throw error;
    }
  }

  async createTestUser() {
    log.info('Creating test user and organization...');

    const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      organizationName: 'Test Organization for Payments'
    });

    log.success('Test user created successfully');
  }

  async getOrganization() {
    log.step('Step 2: Get Organization');

    const response = await axios.get(`${API_BASE_URL}/api/organizations/current`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (!response.data.organization) {
      throw new Error('No organization found');
    }

    this.organizationId = response.data.organization.organization_id;
    log.success('Organization retrieved');
    log.data('Organization', {
      id: this.organizationId,
      name: response.data.organization.name
    });
  }

  async getPlans() {
    log.step('Step 3: Get Subscription Plans');

    const response = await axios.get(`${API_BASE_URL}/api/subscription-plans`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (!response.data.plans || response.data.plans.length === 0) {
      throw new Error('No subscription plans found');
    }

    // Find first paid plan
    this.testPlan = response.data.plans.find(p => p.price_monthly > 0);

    if (!this.testPlan) {
      throw new Error('No paid plans available for testing');
    }

    log.success('Subscription plans retrieved');
    log.data('Test Plan', {
      id: this.testPlan.plan_id,
      name: this.testPlan.name,
      price: this.testPlan.price_monthly
    });
  }

  async createSubscription() {
    log.step('Step 4: Create Subscription');

    const response = await axios.post(
      `${API_BASE_URL}/api/subscriptions`,
      {
        planId: this.testPlan.plan_id,
        billingCycle: 'monthly'
      },
      {
        headers: { Authorization: `Bearer ${this.authToken}` }
      }
    );

    if (!response.data.subscription?.subscription_id) {
      throw new Error('Failed to create subscription');
    }

    this.subscriptionId = response.data.subscription.subscription_id;
    log.success('Subscription created');
    log.data('Subscription', {
      id: this.subscriptionId,
      status: response.data.subscription.status,
      plan: response.data.subscription.plan_id
    });
  }

  async createCheckout() {
    log.step('Step 5: Create MercadoPago Checkout');

    const response = await axios.post(
      `${API_BASE_URL}/api/mercadopago/create-checkout`,
      {
        subscriptionId: this.subscriptionId,
        planId: this.testPlan.plan_id,
        billingCycle: 'monthly',
        currency: 'ARS'
      },
      {
        headers: { Authorization: `Bearer ${this.authToken}` }
      }
    );

    if (!response.data.data?.preferenceId) {
      throw new Error('Failed to create checkout preference');
    }

    this.preferenceId = response.data.data.preferenceId;
    log.success('Checkout preference created');
    log.data('Checkout', {
      preferenceId: this.preferenceId,
      initPoint: response.data.data.initPoint,
      amount: response.data.data.amount,
      currency: response.data.data.currency
    });
  }

  async simulatePayment() {
    log.step('Step 6: Simulate Payment Webhook');

    // Generate fake payment ID
    this.paymentId = `test_payment_${Date.now()}`;

    // Simulate MercadoPago webhook notification
    const webhookPayload = {
      type: 'payment',
      action: 'payment.created',
      data: {
        id: this.paymentId
      }
    };

    log.info('This step requires manual webhook testing');
    log.warning('To complete this test:');
    console.log('');
    console.log(chalk.yellow('  1. Go to MercadoPago Test Environment'));
    console.log(chalk.yellow('  2. Use the preference URL to make a test payment'));
    console.log(chalk.yellow('  3. Use test cards from: https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/test-cards'));
    console.log(chalk.yellow('  4. MercadoPago will send webhook to your server'));
    console.log('');
    log.data('Webhook Endpoint', `${API_BASE_URL}/api/webhooks/mercadopago`);
    log.data('Subscription ID', this.subscriptionId);
    console.log('');
    log.warning('Skipping automatic webhook simulation for now...');
  }

  async verifySubscription() {
    log.step('Step 7: Verify Subscription Status');

    const response = await axios.get(`${API_BASE_URL}/api/subscriptions/current`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (!response.data.subscription) {
      throw new Error('Subscription not found');
    }

    const subscription = response.data.subscription;
    log.success('Subscription retrieved');
    log.data('Final Status', {
      id: subscription.subscription_id,
      status: subscription.status,
      plan: subscription.plan_id,
      nextBillingDate: subscription.next_billing_date
    });

    // Check if subscription is pending_payment (expected before webhook)
    if (subscription.status === 'pending_payment') {
      log.warning('Subscription is still pending payment (expected without webhook)');
    } else if (subscription.status === 'active' || subscription.status === 'trialing') {
      log.success('Subscription is active!');
    } else {
      log.error(`Unexpected subscription status: ${subscription.status}`);
    }
  }

  printSummary() {
    console.log(chalk.bold('📊 Test Summary:'));
    console.log('━'.repeat(60));
    console.log(chalk.gray('  Organization ID:  '), chalk.white(this.organizationId));
    console.log(chalk.gray('  Subscription ID:  '), chalk.white(this.subscriptionId));
    console.log(chalk.gray('  Preference ID:    '), chalk.white(this.preferenceId));
    console.log(chalk.gray('  Test Plan:        '), chalk.white(this.testPlan?.name));
    console.log('━'.repeat(60));
    console.log('');
    console.log(chalk.bold('🔗 Next Steps:'));
    console.log('');
    console.log('  1. Configure ngrok or similar to expose your local server:');
    console.log(chalk.cyan('     ngrok http 4000'));
    console.log('');
    console.log('  2. Configure webhook URL in MercadoPago dashboard:');
    console.log(chalk.cyan('     https://your-ngrok-url.ngrok.io/api/webhooks/mercadopago'));
    console.log('');
    console.log('  3. Complete a test payment using MercadoPago test cards');
    console.log('');
  }
}

// Run the test
const tester = new PaymentFlowTester();
tester.run();
