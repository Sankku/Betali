const { Bot } = require('grammy');
const { Logger } = require('../utils/Logger');
const { requireLinkedAccount } = require('./middleware/auth');
const { handleStart } = require('./commands/start');
const { handleStock, handleStockCallback, handleStockMenu } = require('./commands/stock');
const { handleHelp } = require('./commands/help');
const { handleResumen, handleResumenRefresh } = require('./commands/resumen');
const telegramRepo = require('../repositories/TelegramRepository');
const {
  handleComprar,
  handleSupplierSelected,
  handleProductSelected,
  handleQuantityInput,
  handleConfirmOrder,
  handleCancelOrder
} = require('./commands/comprar');
const {
  handleConteo,
  handleCountInput,
  handleApplyCount,
  handlePauseCount,
  handleResumeCount,
  handleRestartCount,
  handleCancelCount
} = require('./commands/conteo');
const {
  handleAjuste,
  handleAjusteText,
  handleProductSelected: handleAjusteProductSelected,
  handleSearchAgain,
  handleApplyAdjustment,
  handleResumeAdjustment,
  handleRestartAdjustment,
  handleCancelAdjustment
} = require('./commands/ajuste');
const {
  handleMovimiento,
  handleTypeSelected,
  handleProductSelected: handleMovProductSelected,
  handleQuantityInput: handleMovQuantityInput,
  handleConfirmMovement,
  handleCancelMovement
} = require('./commands/movimiento');

const { startAlertJob } = require('./alertJob');

const logger = new Logger('TelegramBot');

let bot = null;

/**
 * Crea e inicializa el bot de Telegram con todos sus handlers.
 * @returns {Bot} instancia de grammy
 */
function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.warn('TELEGRAM_BOT_TOKEN no configurado — bot deshabilitado');
    return null;
  }

  bot = new Bot(token);

  // ── Comando /start (no requiere cuenta vinculada — es el flujo de vinculación)
  bot.command('start', handleStart);

  // ── Todos los demás comandos requieren cuenta vinculada
  bot.command('ayuda', requireLinkedAccount, handleHelp);
  bot.command('help',  requireLinkedAccount, handleHelp);
  bot.command('stock',   requireLinkedAccount, handleStock);
  bot.command('resumen', requireLinkedAccount, handleResumen);
  bot.callbackQuery('resumen:refresh', requireLinkedAccount, handleResumenRefresh);

  // ── Callbacks de los inline keyboards
  // stock:critical | stock:all | stock:zero
  bot.callbackQuery(/^stock:(critical|all|zero)$/, requireLinkedAccount, handleStockCallback);
  bot.callbackQuery('stock:menu', requireLinkedAccount, handleStockMenu);

  // ── Comandos de compra
  bot.command('comprar', requireLinkedAccount, handleComprar);
  bot.callbackQuery(/^comprar:sup:(.+)$/, requireLinkedAccount, handleSupplierSelected);
  bot.callbackQuery(/^comprar:prod:(.+)$/, requireLinkedAccount, handleProductSelected);
  bot.callbackQuery('comprar:confirm', requireLinkedAccount, handleConfirmOrder);
  bot.callbackQuery('comprar:cancel',  requireLinkedAccount, handleCancelOrder);

  // ── Conteo físico de stock (todos los productos)
  bot.command('conteo', requireLinkedAccount, handleConteo);
  bot.callbackQuery('conteo:resume',   requireLinkedAccount, handleResumeCount);
  bot.callbackQuery('conteo:restart',  requireLinkedAccount, handleRestartCount);
  bot.callbackQuery('conteo:pause',    requireLinkedAccount, handlePauseCount);
  bot.callbackQuery('conteo:apply',    requireLinkedAccount, handleApplyCount);
  bot.callbackQuery('conteo:cancel',   requireLinkedAccount, handleCancelCount);

  // ── Ajuste específico de stock (búsqueda por nombre)
  bot.command('ajuste', requireLinkedAccount, handleAjuste);
  bot.callbackQuery(/^ajuste:sel:(.+)$/, requireLinkedAccount, handleAjusteProductSelected);
  bot.callbackQuery('ajuste:searchagain', requireLinkedAccount, handleSearchAgain);
  bot.callbackQuery('ajuste:apply',       requireLinkedAccount, handleApplyAdjustment);
  bot.callbackQuery('ajuste:resume',      requireLinkedAccount, handleResumeAdjustment);
  bot.callbackQuery('ajuste:restart',     requireLinkedAccount, handleRestartAdjustment);
  bot.callbackQuery('ajuste:cancel',      requireLinkedAccount, handleCancelAdjustment);

  // ── Movimientos de stock
  bot.command('movimiento', requireLinkedAccount, handleMovimiento);
  bot.callbackQuery(/^mov:type:(entry|exit)$/,  requireLinkedAccount, handleTypeSelected);
  bot.callbackQuery(/^mov:prod:(.+)$/,          requireLinkedAccount, handleMovProductSelected);
  bot.callbackQuery('mov:confirm',              requireLinkedAccount, handleConfirmMovement);
  bot.callbackQuery('mov:cancel',               requireLinkedAccount, handleCancelMovement);

  // ── Fallback para mensajes de texto sin comando reconocido
  // Si hay un flujo activo, delegar al handler de cantidad; si no, mostrar ayuda
  bot.on('message:text', requireLinkedAccount, async (ctx) => {
    const session = await telegramRepo.getSession(ctx.chat.id).catch(() => null);
    if (session?.current_flow === 'create_order' && session?.flow_step === 'enter_quantity') {
      return handleQuantityInput(ctx);
    }
    if (session?.current_flow === 'stock_count' && session?.flow_step === 'counting') {
      return handleCountInput(ctx);
    }
    if (session?.current_flow === 'movement' && session?.flow_step === 'enter_quantity') {
      return handleMovQuantityInput(ctx);
    }
    if (session?.current_flow === 'targeted_count') {
      const handled = await handleAjusteText(ctx);
      if (handled) return;
    }
    await ctx.reply(
      'No entendí ese comando. Usá /ayuda para ver los comandos disponibles.'
    );
  });

  // ── Manejo de errores global
  bot.catch((err) => {
    logger.error('Error no capturado en el bot', {
      error: err.message,
      ctx: err.ctx?.update
    });
  });

  logger.info('Bot de Telegram inicializado');
  return bot;
}

/**
 * Inicia el bot en modo polling (desarrollo).
 * En producción se usa webhookCallback en la ruta Express.
 */
async function startPolling() {
  if (!bot) {
    logger.warn('Bot no inicializado, no se puede iniciar polling');
    return;
  }

  logger.info('Iniciando bot en modo polling (desarrollo)...');
  bot.start({
    onStart: () => {
      logger.info('Bot escuchando (long polling)');
      startAlertJob(bot);
    }
  });
}

function getBot() {
  return bot;
}

module.exports = { createBot, startPolling, getBot };
