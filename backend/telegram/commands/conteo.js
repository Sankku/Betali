const { ServiceFactory } = require('../../config/container');
const { Logger } = require('../../utils/Logger');
const { InlineKeyboard } = require('grammy');
const telegramRepo = require('../../repositories/TelegramRepository');

const logger = new Logger('TelegramBot:conteo');

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function diffEmoji(diff) {
  if (diff === 0) return '✅';
  return diff > 0 ? '🟢' : '🔴';
}

function formatDiff(diff, unit) {
  const u = unit || 'unid';
  if (diff === 0) return 'Sin diferencia';
  return diff > 0 ? `+${diff} ${u}` : `${diff} ${u}`;
}

// ──────────────────────────────────────────
// /conteo — inicio o reanudación
// ──────────────────────────────────────────

async function handleConteo(ctx) {
  const { organizationId } = ctx.betali;

  try {
    // Check for an existing paused session
    const existing = await telegramRepo.getSession(ctx.chat.id);

    if (existing?.current_flow === 'stock_count') {
      const data = existing.flow_data || {};
      const counted = data.counted || [];
      const pending = data.pending || [];

      if (pending.length > 0 && existing.flow_step !== 'done') {
        // Resume paused session
        const keyboard = new InlineKeyboard()
          .text('▶️ Reanudar conteo', 'conteo:resume')
          .row()
          .text('🗑 Descartar y empezar de nuevo', 'conteo:restart');

        await ctx.reply(
          `📋 *Conteo en curso*\n\n` +
          `Contados: ${counted.length} productos\n` +
          `Pendientes: ${pending.length} productos\n\n` +
          `¿Querés continuar o empezar de nuevo?`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
        return;
      }
    }

    // Start fresh
    await startFreshCount(ctx, organizationId);
  } catch (error) {
    logger.error('Error starting /conteo', { organizationId, error: error.message });
    await ctx.reply('❌ No pude iniciar el conteo. Intentá de nuevo.');
  }
}

async function startFreshCount(ctx, organizationId) {
  const productTypeService = ServiceFactory.createProductTypeService();
  const products = await productTypeService.getTypes(organizationId);

  // Only count stockable product types (no elaborado)
  const stockable = (products || []).filter(p => p.product_type !== 'elaborado');

  if (stockable.length === 0) {
    await ctx.reply('📦 No tenés productos para contar.');
    return;
  }

  // Get first warehouse
  const warehouseService = ServiceFactory.createWarehouseService();
  const warehouses = await warehouseService.getOrganizationWarehouses(organizationId);
  const warehouseList = Array.isArray(warehouses) ? warehouses : (warehouses?.warehouses || warehouses?.data || []);
  const warehouse = warehouseList.filter(w => w.is_active !== false)[0];

  if (!warehouse) {
    await ctx.reply('❌ No tenés depósitos configurados.');
    return;
  }

  // Build pending list: [{ product_id, name, unit, current_stock }]
  const pending = stockable.map(p => ({
    product_id: p.product_type_id,
    name: p.name,
    unit: p.unit || 'unidad',
    current_stock: p.current_stock ?? 0
  }));

  await telegramRepo.saveSession(ctx.chat.id, {
    current_flow: 'stock_count',
    flow_step: 'counting',
    flow_data: {
      warehouse_id: warehouse.warehouse_id,
      warehouse_name: warehouse.name,
      pending,
      counted: []
    }
  });

  await promptNextProduct(ctx, pending, [], warehouse.name);
}

// ──────────────────────────────────────────
// Mostrar siguiente producto a contar
// ──────────────────────────────────────────

async function promptNextProduct(ctx, pending, counted, warehouseName) {
  const next = pending[0];

  const keyboard = new InlineKeyboard()
    .text('⏸ Pausar y guardar progreso', 'conteo:pause')
    .row()
    .text('❌ Cancelar conteo', 'conteo:cancel');

  const progress = `${counted.length}/${counted.length + pending.length}`;

  await ctx.reply(
    `📦 *Conteo de stock* [${progress}]\n` +
    `📍 ${warehouseName}\n\n` +
    `Producto: *${next.name}*\n` +
    `Stock en sistema: ${next.current_stock} ${next.unit}\n\n` +
    `¿Cuánto contaste físicamente? Escribí el número.`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

// ──────────────────────────────────────────
// Procesar cantidad ingresada
// ──────────────────────────────────────────

async function handleCountInput(ctx) {
  const { organizationId } = ctx.betali;
  const text = ctx.message.text.trim();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);

    if (session?.current_flow !== 'stock_count' || session?.flow_step !== 'counting') {
      return;
    }

    const counted_qty = parseFloat(text.replace(',', '.'));
    if (isNaN(counted_qty) || counted_qty < 0) {
      await ctx.reply('❌ Cantidad inválida. Ingresá un número mayor o igual a 0.');
      return;
    }

    const data = session.flow_data;
    const [current, ...remainingPending] = data.pending;

    const diff = counted_qty - current.current_stock;

    const newCounted = [...data.counted, {
      ...current,
      counted_qty,
      diff
    }];

    if (remainingPending.length === 0) {
      // All done — show summary
      await telegramRepo.saveSession(ctx.chat.id, {
        current_flow: 'stock_count',
        flow_step: 'confirm',
        flow_data: {
          ...data,
          pending: [],
          counted: newCounted
        }
      });

      await showCountSummary(ctx, newCounted, data.warehouse_name);
    } else {
      // Continue
      await telegramRepo.saveSession(ctx.chat.id, {
        current_flow: 'stock_count',
        flow_step: 'counting',
        flow_data: {
          ...data,
          pending: remainingPending,
          counted: newCounted
        }
      });

      // Quick feedback + next prompt
      const emoji = diffEmoji(diff);
      await ctx.reply(`${emoji} *${current.name}*: ${counted_qty} ${current.unit} (${formatDiff(diff, current.unit)})`, { parse_mode: 'Markdown' });
      await promptNextProduct(ctx, remainingPending, newCounted, data.warehouse_name);
    }
  } catch (error) {
    logger.error('Error processing count input', { organizationId, error: error.message });
    await ctx.reply('❌ Error al procesar. Intentá de nuevo.');
  }
}

// ──────────────────────────────────────────
// Resumen final y confirmación
// ──────────────────────────────────────────

async function showCountSummary(ctx, counted, warehouseName) {
  const withDiff = counted.filter(p => p.diff !== 0);
  const ok       = counted.filter(p => p.diff === 0);

  const lines = [`📊 *Resumen del conteo* | ${warehouseName}`, ''];

  if (withDiff.length > 0) {
    lines.push('*Diferencias encontradas:*');
    withDiff.forEach(p => {
      lines.push(`${diffEmoji(p.diff)} *${p.name}*: sistema ${p.current_stock} | contado ${p.counted_qty} | *${formatDiff(p.diff, p.unit)}*`);
    });
    lines.push('');
  }

  lines.push(`✅ Sin diferencias: ${ok.length} producto${ok.length !== 1 ? 's' : ''}`);
  lines.push(`🔄 Con diferencias: ${withDiff.length} producto${withDiff.length !== 1 ? 's' : ''}`);

  const keyboard = new InlineKeyboard();
  if (withDiff.length > 0) {
    keyboard.text('✅ Aplicar ajustes al stock', 'conteo:apply').row();
  }
  keyboard.text('🗑 Descartar conteo', 'conteo:cancel');

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: keyboard });
}

