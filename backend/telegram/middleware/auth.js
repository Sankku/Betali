const telegramRepo = require('../../repositories/TelegramRepository');

/**
 * Middleware de grammy que verifica que el chat_id esté vinculado a una cuenta de Betali.
 * Inyecta ctx.betali = { userId, organizationId, connection } para los handlers.
 *
 * Si el chat no está vinculado, responde con instrucciones para vincular y detiene el flujo.
 */
async function requireLinkedAccount(ctx, next) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const connection = await telegramRepo.findActiveByChatId(chatId);

  if (!connection) {
    await ctx.reply(
      '🔒 Tu cuenta de Telegram no está vinculada a Betali.\n\n' +
      'Para vincularla:\n' +
      '1. Abrí la app web de Betali\n' +
      '2. Andá a *Configuración → Integraciones → Telegram*\n' +
      '3. Hacé click en "Vincular Telegram" y seguí el link\n\n' +
      'Una vez vinculada, vas a poder usar todos los comandos del bot.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Actualizar timestamp de última interacción (sin await para no bloquear)
  telegramRepo.touchLastInteraction(chatId).catch(() => {});

  ctx.betali = {
    userId: connection.user_id,
    organizationId: connection.organization_id,
    connection
  };

  return next();
}

module.exports = { requireLinkedAccount };
