const mercadoPagoService = require('../services/MercadoPagoService');
const emailService = require('../services/EmailService');
const webhookRetryService = require('../services/WebhookRetryService');
const receiptService = require('../services/ReceiptService');
const { Logger } = require('../utils/Logger');
const supabase = require('../lib/supabaseClient');

/**
 * MercadoPagoController - HTTP handlers for MercadoPago payment operations
 */
class MercadoPagoController {
  constructor() {
    this.logger = new Logger('MercadoPagoController');
  }

  /**
   * Create checkout preference for subscription payment
   * POST /api/mercadopago/create-checkout
   *
   * Request body:
   * {
   *   subscriptionId: string,
   *   planId: string,
   *   billingCycle: 'monthly' | 'yearly',
   *   currency: 'ARS' | 'USD' | etc
   * }
   */
  async createCheckout(req, res, next) {
    try {
      const { subscriptionId, planId, billingCycle = 'monthly', currency = 'ARS' } = req.body;
      const user = req.user;

      // Validation
      if (!subscriptionId || !planId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: subscriptionId, planId'
        });
      }

      this.logger.info('Creating MercadoPago checkout:', {
        userId: user.id,
        subscriptionId,
        planId,
        billingCycle,
        currency
      });

      // Get subscription details
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          organizations!inner (
            organization_id,
            name
          )
        `)
        .eq('subscription_id', subscriptionId)
        .single();

      if (subError || !subscription) {
        this.logger.error('Subscription not found:', { subscriptionId, error: subError });
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      // Verify user belongs to this organization
      if (subscription.organization_id !== user.currentOrganizationId) {
        this.logger.warn('Unauthorized checkout attempt:', {
          userId: user.id,
          userOrgId: user.currentOrganizationId,
          subscriptionOrgId: subscription.organization_id
        });
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to process this payment'
        });
      }

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_id', planId)
        .single();

      if (planError || !plan) {
        this.logger.error('Plan not found:', { planId, error: planError });
        return res.status(404).json({
          success: false,
          error: 'Subscription plan not found'
        });
      }

      // Calculate amount based on billing cycle
      const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

      if (amount === 0) {
        return res.status(400).json({
          success: false,
          error: 'Free plans do not require payment'
        });
      }

      // Create MercadoPago preference
      const preference = await mercadoPagoService.createPaymentPreference({
        subscriptionId: subscription.subscription_id,
        organizationId: subscription.organization_id,
        planId: plan.plan_id,
        amount,
        currency,
        billingCycle,
        userEmail: user.email,
        organizationName: subscription.organizations.name
      });

      // Update subscription with MP preference ID
      await supabase
        .from('subscriptions')
        .update({
          payment_provider: 'mercadopago',
          provider_subscription_id: preference.preferenceId,
          currency,
          billing_cycle: billingCycle,
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      this.logger.info('Checkout created successfully:', {
        subscriptionId,
        preferenceId: preference.preferenceId
      });

      return res.status(200).json({
        success: true,
        data: {
          preferenceId: preference.preferenceId,
          initPoint: preference.initPoint,
          sandboxInitPoint: preference.sandboxInitPoint,
          subscriptionId: subscription.subscription_id,
          amount,
          currency,
          billingCycle
        },
        message: 'Checkout preference created successfully'
      });

    } catch (error) {
      this.logger.error('Error creating checkout:', error);
      next(error);
    }
  }

  /**
   * Get payment status
   * GET /api/mercadopago/payment/:paymentId
   */
  async getPaymentStatus(req, res, next) {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: 'Payment ID is required'
        });
      }

      this.logger.info('Fetching payment status:', { paymentId });

      const paymentInfo = await mercadoPagoService.getPaymentInfo(paymentId);

      return res.status(200).json({
        success: true,
        data: {
          id: paymentInfo.id,
          status: paymentInfo.status,
          statusDetail: paymentInfo.status_detail,
          amount: paymentInfo.transaction_amount,
          currency: paymentInfo.currency_id,
          paymentMethod: paymentInfo.payment_method_id,
          paymentType: paymentInfo.payment_type_id,
          dateCreated: paymentInfo.date_created,
          dateApproved: paymentInfo.date_approved,
          externalReference: paymentInfo.external_reference
        }
      });

    } catch (error) {
      this.logger.error('Error fetching payment status:', error);
      next(error);
    }
  }

  /**
   * Handle webhook notifications from Mercado Pago
   * POST /api/webhooks/mercadopago
   *
   * This endpoint receives payment notifications and processes them
   */
  async handleWebhook(req, res, next) {
    let webhookLogId = null;

    try {
      const notification = req.body;

      this.logger.info('Received MercadoPago webhook:', {
        type: notification.type,
        action: notification.action,
        dataId: notification.data?.id
      });

      // Log webhook to database for debugging and get the log ID
      webhookLogId = await this.logWebhook(notification, req.headers, req);

      // Process the notification
      const result = await mercadoPagoService.processWebhookNotification(notification);

      this.logger.info('Webhook processed successfully:', result);

      // Always return 200 to MP to acknowledge receipt
      return res.status(200).json({
        success: true,
        message: 'Webhook received and processed'
      });

    } catch (error) {
      this.logger.error('Error processing webhook:', error);

      // Mark webhook for retry if we have the log ID
      if (webhookLogId) {
        await webhookRetryService.markForRetry(webhookLogId, error);
        this.logger.info('Webhook marked for retry:', { webhookLogId });
      }

      // Still return 200 to prevent MP from retrying (we handle retries ourselves)
      return res.status(200).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Log webhook notification to database for debugging
   * @returns {string|null} The webhook log ID for retry tracking
   */
  async logWebhook(notification, headers, req) {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .insert({
          provider: 'mercadopago',
          event_type: notification.type,
          event_data: notification,
          headers: {
            'x-signature': headers['x-signature'] ? '[PRESENT]' : '[MISSING]',
            'x-request-id': headers['x-request-id']
          },
          processed: true,
          retry_count: 0,
          created_at: new Date().toISOString()
        })
        .select('webhook_log_id')
        .single();

      if (error) {
        this.logger.error('Error logging webhook:', error);
        return null;
      }

      return data?.webhook_log_id || null;
    } catch (error) {
      this.logger.error('Error logging webhook:', error);
      return null;
      // Don't throw - logging failure shouldn't break webhook processing
    }
  }

  /**
   * Get subscription payment history
   * GET /api/mercadopago/subscription/:subscriptionId/payments
   */
  async getSubscriptionPayments(req, res, next) {
    try {
      const { subscriptionId } = req.params;
      const user = req.user;

      // Get subscription and verify ownership
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single();

      if (subError || !subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      if (subscription.organization_id !== user.currentOrganizationId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Get payment history
      const { data: payments, error: paymentsError } = await supabase
        .from('manual_payments')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        throw paymentsError;
      }

      return res.status(200).json({
        success: true,
        data: payments,
        count: payments.length
      });

    } catch (error) {
      this.logger.error('Error fetching subscription payments:', error);
      next(error);
    }
  }

  /**
   * Cancel a subscription
   * POST /api/mercadopago/subscription/:subscriptionId/cancel
   */
  async cancelSubscription(req, res, next) {
    try {
      const { subscriptionId } = req.params;
      const user = req.user;
      const { reason } = req.body;

      // Verify ownership
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single();

      if (subError || !subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      if (subscription.organization_id !== user.currentOrganizationId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Cancel subscription
      const result = await mercadoPagoService.cancelSubscription(subscriptionId);

      // Log to history
      await supabase
        .from('subscription_history')
        .insert({
          subscription_id: subscriptionId,
          organization_id: subscription.organization_id,
          previous_plan_id: subscription.plan_id,
          new_plan_id: null,
          change_type: 'cancellation',
          reason: reason || 'User cancelled subscription',
          changed_by: user.id
        });

      this.logger.info('Subscription cancelled:', {
        subscriptionId,
        userId: user.id,
        reason
      });

      return res.status(200).json({
        success: true,
        data: result.subscription,
        message: 'Subscription cancelled successfully'
      });

    } catch (error) {
      this.logger.error('Error cancelling subscription:', error);
      next(error);
    }
  }

  /**
   * Get supported payment methods for a country
   * GET /api/mercadopago/payment-methods/:countryCode
   */
  async getPaymentMethods(req, res, next) {
    try {
      const { countryCode = 'AR' } = req.params;

      const methods = mercadoPagoService.getSupportedPaymentMethods(countryCode);

      return res.status(200).json({
        success: true,
        data: {
          country: countryCode,
          methods
        }
      });

    } catch (error) {
      this.logger.error('Error fetching payment methods:', error);
      next(error);
    }
  }

  /**
   * Process payment from Payment Brick
   * POST /api/mercadopago/process-payment
   */
  async processPayment(req, res, next) {
    try {
      const { paymentData, subscriptionId, amount, currency } = req.body;
      const user = req.user;

      this.logger.info('Processing Payment Brick payment:', {
        userId: user.id,
        subscriptionId,
        amount,
        currency,
        paymentData
      });

      // Get subscription details with plan info
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans!inner (
            plan_id,
            name,
            price_monthly,
            price_yearly
          )
        `)
        .eq('subscription_id', subscriptionId)
        .single();

      if (subError || !subscription) {
        this.logger.error('Subscription not found:', subError);
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      // Verify user belongs to this organization
      if (subscription.organization_id !== user.currentOrganizationId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Verify subscription is in pending_payment status
      if (subscription.status !== 'pending_payment') {
        this.logger.warn('Subscription is not pending payment:', {
          subscriptionId,
          currentStatus: subscription.status
        });
        return res.status(400).json({
          success: false,
          error: `Subscription status is ${subscription.status}, not pending_payment`
        });
      }

      // Extract the actual payment data from the brick's formData
      // The brick sends: { paymentType, selectedPaymentMethod, formData: {...actual payment data} }
      const actualPaymentData = paymentData.formData || paymentData;

      this.logger.info('Extracted payment data:', actualPaymentData);

      const plan = subscription.subscription_plans;
      const billingCycle = subscription.billing_cycle || 'monthly';
      const planPrice = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

      // Process payment with MercadoPago
      const payment = await mercadoPagoService.processPayment({
        ...actualPaymentData,
        description: `Betali - Plan ${plan.name} (${billingCycle === 'yearly' ? 'Anual' : 'Mensual'})`,
        external_reference: subscriptionId,
        metadata: {
          subscription_id: subscriptionId,
          organization_id: subscription.organization_id
        },
        additional_info: {
          items: [
            {
              id: plan.plan_id,
              title: `Betali - Plan ${plan.name}`,
              description: `Suscripción ${billingCycle === 'yearly' ? 'anual' : 'mensual'} al plan ${plan.name} de Betali`,
              category_id: 'services',
              quantity: 1,
              unit_price: amount ?? planPrice
            }
          ]
        }
      });

      this.logger.info('Payment processed:', {
        paymentId: payment.id,
        status: payment.status
      });

      // Record payment in database.
      // NOTE: errors here are logged but do NOT abort the response — the payment
      // already happened in MP and we must not leave the subscription stuck.
      const { error: paymentInsertError } = await supabase
        .from('manual_payments')
        .insert({
          subscription_id: subscriptionId,
          organization_id: subscription.organization_id,
          amount: payment.transaction_amount ?? amount,
          currency: payment.currency_id ?? currency,
          payment_method: payment.payment_method_id ?? null,
          status: payment.status === 'approved' ? 'confirmed' : payment.status,
          payment_date: new Date().toISOString(),
          confirmed_at: payment.status === 'approved' ? new Date().toISOString() : null,
          transaction_reference: payment.id.toString(),
          notes: `MercadoPago payment ID: ${payment.id}`,
          recorded_by: req.user.id
        });

      if (paymentInsertError) {
        // Log but continue — subscription activation is more important than the audit record.
        // The webhook will attempt to record it again when it arrives.
        this.logger.error('Failed to record payment in manual_payments (non-fatal):', {
          paymentId: payment.id,
          subscriptionId,
          error: paymentInsertError
        });
      }

      // Update subscription if payment approved
      if (payment.status === 'approved') {
        const now = new Date();
        const plan = subscription.subscription_plans;
        const trialDays = plan.trial_period_days || 0;

        // Determine subscription status based on trial period
        const newStatus = trialDays > 0 ? 'trialing' : 'active';

        // Calculate period end based on trial or billing cycle
        let periodEnd;
        if (trialDays > 0) {
          // Trial period
          periodEnd = new Date(now);
          periodEnd.setDate(periodEnd.getDate() + trialDays);
        } else {
          // Regular billing (30 days for monthly)
          periodEnd = new Date(now);
          periodEnd.setDate(periodEnd.getDate() + 30);
        }

        this.logger.info('Activating subscription after payment:', {
          subscriptionId,
          newStatus,
          trialDays,
          periodStart: now.toISOString(),
          periodEnd: periodEnd.toISOString()
        });

        const { error: activationError } = await supabase
          .from('subscriptions')
          .update({
            status: newStatus,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_end: trialDays > 0 ? periodEnd.toISOString() : null,
            updated_at: now.toISOString(),
            metadata: {
              ...subscription.metadata,
              pending_payment: false,
              payment_confirmed_at: now.toISOString(),
              first_payment_id: payment.id.toString()
            }
          })
          .eq('subscription_id', subscriptionId);

        if (activationError) {
          this.logger.error('CRITICAL: Failed to activate subscription after approved payment:', {
            subscriptionId,
            paymentId: payment.id,
            error: activationError
          });
          // Re-throw so the catch block returns a 500 and the frontend doesn't navigate
          // to the success page with a still-pending subscription
          throw new Error(`Subscription activation failed: ${activationError.message}`);
        }

        // Sync organizations table so limitEnforcement middleware reads the correct plan
        const { error: orgSyncError } = await supabase
          .from('organizations')
          .update({
            subscription_plan: plan.name,
            subscription_status: newStatus,
            updated_at: now.toISOString()
          })
          .eq('organization_id', subscription.organization_id);

        if (orgSyncError) {
          // Non-fatal: subscription is activated, limits will be stale until next manual sync
          this.logger.error('Failed to sync organizations.subscription_plan after payment:', {
            subscriptionId,
            organizationId: subscription.organization_id,
            planName: plan.name,
            error: orgSyncError
          });
        } else {
          this.logger.info('Synced organizations.subscription_plan:', {
            organizationId: subscription.organization_id,
            planName: plan.name,
            status: newStatus
          });
        }

        // Send payment success email
        try {
          await emailService.sendPaymentSuccessEmail({
            to: user.email,
            userName: user.name || user.email.split('@')[0],
            planName: plan.name || plan.display_name || 'Suscripción',
            amount: payment.transaction_amount,
            currency: payment.currency_id || currency,
            nextBillingDate: periodEnd.toISOString()
          });
          this.logger.info('Payment success email sent:', { userId: user.id, email: user.email });
        } catch (emailError) {
          // Don't fail the payment if email fails
          this.logger.error('Failed to send payment success email:', emailError);
        }
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        // Send payment failed email
        try {
          const plan = subscription.subscription_plans;
          await emailService.sendPaymentFailedEmail({
            to: user.email,
            userName: user.name || user.email.split('@')[0],
            planName: plan.name || plan.display_name || 'Suscripción',
            amount: payment.transaction_amount || amount,
            currency: payment.currency_id || currency,
            reason: payment.status_detail || 'El pago fue rechazado'
          });
          this.logger.info('Payment failed email sent:', { userId: user.id, email: user.email });
        } catch (emailError) {
          this.logger.error('Failed to send payment failed email:', emailError);
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          paymentId: payment.id,
          status: payment.status,
          statusDetail: payment.status_detail
        }
      });

    } catch (error) {
      this.logger.error('Error processing payment:', error);
      next(error);
    }
  }

  /**
   * Download payment receipt as PDF
   * GET /api/mercadopago/payment/:paymentId/receipt
   */
  async downloadReceipt(req, res, next) {
    try {
      const { paymentId } = req.params;
      const user = req.user;

      // Verify the payment exists and belongs to the user's organization
      // Avoid !inner join — PostgREST schema cache issues can make it return null
      // even when the payment exists. Use organization_id directly on manual_payments.
      const { data: payment, error: paymentError } = await supabase
        .from('manual_payments')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      // Check authorization via organization_id stored on the payment record itself
      if (payment.organization_id !== user.currentOrganizationId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Generate PDF
      const pdfBuffer = await receiptService.generateReceipt(paymentId);

      // Set response headers for PDF download
      const fileName = `recibo-${paymentId.substring(0, 8)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.send(pdfBuffer);

    } catch (error) {
      this.logger.error('Error generating receipt:', error);
      next(error);
    }
  }
}

module.exports = new MercadoPagoController();
