const telegramRepo = require('../../repositories/TelegramRepository');
const { Logger } = require('../../utils/Logger');

const logger = new Logger('TelegramBot:start');

/**
 * Handler para el comando /start
 *
 * Casos:
 * 1. /start TOKEN  → flujo de vinculación de cuenta
 * 2. /start        → bienvenida genérica (cuenta ya vinculada o sin token)
 */
async function handleStart(ctx) {
  const chatId = ctx.chat.id;
  const telegramUser = ctx.from;

  // Extraer el payload (token) del deep link: /start TOKEN
  const payload = ctx.match; // grammy pone el argumento después de /start en ctx.match

  if (payload && payload.trim()) {
    await handleLinkToken(ctx, chatId, telegramUser, payload.trim());
    return;
  }

  // Sin token: verificar si ya está vinculado
  const existing = await telegramRepo.findActiveByChatId(chatId);

  if (existing) {
    await ctx.reply(
      `✅ Tu cuenta de Betali ya está vinculada.\n\n` +
      `Comandos disponibles:\n` +
      `• /stock — Ver estado del inventario\n` +
      `• /comprar — Crear una orden de compra\n` +
      `• /resumen — Resumen del inventario\n` +
      `• /ayuda — Ver todos los comandos`
    );
  } else {
    await ctx.reply(
      `👋 Hola, soy el asistente de inventario de *Betali*.\n\n` +
      `Para empezar, necesito vincular tu cuenta:\n\n` +
      `1. Abrí la app web de Betali\n` +
      `2. Andá a *Configuración → Integraciones → Telegram*\n` +
      `3. Hacé click en "Vincular Telegram" y seguí el link`,
      { parse_mode: 'Markdown' }
    );
  }
}

/**
 * Completa la vinculación usando el token del deep link.
 */
async function handleLinkToken(ctx, chatId, telegramUser, token) {
  try {
    // Verificar si el chat ya está vinculado a otra cuenta
    const existingConnection = await telegramRepo.findActiveByChatId(chatId);
    if (existingConnection) {
      await ctx.reply(
        '⚠️ Este chat de Telegram ya está vinculado a una cuenta de Betali.\n\n' +
        'Si querés vincularlo a otra cuenta, primero desvinculá la actual desde la app web.'
      );
      return;
    }

    // Buscar el token pendiente
    const pending = await telegramRepo.findPendingByToken(token);

    if (!pending) {
      await ctx.reply(
        '❌ El link de vinculación no es válido o ya expiró (tienen validez de 30 minutos).\n\n' +
        'Generá uno nuevo desde *Configuración → Integraciones → Telegram* en la app.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Activar la conexión
    await telegramRepo.activateConnection(pending.connection_id, telegramUser);

    logger.info('Telegram account linked', {
      userId: pending.user_id,
      organizationId: pending.organization_id,
      chatId
    });

    const firstName = telegramUser.first_name || 'ahí';

    await ctx.reply(
      `✅ ¡Cuenta vinculada exitosamente, ${firstName}!\n\n` +
      `Ya podés usar el bot para gestionar tu inventario.\n\n` +
      `*Comandos disponibles:*\n` +
      `• /stock — Ver estado del inventario\n` +
      `• /comprar — Crear una orden de compra\n` +
      `• /resumen — Resumen diario\n` +
      `• /ayuda — Ver todos los comandos`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error during account linking', { token, chatId, error: error.message });
    await ctx.reply('❌ Ocurrió un error al vincular la cuenta. Por favor intentá de nuevo.');
  }
}

module.exports = { handleStart };
