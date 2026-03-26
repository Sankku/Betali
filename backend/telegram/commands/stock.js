const { ServiceFactory } = require('../../config/container');
const { Logger } = require('../../utils/Logger');
const { InlineKeyboard } = require('grammy');

const logger = new Logger('TelegramBot:stock');

const SEVERITY_EMOJI = {
  critical: '🔴',
  warning:  '🟡',
  ok:       '✅'
};

/**
 * Clasifica el nivel de stock de un producto.
 * Usa min_stock si existe; si no, considera crítico solo cuando stock === 0.
 */
function classifyStock(product) {
  const stock = product.current_stock ?? 0;
  const minStock = product.min_stock ?? 0;

  if (stock === 0) return 'critical';
  if (minStock > 0 && stock <= minStock) return 'critical';
  if (minStock > 0 && stock <= minStock * 1.5) return 'warning';
  return 'ok';
}

function formatStock(quantity, unit) {
  const q = typeof quantity === 'number' ? quantity : 0;
  return unit ? `${q} ${unit}` : `${q}`;
}

/**
 * Obtiene los productos con stock calculado usando ProductService.
 * ProductService agrega current_stock sumando stock_movements — no es una columna directa.
 */
async function fetchProducts(organizationId) {
  const productService = ServiceFactory.createProductService();
  const products = await productService.getOrganizationProducts(organizationId);
  return products || [];
}

/**
 * Handler para /stock — muestra el menú de filtros.
 */
async function handleStock(ctx) {
  const keyboard = new InlineKeyboard()
    .text('⚠️ Solo críticos', 'stock:critical')
    .text('📋 Ver todos', 'stock:all')
    .row()
    .text('🔴 Stock agotado', 'stock:zero');

  await ctx.reply(
    '📦 *Consulta de inventario*\n¿Qué querés ver?',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

/**
 * Handler para los callbacks de los botones del menú de stock.
 */
async function handleStockCallback(ctx) {
  const filter = ctx.match; // 'critical' | 'all' | 'zero'
  const { organizationId } = ctx.betali;

  await ctx.answerCallbackQuery();

  try {
    const products = await fetchProducts(organizationId);

    if (products.length === 0) {
      await ctx.editMessageText('📦 No hay productos registrados en tu inventario.');
      return;
    }

    const classified = products.map(p => ({ ...p, severity: classifyStock(p) }));

    let filtered;
    let title;

    switch (filter) {
      case 'critical':
        filtered = classified.filter(p => p.severity === 'critical' || p.severity === 'warning');
        title = '⚠️ Productos que requieren atención';
        break;
      case 'zero':
        filtered = classified.filter(p => (p.current_stock ?? 0) === 0);
        title = '🔴 Productos agotados';
        break;
      default: // 'all'
        filtered = classified;
        title = '📋 Inventario completo';
    }

    if (filtered.length === 0) {
      const emptyMessages = {
        critical: '✅ ¡Todo en orden! No hay productos con stock bajo o crítico.',
        zero: '✅ No hay productos agotados.',
        all: '📦 No hay productos en el inventario.'
      };
      await ctx.editMessageText(emptyMessages[filter] || '✅ No hay productos para mostrar.');
      return;
    }

    const lines = [`*${title}*\n`];

    // Máximo 30 productos para no superar el límite de 4096 chars de Telegram
    for (const p of filtered.slice(0, 30)) {
      const emoji = SEVERITY_EMOJI[p.severity];
      const stockStr = formatStock(p.current_stock, p.unit);
      const minStr = p.min_stock ? ` (mín: ${formatStock(p.min_stock, p.unit)})` : '';
      lines.push(`${emoji} *${p.name}* — ${stockStr}${minStr}`);
    }

    if (filtered.length > 30) {
      lines.push(`\n_...y ${filtered.length - 30} productos más. Usá la app para el listado completo._`);
    }

    const criticals = classified.filter(p => p.severity === 'critical').length;
    const warnings  = classified.filter(p => p.severity === 'warning').length;
    const oks       = classified.filter(p => p.severity === 'ok').length;

    lines.push(`\n📊 ${products.length} total | 🔴 ${criticals} | 🟡 ${warnings} | ✅ ${oks}`);

    const keyboard = new InlineKeyboard()
      .text('🔄 Actualizar', `stock:${filter}`)
      .text('⬅️ Volver', 'stock:menu');

    await ctx.editMessageText(lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error('Error fetching stock', { organizationId, filter, error: error.message });
    await ctx.editMessageText('❌ No pude obtener el inventario. Intentá de nuevo en un momento.');
  }
}

/**
 * Vuelve al menú principal de stock.
 */
async function handleStockMenu(ctx) {
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .text('⚠️ Solo críticos', 'stock:critical')
    .text('📋 Ver todos', 'stock:all')
    .row()
    .text('🔴 Stock agotado', 'stock:zero');

  await ctx.editMessageText(
    '📦 *Consulta de inventario*\n¿Qué querés ver?',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

module.exports = { handleStock, handleStockCallback, handleStockMenu };
