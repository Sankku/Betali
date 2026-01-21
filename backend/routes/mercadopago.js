const express = require('express');
const router = express.Router();
const mercadoPagoController = require('../controllers/MercadoPagoController');
const { authenticateUser } = require('../middleware/auth');

/**
 * MercadoPago Routes
 *
 * Payment processing endpoints for Mercado Pago integration
 */

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * Webhook endpoint - receives payment notifications from Mercado Pago
 * POST /api/webhooks/mercadopago
 *
 * This endpoint is called by Mercado Pago when payment status changes
 * Must be publicly accessible (no auth middleware)
 */
router.post(
  '/webhooks/mercadopago',
  express.json(),
  (req, res, next) => mercadoPagoController.handleWebhook(req, res, next)
);

/**
 * Get supported payment methods for a country
 * GET /api/mercadopago/payment-methods/:countryCode
 */
router.get(
  '/payment-methods/:countryCode?',
  (req, res, next) => mercadoPagoController.getPaymentMethods(req, res, next)
);

// ============================================================================
// AUTHENTICATED ROUTES (Require valid JWT)
// ============================================================================

router.use(authenticateUser);

/**
 * Create checkout preference for subscription payment
 * POST /api/mercadopago/create-checkout
 *
 * Body:
 * {
 *   subscriptionId: string,
 *   planId: string,
 *   billingCycle: 'monthly' | 'yearly',
 *   currency: 'ARS' | 'USD'
 * }
 *
 * Returns:
 * {
 *   preferenceId: string,
 *   initPoint: string (redirect URL for payment),
 *   amount: number,
 *   currency: string
 * }
 */
router.post(
  '/create-checkout',
  (req, res, next) => mercadoPagoController.createCheckout(req, res, next)
);

/**
 * Get payment status by payment ID
 * GET /api/mercadopago/payment/:paymentId
 *
 * Returns payment information including status, amount, method, etc.
 */
router.get(
  '/payment/:paymentId',
  (req, res, next) => mercadoPagoController.getPaymentStatus(req, res, next)
);

/**
 * Get payment history for a subscription
 * GET /api/mercadopago/subscription/:subscriptionId/payments
 *
 * Returns array of payments for the subscription
 */
router.get(
  '/subscription/:subscriptionId/payments',
  (req, res, next) => mercadoPagoController.getSubscriptionPayments(req, res, next)
);

/**
 * Cancel a subscription
 * POST /api/mercadopago/subscription/:subscriptionId/cancel
 *
 * Body:
 * {
 *   reason?: string
 * }
 */
router.post(
  '/subscription/:subscriptionId/cancel',
  (req, res, next) => mercadoPagoController.cancelSubscription(req, res, next)
);

/**
 * Process payment from Payment Brick
 * POST /api/mercadopago/process-payment
 *
 * Body:
 * {
 *   paymentData: object (from brick),
 *   subscriptionId: string,
 *   amount: number,
 *   currency: string
 * }
 */
router.post(
  '/process-payment',
  (req, res, next) => mercadoPagoController.processPayment(req, res, next)
);

module.exports = router;