// ──────────────────────────────────────────
// Aplicar ajustes
// ──────────────────────────────────────────

async function handleApplyCount(ctx) {
  const { organizationId, userId } = ctx.betali;
  await ctx.answerCallbackQuery();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);
    if (session?.current_flow !== 'stock_count') {
      await ctx.editMessageText('❌ No hay un conteo activo.');
      return;
    }

    const data = session.flow_data;
    const withDiff = data.counted.filter(p => p.diff !== 0);

    if (withDiff.length === 0) {
      await telegramRepo.clearSession(ctx.chat.id);
      await ctx.editMessageText('✅ Sin diferencias — no se requieren ajustes.');
      return;
    }

    const stockMovementService = ServiceFactory.createStockMovementService();
    const countRef = `CONTEO-${new Date().toISOString().slice(0, 10)}`;

    let applied = 0;
    for (const p of withDiff) {
      const movement_type = p.diff > 0 ? 'entry' : 'exit';
      const quantity = Math.abs(p.diff);

      await stockMovementService.createMovement({
        product_id: p.product_id,
        warehouse_id: data.warehouse_id,
        organization_id: organizationId,
        movement_type,
        quantity,
        reference: countRef,
        reference_type: 'stock_count',
        notes: `Ajuste por conteo físico. Contado: ${p.counted_qty} | Sistema: ${p.current_stock}`,
        created_by: userId
      }, organizationId);

      applied++;
    }

    await telegramRepo.clearSession(ctx.chat.id);

    await ctx.editMessageText(
      `✅ *Ajustes aplicados*\n\n` +
      `Referencia: \`${countRef}\`\n` +
      `Movimientos creados: ${applied}\n\n` +
      `_El stock del sistema ya refleja el conteo físico._`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error applying stock count', { organizationId, error: error.message });
    await ctx.editMessageText(`❌ Error al aplicar ajustes: ${error.message}`);
  }
}

// ──────────────────────────────────────────
// Pausar / Reanudar / Cancelar
// ──────────────────────────────────────────

async function handlePauseCount(ctx) {
  await ctx.answerCallbackQuery();
  // Session persists as-is — just inform the user
  await ctx.editMessageText(
    '⏸ *Conteo pausado*\n\n' +
    'Tu progreso está guardado. Cuando quieras continuar, escribí /conteo.',
    { parse_mode: 'Markdown' }
  );
}

async function handleResumeCount(ctx) {
  const { organizationId } = ctx.betali;
  await ctx.answerCallbackQuery();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);
    const data = session?.flow_data || {};

    await promptNextProduct(ctx, data.pending || [], data.counted || [], data.warehouse_name || '');
    // Restore step to counting
    await telegramRepo.saveSession(ctx.chat.id, {
      ...session,
      flow_step: 'counting'
    });
  } catch (error) {
    logger.error('Error resuming count', { organizationId, error: error.message });
    await ctx.editMessageText('❌ Error al reanudar. Intentá /conteo de nuevo.');
  }
}

async function handleRestartCount(ctx) {
  const { organizationId } = ctx.betali;
  await ctx.answerCallbackQuery();
  await telegramRepo.clearSession(ctx.chat.id);
  await startFreshCount(ctx, organizationId);
}

async function handleCancelCount(ctx) {
  await ctx.answerCallbackQuery();
  await telegramRepo.clearSession(ctx.chat.id);
  await ctx.editMessageText('❌ Conteo cancelado. El stock no fue modificado.');
}

module.exports = {
  handleConteo,
  handleCountInput,
  handleApplyCount,
  handlePauseCount,
  handleResumeCount,
  handleRestartCount,
  handleCancelCount
};
