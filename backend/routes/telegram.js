const express = require('express');
const { webhookCallback } = require('grammy');
const { authenticateUser } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const telegramRepo = require('../repositories/TelegramRepository');
const { getBot } = require('../telegram/bot');
const { Logger } = require('../utils/Logger');

const apiRouter = express.Router();
const webhookRouter = express.Router();
const logger = new Logger('TelegramRoutes');

// ============================================================
// API para la app web (requiere usuario autenticado)
// ============================================================

/**
 * POST /api/telegram/link-token
 * Genera un token de vinculación de 30 minutos para el usuario actual.
 * El frontend muestra el deep link: https://t.me/betali_bot?start=TOKEN
 */
apiRouter.post('/link-token', authenticateUser, requireOrganizationContext, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.currentOrganizationId;

    const token = await telegramRepo.generateLinkToken(userId, organizationId);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'betali_bot';
    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    res.json({
      token,
      deepLink,
      expiresInMinutes: 30
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/telegram/status
 * Devuelve si el usuario actual tiene Telegram vinculado y sus preferencias.
 */
apiRouter.get('/status', authenticateUser, requireOrganizationContext, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.currentOrganizationId;

    const supabase = require('../lib/supabaseClient');
    const { data, error } = await supabase
      .from('telegram_connections')
      .select('telegram_chat_id, telegram_username, telegram_name, linked_at, is_active, alerts_enabled, daily_digest_enabled, daily_digest_time, alert_min_severity')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    res.json({
      linked: !!data,
      connection: data || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/telegram/preferences
 * Actualiza las preferencias de notificación del usuario.
 * Body: { alerts_enabled, daily_digest_enabled, daily_digest_time_utc, alert_min_severity }
 */
apiRouter.patch('/preferences', authenticateUser, requireOrganizationContext, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.currentOrganizationId;
    const { alerts_enabled, daily_digest_enabled, daily_digest_time_utc, alert_min_severity } = req.body;

    const supabase = require('../lib/supabaseClient');

    const update = { updated_at: new Date().toISOString() };
    if (alerts_enabled       !== undefined) update.alerts_enabled       = !!alerts_enabled;
    if (daily_digest_enabled !== undefined) update.daily_digest_enabled = !!daily_digest_enabled;
    if (daily_digest_time_utc !== undefined) update.daily_digest_time   = daily_digest_time_utc; // 'HH:MM'
    if (alert_min_severity   !== undefined && ['info', 'warning', 'critical'].includes(alert_min_severity)) {
      update.alert_min_severity = alert_min_severity;
    }

    const { error } = await supabase
      .from('telegram_connections')
      .update(update)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/telegram/unlink
 * Desvincula la cuenta de Telegram del usuario actual.
 */
apiRouter.delete('/unlink', authenticateUser, requireOrganizationContext, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.currentOrganizationId;
    const supabase = require('../lib/supabaseClient');

    const { error } = await supabase
      .from('telegram_connections')
      .update({
        is_active: false,
        telegram_chat_id: null,
        linked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    res.json({ success: true, message: 'Cuenta de Telegram desvinculada' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// Webhook de Telegram (no requiere auth — validado por secret token)
// ============================================================

/**
 * POST /webhook/telegram
 * Telegram envía aquí todos los updates del bot.
 * El secret token se valida automáticamente por grammy si se configuró al registrar el webhook.
 */
webhookRouter.post('/', (req, res, next) => {
  const bot = getBot();

  if (!bot) {
    logger.warn('Webhook recibido pero el bot no está inicializado');
    return res.sendStatus(200); // Siempre 200 para que Telegram no reintente
  }

  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  const handler = webhookCallback(bot, 'express', {
    secretToken: secretToken || undefined
  });

  handler(req, res, next);
});

module.exports = { apiRouter, webhookRouter };
