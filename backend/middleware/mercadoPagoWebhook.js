const crypto = require('crypto');
const { Logger } = require('../utils/Logger');

const logger = new Logger('MercadoPagoWebhookMiddleware');

/**
 * MercadoPago Webhook Signature Verification Middleware
 *
 * MercadoPago signs webhooks using HMAC-SHA256 with the following format:
 * - Header: x-signature contains "ts=timestamp,v1=hash"
 * - Header: x-request-id contains the request identifier
 *
 * The signature is computed over: "id:[data.id];request-id:[x-request-id];ts:[timestamp];"
 *
 * @see https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */

/**
 * Extract signature components from x-signature header
 * Format: "ts=1234567890,v1=abc123..."
 */
function parseSignatureHeader(signatureHeader) {
  if (!signatureHeader) {
    return { ts: null, v1: null };
  }

  const parts = signatureHeader.split(',');
  const result = { ts: null, v1: null };

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') {
      result.ts = value;
    } else if (key === 'v1') {
      result.v1 = value;
    }
  }

  return result;
}

/**
 * Generate the expected signature for verification
 *
 * @param {string} dataId - The data.id from the webhook payload
 * @param {string} requestId - The x-request-id header value
 * @param {string} timestamp - The timestamp from x-signature header
 * @param {string} secret - The webhook secret from MercadoPago
 * @returns {string} The expected HMAC-SHA256 signature
 */
function generateSignature(dataId, requestId, timestamp, secret) {
  // Build the manifest string as per MP documentation
  // Format: "id:[data.id];request-id:[x-request-id];ts:[timestamp];"
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;

  // Generate HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(manifest);
  return hmac.digest('hex');
}

/**
 * Verify MercadoPago webhook signature
 *
 * @param {Object} options
 * @param {string} options.signatureHeader - The x-signature header value
 * @param {string} options.requestId - The x-request-id header value
 * @param {string} options.dataId - The data.id from the webhook body
 * @param {string} options.secret - The webhook secret
 * @returns {Object} { valid: boolean, error?: string }
 */
function verifyWebhookSignature({ signatureHeader, requestId, dataId, secret }) {
  // Parse the signature header
  const { ts, v1 } = parseSignatureHeader(signatureHeader);

  if (!ts || !v1) {
    return {
      valid: false,
      error: 'Missing timestamp or signature in x-signature header'
    };
  }

  if (!requestId) {
    return {
      valid: false,
      error: 'Missing x-request-id header'
    };
  }

  if (!dataId) {
    return {
      valid: false,
      error: 'Missing data.id in webhook payload'
    };
  }

  // Generate expected signature
  const expectedSignature = generateSignature(dataId, requestId, ts, secret);

  // Compare signatures using timing-safe comparison
  const signatureBuffer = Buffer.from(v1, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return {
      valid: false,
      error: 'Signature length mismatch'
    };
  }

  const valid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!valid) {
    return {
      valid: false,
      error: 'Signature verification failed'
    };
  }

  // Optional: Check timestamp to prevent replay attacks (5 minute tolerance)
  const timestampMs = parseInt(ts, 10) * 1000;
  const now = Date.now();
  const tolerance = 5 * 60 * 1000; // 5 minutes

  if (Math.abs(now - timestampMs) > tolerance) {
    return {
      valid: false,
      error: 'Webhook timestamp is too old or in the future'
    };
  }

  return { valid: true };
}

/**
 * Express middleware for MercadoPago webhook signature verification
 *
 * Usage:
 *   router.post('/webhooks/mercadopago', verifyMercadoPagoWebhook, handleWebhook);
 *
 * Environment variable required:
 *   MERCADOPAGO_WEBHOOK_SECRET - The secret key from MercadoPago webhook configuration
 *
 * If MERCADOPAGO_WEBHOOK_SECRET is not set, the middleware will log a warning
 * and allow the request through (for development/testing purposes).
 */
function verifyMercadoPagoWebhook(req, res, next) {
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  // If no secret configured, skip verification (development mode)
  if (!webhookSecret) {
    logger.warn('MERCADOPAGO_WEBHOOK_SECRET not configured - skipping signature verification');
    logger.warn('This is insecure for production! Configure the webhook secret.');
    return next();
  }

  const signatureHeader = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const dataId = req.body?.data?.id;

  // Log verification attempt
  logger.info('Verifying MercadoPago webhook signature:', {
    hasSignature: !!signatureHeader,
    hasRequestId: !!requestId,
    dataId
  });

  const result = verifyWebhookSignature({
    signatureHeader,
    requestId,
    dataId,
    secret: webhookSecret
  });

  if (!result.valid) {
    logger.error('Webhook signature verification failed:', {
      error: result.error,
      requestId,
      dataId,
      ip: req.ip
    });

    // Log the failed attempt for security audit
    logFailedVerification(req, result.error);

    return res.status(401).json({
      success: false,
      error: 'Invalid webhook signature'
    });
  }

  logger.info('Webhook signature verified successfully:', { requestId, dataId });
  next();
}

/**
 * Log failed signature verification attempts for security monitoring
 */
async function logFailedVerification(req, error) {
  try {
    const supabase = require('../lib/supabaseClient');

    await supabase
      .from('webhook_logs')
      .insert({
        provider: 'mercadopago',
        event_type: 'signature_verification_failed',
        event_data: {
          body: req.body,
          error
        },
        headers: {
          'x-signature': req.headers['x-signature'],
          'x-request-id': req.headers['x-request-id'],
          'user-agent': req.headers['user-agent'],
          'x-forwarded-for': req.headers['x-forwarded-for']
        },
        ip_address: req.ip,
        processed: false,
        created_at: new Date().toISOString()
      });
  } catch (logError) {
    logger.error('Failed to log verification failure:', logError);
  }
}

module.exports = {
  verifyMercadoPagoWebhook,
  verifyWebhookSignature,
  parseSignatureHeader,
  generateSignature
};
