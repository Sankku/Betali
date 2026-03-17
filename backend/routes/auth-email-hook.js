const express = require('express');
const router = express.Router();
const emailService = require('../services/EmailService');
const logger = require('../config/logger');

/**
 * POST /api/webhooks/supabase-auth
 *
 * Supabase Auth Hook — "Send Email" event
 * Docs: https://supabase.com/docs/guides/auth/auth-hooks#send-email-hook
 *
 * Supabase sends:
 *   Authorization: Bearer <SUPABASE_HOOK_SECRET>
 *   {
 *     "user": { "email": "...", ... },
 *     "email_data": {
 *       "token": "123456",           // 6-digit OTP
 *       "token_hash": "...",
 *       "redirect_to": "https://...",
 *       "email_action_type": "signup|recovery|magiclink|email_change_new|email_change_current",
 *       "site_url": "https://...",
 *       "token_new": "...",
 *       "token_hash_new": "..."
 *     }
 *   }
 *
 * We must respond with 2xx within the timeout or Supabase falls back to its default email.
 * On error we return { error: { message, http_code } } as per the hook spec.
 */
router.post('/supabase-auth', async (req, res) => {
  // Verify shared secret
  const hookSecret = process.env.SUPABASE_HOOK_SECRET;
  if (hookSecret) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token !== hookSecret) {
      logger.warn('Supabase auth hook: invalid secret');
      return res.status(401).json({ error: { message: 'Unauthorized', http_code: 401 } });
    }
  } else {
    logger.warn('SUPABASE_HOOK_SECRET not set — skipping auth hook verification');
  }

  const { user, email_data } = req.body;

  if (!user?.email || !email_data) {
    return res.status(400).json({ error: { message: 'Invalid payload', http_code: 400 } });
  }

  const { email } = user;
  const { token, redirect_to, email_action_type, site_url } = email_data;

  // Build the action URL that Supabase embeds in the default email
  // redirect_to already contains the full confirm/reset link when available
  const actionUrl = redirect_to || site_url || process.env.FRONTEND_URL || 'https://app.betali.com';

  try {
    switch (email_action_type) {
      case 'signup':
        await emailService.sendConfirmSignupEmail(email, actionUrl, token);
        break;

      case 'recovery':
        await emailService.sendPasswordResetEmail(email, actionUrl, token);
        break;

      case 'magiclink':
        await emailService.sendMagicLinkEmail(email, actionUrl, token);
        break;

      case 'email_change_new':
      case 'email_change_current':
        await emailService.sendEmailChangeEmail(email, actionUrl, token);
        break;

      default:
        logger.warn(`Supabase auth hook: unknown email_action_type "${email_action_type}"`);
        // Return 200 so Supabase doesn't retry — it will fall back to its own email
        return res.status(200).json({});
    }

    logger.info(`Supabase auth hook: sent "${email_action_type}" email to ${email}`);
    return res.status(200).json({});
  } catch (error) {
    logger.error('Supabase auth hook: failed to send email', { error: error.message, email, email_action_type });
    // Return error object per Supabase hook spec so they know it failed
    return res.status(500).json({ error: { message: 'Failed to send email', http_code: 500 } });
  }
});

module.exports = router;
