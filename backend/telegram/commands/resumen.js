const { ServiceFactory } = require('../../config/container');
const { Logger } = require('../../utils/Logger');
const { InlineKeyboard } = require('grammy');

const logger = new Logger('TelegramBot:resumen');

const SEVERITY_EMOJI = { critical: '🔴', warning: '🟡', ok: '✅' };

function classifyStock(product) {
  const stock    = product.current_stock ?? 0;
  const minStock = product.min_stock ?? 0;
  if (stock === 0)                              return 'critical';
  if (minStock > 0 && stock <= minStock)        return 'critical';
  if (minStock > 0 && stock <= minStock * 1.5)  return 'warning';
  return 'ok';
}

function formatStock(quantity, unit) {
  const q = typeof quantity === 'number' ? quantity : 0;
  return unit ? `${q} ${unit}` : `${q}`;
}

async function handleResumen(ctx) {
  const { organizationId } = ctx.betali;

  try {
    const productTypeService = ServiceFactory.createProductTypeService();
    const products = await productTypeService.getTypes(organizationId);

    if (!products || products.length === 0) {
      await ctx.reply('📦 No tenés productos registrados en el inventario.');
      return;
    }

    const classified = products.map(p => ({ ...p, severity: classifyStock(p) }));

    const criticals = classified.filter(p => p.severity === 'critical');
    const warnings  = classified.filter(p => p.severity === 'warning');
    const oks       = classified.filter(p => p.severity === 'ok');

    const lines = ['📊 *Resumen del inventario*\n'];

    // ── Críticos ─────────────────────────────
    if (criticals.length > 0) {
      lines.push('🔴 *Críticos / Agotados*');
      criticals.slice(0, 10).forEach(p => {
        const stock  = formatStock(p.current_stock, p.unit);
        const minStr = p.min_stock ? ` (mín: ${formatStock(p.min_stock, p.unit)})` : '';
        lines.push(`  • *${p.name}* — ${stock}${minStr}`);
      });
      if (criticals.length > 10) lines.push(`  _...y ${criticals.length - 10} más_`);
      lines.push('');
    }

    // ── Alertas ──────────────────────────────
    if (warnings.length > 0) {
      lines.push('🟡 *Stock bajo (alerta)*');
      warnings.slice(0, 8).forEach(p => {
        const stock  = formatStock(p.current_stock, p.unit);
        const minStr = p.min_stock ? ` (mín: ${formatStock(p.min_stock, p.unit)})` : '';
        lines.push(`  • *${p.name}* — ${stock}${minStr}`);
      });
      if (warnings.length > 8) lines.push(`  _...y ${warnings.length - 8} más_`);
      lines.push('');
    }

    // ── Sin problemas ─────────────────────────
    if (criticals.length === 0 && warnings.length === 0) {
      lines.push('✅ *Todo en orden* — ningún producto con stock bajo.');
      lines.push('');
    }

    // ── Totales ───────────────────────────────
    lines.push(
      `📦 ${products.length} productos en total\n` +
      `🔴 ${criticals.length} crítico${criticals.length !== 1 ? 's' : ''} | ` +
      `🟡 ${warnings.length} en alerta | ` +
      `✅ ${oks.length} ok`
    );

    const keyboard = new InlineKeyboard()
      .text('🔄 Actualizar', 'resumen:refresh')
      .text('📦 Ver stock detallado', 'stock:all');

    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    logger.error('Error generating summary', { organizationId, error: error.message });
    await ctx.reply('❌ No pude generar el resumen. Intentá de nuevo.');
  }
}

async function handleResumenRefresh(ctx) {
  await ctx.answerCallbackQuery();
  // Edit the existing message by re-running the summary logic
  const { organizationId } = ctx.betali;

  try {
    const productTypeService = ServiceFactory.createProductTypeService();
    const products = await productTypeService.getTypes(organizationId);

    if (!products || products.length === 0) {
      await ctx.editMessageText('📦 No tenés productos registrados.');
      return;
    }

    const classified = products.map(p => ({ ...p, severity: classifyStock(p) }));
    const criticals  = classified.filter(p => p.severity === 'critical');
    const warnings   = classified.filter(p => p.severity === 'warning');
    const oks        = classified.filter(p => p.severity === 'ok');

    const lines = ['📊 *Resumen del inventario*\n'];

    if (criticals.length > 0) {
      lines.push('🔴 *Críticos / Agotados*');
      criticals.slice(0, 10).forEach(p => {
        const stock  = formatStock(p.current_stock, p.unit);
        const minStr = p.min_stock ? ` (mín: ${formatStock(p.min_stock, p.unit)})` : '';
        lines.push(`  • *${p.name}* — ${stock}${minStr}`);
      });
      if (criticals.length > 10) lines.push(`  _...y ${criticals.length - 10} más_`);
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push('🟡 *Stock bajo (alerta)*');
      warnings.slice(0, 8).forEach(p => {
        const stock  = formatStock(p.current_stock, p.unit);
        const minStr = p.min_stock ? ` (mín: ${formatStock(p.min_stock, p.unit)})` : '';
        lines.push(`  • *${p.name}* — ${stock}${minStr}`);
      });
      if (warnings.length > 8) lines.push(`  _...y ${warnings.length - 8} más_`);
      lines.push('');
    }

    if (criticals.length === 0 && warnings.length === 0) {
      lines.push('✅ *Todo en orden* — ningún producto con stock bajo.\n');
    }

    lines.push(
      `📦 ${products.length} productos en total\n` +
      `🔴 ${criticals.length} crítico${criticals.length !== 1 ? 's' : ''} | ` +
      `🟡 ${warnings.length} en alerta | ` +
      `✅ ${oks.length} ok`
    );

    const keyboard = new InlineKeyboard()
      .text('🔄 Actualizar', 'resumen:refresh')
      .text('📦 Ver stock detallado', 'stock:all');

    await ctx.editMessageText(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    logger.error('Error refreshing summary', { organizationId, error: error.message });
    await ctx.editMessageText('❌ Error al actualizar. Intentá de nuevo.');
  }
}

module.exports = { handleResumen, handleResumenRefresh };
