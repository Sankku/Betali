const mercadopago = require('mercadopago');
const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');
const emailService = require('./EmailService');

/**
 * MercadoPagoService - Handle all Mercado Pago payment operations
 *
 * Features:
 * - Create payment preferences (one-time and subscriptions)
 * - Process payment notifications via webhooks
 * - Manage subscription lifecycle
 * - Handle different payment methods (credit card, debit, cash, etc.)
 */
class MercadoPagoService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.logger = new Logger('MercadoPagoService');
  }

  /**
   * Initialize Mercado Pago client with credentials
   * Call this after environment variables are loaded
   */
  initialize() {
    if (this.initialized) return;

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN not configured. Payment processing will not work.');
      return;
    }

    try {
      this.client = new mercadopago.MercadoPagoConfig({
        accessToken: accessToken,
        options: {
          timeout: 5000,
          idempotencyKey: 'betali-' + Date.now()
        }
      });

      this.initialized = true;
      const env = accessToken.startsWith('APP-') ? 'PRODUCTION' : 'TEST';
      this.logger.info(`MercadoPago client initialized successfully [mode: ${env}]`);
    } catch (error) {
      this.logger.error('Failed to initialize MercadoPago client:', error);
      throw error;
    }
  }

  /**
   * Create a payment preference for one-time subscription payment
   *
   * @param {Object} params - Payment parameters
   * @param {string} params.subscriptionId - Internal subscription ID
   * @param {string} params.organizationId - Organization ID
   * @param {string} params.planId - Plan ID
   * @param {number} params.amount - Payment amount
   * @param {string} params.currency - Currency code (ARS, USD, etc.)
   * @param {string} params.billingCycle - 'monthly' or 'yearly'
   * @param {string} params.userEmail - User email
   * @param {string} params.organizationName - Organization name
   * @returns {Promise<Object>} Preference object with init_point URL
   */
  async createPaymentPreference({
    subscriptionId,
    organizationId,
    planId,
    amount,
    currency = 'ARS',
    billingCycle = 'monthly',
    userEmail,
    organizationName
  }) {
    this.initialize();

    if (!this.initialized) {
      throw new Error('MercadoPago service not initialized. Check credentials.');
    }

    try {
      const preference = new mercadopago.Preference(this.client);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      const preferenceData = {
        items: [
          {
            id: planId,
            title: `Betali - Plan ${billingCycle === 'yearly' ? 'Anual' : 'Mensual'}`,
            description: `Suscripción ${billingCycle === 'yearly' ? 'anual' : 'mensual'} al plan de Betali para ${organizationName}`,
            category_id: 'services',
            quantity: 1,
            unit_price: amount,
            currency_id: currency
          }
        ],
        payer: {
          email: userEmail,
          name: organizationName
        },
        back_urls: {
          success: `${frontendUrl}/payment/success?subscription_id=${subscriptionId}`,
          failure: `${frontendUrl}/payment/failure?subscription_id=${subscriptionId}`,
          pending: `${frontendUrl}/payment/pending?subscription_id=${subscriptionId}`
        },
        external_reference: subscriptionId,
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/webhooks/mercadopago`,
        statement_descriptor: 'BETALI SUBSCRIPTION',
        metadata: {
          subscription_id: subscriptionId,
          organization_id: organizationId,
          plan_id: planId,
          billing_cycle: billingCycle
        },
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: billingCycle === 'monthly' ? 1 : 12, // Allow installments for yearly
        },
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      this.logger.info('Creating MercadoPago preference:', {
        subscriptionId,
        organizationId,
        amount,
        currency
      });

      this.logger.info('Preference data:', JSON.stringify(preferenceData, null, 2));

      const response = await preference.create({ body: preferenceData });

      this.logger.info('MercadoPago preference created:', {
        preferenceId: response.id,
        initPoint: response.init_point
      });

      return {
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point
      };

    } catch (error) {
      this.logger.error('Error creating MercadoPago preference:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      throw new Error(`Failed to create payment preference: ${error.message}`);
    }
  }

  /**
   * Get payment information by payment ID
   *
   * @param {string} paymentId - Mercado Pago payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentInfo(paymentId) {
    this.initialize();

    if (!this.initialized) {
      throw new Error('MercadoPago service not initialized');
    }

    try {
      const payment = new mercadopago.Payment(this.client);
      const response = await payment.get({ id: paymentId });

      this.logger.info('Retrieved payment info:', {
        paymentId,
        status: response.status,
        statusDetail: response.status_detail
      });

      return response;
    } catch (error) {
      this.logger.error('Error retrieving payment info:', error);
      throw error;
    }
  }

  /**
   * Process webhook notification from Mercado Pago
   *
   * @param {Object} notification - Webhook notification data
   * @returns {Promise<Object>} Processing result
   */
  async processWebhookNotification(notification) {
    this.initialize();

    try {
      const { type, data, action } = notification;

      this.logger.info('Processing MercadoPago webhook:', {
        type,
        action,
        dataId: data?.id
      });

      // We're primarily interested in payment notifications
      if (type === 'payment') {
        const paymentId = data.id;
        const paymentInfo = await this.getPaymentInfo(paymentId);

        return await this.handlePaymentNotification(paymentInfo);
      }

      this.logger.info('Webhook notification processed (no action required):', { type });
      return { processed: false, reason: 'Not a payment notification' };

    } catch (error) {
      this.logger.error('Error processing webhook notification:', error);
      throw error;
    }
  }

  /**
   * Handle payment notification and update subscription status
   *
   * @param {Object} paymentInfo - Payment information from MP
   * @returns {Promise<Object>} Update result
   */
  async handlePaymentNotification(paymentInfo) {
    try {
      const {
        id: paymentId,
        status,
        status_detail: statusDetail,
        external_reference: subscriptionId,
        transaction_amount: amount,
        currency_id: currency,
        payment_method_id: paymentMethod,
        metadata
      } = paymentInfo;

      this.logger.info('Handling payment notification:', {
        paymentId,
        status,
        statusDetail,
        subscriptionId,
        amount
      });

      // Find the subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single();

      if (subError || !subscription) {
        this.logger.error('Subscription not found:', { subscriptionId, error: subError });
        throw new Error('Subscription not found');
      }

      // Check if this payment was already recorded by the synchronous processPayment endpoint.
      // When the Brick processes an approved payment, the controller records it immediately and
      // activates the subscription. The webhook firing afterward must not duplicate the record.
      const { data: existingPayment } = await supabase
        .from('manual_payments')
        .select('payment_id, status')
        .eq('transaction_reference', paymentId.toString())
        .maybeSingle();

      let internalPaymentId;

      if (existingPayment) {
        // Payment already recorded synchronously — just update the status if needed
        this.logger.info('Payment already recorded by processPayment endpoint, updating status only:', {
          paymentId,
          existingStatus: existingPayment.status,
          webhookStatus: status
        });

        await supabase
          .from('manual_payments')
          .update({
            status: this.mapPaymentStatus(status),
            confirmed_at: status === 'approved' ? new Date().toISOString() : null,
            confirmed_by: null
          })
          .eq('transaction_reference', paymentId.toString());

        internalPaymentId = existingPayment.payment_id;
      } else {
        // First time we're seeing this payment — insert it
        const { data: payment, error: paymentError } = await supabase
          .from('manual_payments')
          .insert({
            subscription_id: subscriptionId,
            organization_id: subscription.organization_id,
            amount,
            currency,
            payment_method: paymentMethod,
            status: this.mapPaymentStatus(status),
            payment_date: new Date().toISOString(),
            transaction_reference: paymentId.toString(),
            notes: `MercadoPago payment - Status: ${status} - Detail: ${statusDetail}`
          })
          .select()
          .single();

        if (paymentError) {
          this.logger.error('Error recording payment:', paymentError);
          throw paymentError;
        }

        internalPaymentId = payment.payment_id;
      }

      // Update subscription based on payment status
      if (status === 'approved') {
        return await this.activateSubscription(subscriptionId, paymentId, internalPaymentId);
      } else if (status === 'rejected' || status === 'cancelled') {
        return await this.rejectSubscription(subscriptionId, statusDetail);
      } else if (status === 'pending' || status === 'in_process') {
        return await this.pendingSubscription(subscriptionId, statusDetail);
      }

      return { processed: true, status: 'unknown' };

    } catch (error) {
      this.logger.error('Error handling payment notification:', error);
      throw error;
    }
  }

  /**
   * Activate subscription after successful payment
   *
   * @param {string} subscriptionId - Subscription ID
   * @param {string} mpPaymentId - Mercado Pago payment ID
   * @param {string} internalPaymentId - Internal payment record ID
   * @returns {Promise<Object>} Activation result
   */
  async activateSubscription(subscriptionId, mpPaymentId, internalPaymentId) {
    try {
      // Get subscription to determine billing cycle
      const { data: subscription } = await supabase
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
        .eq('subscription_id', subscriptionId)
        .single();

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Only activate if subscription is pending_payment
      if (subscription.status !== 'pending_payment') {
        this.logger.warn('Subscription not pending, skipping webhook activation:', {
          subscriptionId,
          currentStatus: subscription.status
        });
        return { processed: true, status: 'already_active' };
      }

      const now = new Date();
      const plan = subscription.subscription_plans;
      const trialDays = plan.trial_period_days || 0;
      const newStatus = trialDays > 0 ? 'trialing' : 'active';

      // Calculate period end
      let periodEnd = new Date(now);
      if (trialDays > 0) {
        periodEnd.setDate(periodEnd.getDate() + trialDays);
      } else {
        const billingCycle = subscription.billing_cycle || 'monthly';
        if (billingCycle === 'monthly') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }
      }

      // Update subscription to trialing/active
      const { data: updatedSubscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: newStatus,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_end: trialDays > 0 ? periodEnd.toISOString() : null,
          start_date: now.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          activated_by: 'system_mercadopago',
          updated_at: now.toISOString()
        })
        .eq('subscription_id', subscriptionId)
        .select()
        .single();

      if (updateError) {
        this.logger.error('Error activating subscription:', updateError);
        throw updateError;
      }

      // Confirm the payment
      await supabase
        .from('manual_payments')
        .update({
          status: 'confirmed',
          confirmed_at: now.toISOString(),
          confirmed_by: 'system_mercadopago'
        })
        .eq('payment_id', internalPaymentId);

      // Log to subscription history
      await supabase
        .from('subscription_history')
        .insert({
          subscription_id: subscriptionId,
          organization_id: subscription.organization_id,
          previous_plan_id: null,
          new_plan_id: subscription.plan_id,
          change_type: 'activation',
          reason: `Activated via MercadoPago payment ${mpPaymentId}`,
          changed_by: 'system_mercadopago'
        });

      // Send payment success email to organization owner
      try {
        const ownerId = subscription.organizations?.owner_id;
        if (ownerId) {
          // Get owner's email from auth.users
          const { data: ownerData } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', ownerId)
            .single();

          if (ownerData?.email) {
            // Get payment amount from manual_payments
            const { data: paymentData } = await supabase
              .from('manual_payments')
              .select('amount, currency')
              .eq('payment_id', internalPaymentId)
              .single();

            await emailService.sendPaymentSuccessEmail({
              to: ownerData.email,
              userName: ownerData.name || ownerData.email.split('@')[0],
              planName: plan.name || plan.display_name || 'Suscripción',
              amount: paymentData?.amount || 0,
              currency: paymentData?.currency || 'ARS',
              nextBillingDate: periodEnd.toISOString()
            });
            this.logger.info('Payment success email sent via webhook:', { email: ownerData.email });
          }
        }
      } catch (emailError) {
        // Don't fail the activation if email fails
        this.logger.error('Failed to send payment success email via webhook:', emailError);
      }

      this.logger.info('Subscription activated successfully:', {
        subscriptionId,
        mpPaymentId,
        periodEnd: periodEnd.toISOString()
      });

      return {
        success: true,
        subscription: updatedSubscription,
        message: 'Subscription activated successfully'
      };

    } catch (error) {
      this.logger.error('Error activating subscription:', error);
      throw error;
    }
  }

  /**
   * Handle rejected payment
   *
   * IMPORTANT: We do NOT change the subscription status to 'canceled' here.
   * A rejected payment means "this attempt failed, please try another card".
   * The subscription must stay 'pending_payment' so the user can retry.
   * Only explicit user cancellation (cancelSubscription) sets status to 'canceled'.
   */
  async rejectSubscription(subscriptionId, reason) {
    try {
      // Get subscription with organization and plan details for email
      const { data: subscription } = await supabase
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
        .eq('subscription_id', subscriptionId)
        .single();

      // Keep subscription as pending_payment — user can retry with another card.
      // Just record the rejection in metadata for auditing.
      await supabase
        .from('subscriptions')
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            ...subscription?.metadata,
            last_rejection_reason: reason,
            last_rejected_at: new Date().toISOString()
          }
        })
        .eq('subscription_id', subscriptionId);

      // Send payment failed email to organization owner
      if (subscription?.organizations?.owner_id) {
        try {
          const { data: ownerData } = await supabase
            .from('users')
            .select('email, name')
            .eq('id', subscription.organizations.owner_id)
            .single();

          if (ownerData?.email) {
            const plan = subscription.subscription_plans;
            await emailService.sendPaymentFailedEmail({
              to: ownerData.email,
              userName: ownerData.name || ownerData.email.split('@')[0],
              planName: plan?.name || plan?.display_name || 'Suscripción',
              amount: subscription.amount || 0,
              currency: subscription.currency || 'ARS',
              reason: reason || 'El pago fue rechazado'
            });
            this.logger.info('Payment failed email sent via webhook:', { email: ownerData.email });
          }
        } catch (emailError) {
          this.logger.error('Failed to send payment failed email:', emailError);
        }
      }

      this.logger.info('Payment rejected — subscription kept as pending_payment for retry:', {
        subscriptionId,
        reason
      });

      return {
        success: true,
        message: 'Payment rejected; subscription remains pending_payment so user can retry'
      };
    } catch (error) {
      this.logger.error('Error rejecting subscription:', error);
      throw error;
    }
  }

  /**
   * Handle pending payment
   */
  async pendingSubscription(subscriptionId, reason) {
    try {
      await supabase
        .from('subscriptions')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      this.logger.info('Subscription pending:', { subscriptionId, reason });

      return {
        success: true,
        message: 'Subscription status updated to pending'
      };
    } catch (error) {
      this.logger.error('Error updating subscription to pending:', error);
      throw error;
    }
  }

  /**
   * Map MercadoPago payment status to our internal status
   */
  mapPaymentStatus(mpStatus) {
    const statusMap = {
      'approved': 'confirmed',
      'pending': 'pending',
      'in_process': 'pending',
      'rejected': 'failed',
      'cancelled': 'failed',
      'refunded': 'failed',
      'charged_back': 'failed'
    };

    return statusMap[mpStatus] || 'pending';
  }

  /**
   * Cancel a subscription (for future use with recurring payments)
   *
   * @param {string} subscriptionId - Internal subscription ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSubscription(subscriptionId) {
    try {
      const now = new Date();

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('subscription_id', subscriptionId)
        .select()
        .single();

      if (error) {
        this.logger.error('Error cancelling subscription:', error);
        throw error;
      }

      this.logger.info('Subscription cancelled:', { subscriptionId });

      return {
        success: true,
        subscription,
        message: 'Subscription cancelled successfully'
      };

    } catch (error) {
      this.logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Get supported payment methods for a country
   *
   * @param {string} countryCode - ISO country code (AR, BR, MX, etc.)
   * @returns {Array} Available payment methods
   */
  getSupportedPaymentMethods(countryCode = 'AR') {
    const methodsByCountry = {
      AR: ['credit_card', 'debit_card', 'ticket', 'bank_transfer'],
      BR: ['credit_card', 'debit_card', 'boleto', 'pix'],
      MX: ['credit_card', 'debit_card', 'oxxo', 'bank_transfer'],
      CL: ['credit_card', 'debit_card', 'khipu'],
      CO: ['credit_card', 'debit_card', 'pse', 'efecty'],
      UY: ['credit_card', 'debit_card', 'redpagos'],
      PE: ['credit_card', 'debit_card', 'pagoefectivo']
    };

    return methodsByCountry[countryCode] || methodsByCountry.AR;
  }

  /**
   * Process payment from Payment Brick
   *
   * @param {Object} paymentData - Payment data from brick
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentData) {
    this.initialize();

    if (!this.initialized) {
      throw new Error('MercadoPago service not initialized. Check credentials.');
    }

    try {
      this.logger.info('Processing payment:', {
        amount: paymentData.transaction_amount,
        paymentMethod: paymentData.payment_method_id
      });

      const payment = new mercadopago.Payment(this.client);
      const result = await payment.create({ body: paymentData });

      this.logger.info('Payment created:', {
        id: result.id,
        status: result.status
      });

      return result;
    } catch (error) {
      this.logger.error('Error processing payment:', error);
      throw error;
    }
  }
}

module.exports = new MercadoPagoService();
