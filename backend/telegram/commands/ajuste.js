const { ServiceFactory } = require('../../config/container');
const { Logger } = require('../../utils/Logger');
const { InlineKeyboard } = require('grammy');
const telegramRepo = require('../../repositories/TelegramRepository');
const supabase = require('../../lib/supabaseClient');

const logger = new Logger('TelegramBot:ajuste');

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

/**
 * Busca productos por nombre (ilike) en la organización, máx 5 resultados.
 */
async function searchProducts(organizationId, term) {
  const safe = term.replace(/[%_]/g, '');
  const { data, error } = await supabase
    .from('product_types')
    .select('product_type_id, name, unit, current_stock, product_type')
    .eq('organization_id', organizationId)
    .neq('product_type', 'elaborado')
    .ilike('name', `%${safe}%`)
    .order('name', { ascending: true })
    .limit(5);

  if (error) throw error;
  return data || [];
}

// ──────────────────────────────────────────
// /ajuste — inicio del flujo
// ──────────────────────────────────────────

async function handleAjuste(ctx) {
  const { organizationId } = ctx.betali;

  try {
    const existing = await telegramRepo.getSession(ctx.chat.id);

    if (existing?.current_flow === 'targeted_count') {
      const data = existing.flow_data || {};
      const items = data.items || [];
      const remaining = data.remaining;

      if (remaining > 0) {
        const keyboard = new InlineKeyboard()
          .text('▶️ Retomar ajuste', 'ajuste:resume')
          .row()
          .text('🗑 Descartar y empezar de nuevo', 'ajuste:restart');

        await ctx.reply(
          `📋 *Ajuste en curso*\n\n` +
          `Actualizados: ${items.length}\n` +
          `Pendientes: ${remaining}\n\n` +
          `¿Querés continuar o empezar de nuevo?`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
        return;
      }
    }

    // Limpiar sesión anterior y empezar
    await telegramRepo.clearSession(ctx.chat.id);
    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'targeted_count',
      flow_step: 'ask_count',
      flow_data: { items: [], remaining: 0, warehouse_id: null, warehouse_name: null }
    });

    await ctx.reply(
      `🔍 *Ajuste específico de stock*\n\n` +
      `¿Cuántos productos querés actualizar?`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error starting /ajuste', { organizationId, error: error.message });
    await ctx.reply('❌ No pude iniciar el ajuste. Intentá de nuevo.');
  }
}

// ──────────────────────────────────────────
// Procesar texto según el step activo
// ──────────────────────────────────────────

async function handleAjusteText(ctx) {
  const { organizationId } = ctx.betali;
  const text = ctx.message.text.trim();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);
    if (session?.current_flow !== 'targeted_count') return false;

    switch (session.flow_step) {
      case 'ask_count':
        return handleAskCountInput(ctx, session, text, organizationId);
      case 'search_product':
        return handleSearchInput(ctx, session, text, organizationId);
      case 'enter_quantity':
        return handleQuantityInput(ctx, session, text, organizationId);
      default:
        return false;
    }
  } catch (error) {
    logger.error('Error in ajuste text handler', { organizationId, error: error.message });
    await ctx.reply('❌ Error. Intentá de nuevo o escribí /ajuste para reiniciar.');
    return true;
  }
}

// ──────────────────────────────────────────
// Step: ask_count — cuántos productos
// ──────────────────────────────────────────

async function handleAskCountInput(ctx, session, text, organizationId) {
  const count = parseInt(text, 10);
  if (isNaN(count) || count < 1 || count > 100) {
    await ctx.reply('❌ Ingresá un número entre 1 y 100.');
    return true;
  }

  // Obtener depósito
  const warehouseService = ServiceFactory.createWarehouseService();
  const warehouses = await warehouseService.getOrganizationWarehouses(organizationId);
  const warehouseList = Array.isArray(warehouses) ? warehouses : (warehouses?.warehouses || warehouses?.data || []);
  const warehouse = warehouseList.filter(w => w.is_active !== false)[0];

  if (!warehouse) {
    await ctx.reply('❌ No tenés depósitos configurados.');
    return true;
  }

  await telegramRepo.saveSession(ctx.chat.id, {
    current_flow: 'targeted_count',
    flow_step: 'search_product',
    flow_data: {
      items: [],
      remaining: count,
      total: count,
      warehouse_id: warehouse.warehouse_id,
      warehouse_name: warehouse.name
    }
  });

  await ctx.reply(
    `📦 *${count} producto${count !== 1 ? 's' : ''} a ajustar* | ${warehouse.name}\n\n` +
    `[1/${count}] Escribí el nombre del producto a buscar:`,
    { parse_mode: 'Markdown' }
  );
  return true;
}

// ──────────────────────────────────────────
// Step: search_product — buscar por nombre
// ──────────────────────────────────────────

async function handleSearchInput(ctx, session, text, organizationId) {
  if (text.length < 2) {
    await ctx.reply('❌ Ingresá al menos 2 caracteres para buscar.');
    return true;
  }

  const results = await searchProducts(organizationId, text);

  if (results.length === 0) {
    await ctx.reply(
      `❌ No encontré productos con *"${text}"*.\n\nIntentá con otro nombre:`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (results.length === 1) {
    // Único resultado — seleccionar directamente
    return selectProduct(ctx, session, results[0]);
  }

  // Múltiples opciones — mostrar inline keyboard
  const keyboard = new InlineKeyboard();
  results.forEach((p, i) => {
    keyboard.text(
      `${p.name} (${p.current_stock ?? 0} ${p.unit || 'unid'})`,
      `ajuste:sel:${p.product_type_id}`
    ).row();
  });
  keyboard.text('🔍 Buscar otro nombre', 'ajuste:searchagain');

  const data = session.flow_data;
  const current = data.total - data.remaining + 1;

  // Guardar los resultados en sesión para poder hacer callback lookup
  await telegramRepo.saveSession(ctx.chat.id, {
    current_flow: 'targeted_count',
    flow_step: 'picking_product',
    flow_data: {
      ...data,
      search_results: results.map(p => ({
        product_id: p.product_type_id,
        name: p.name,
        unit: p.unit || 'unidad',
        current_stock: p.current_stock ?? 0
      }))
    }
  });

  await ctx.reply(
    `🔍 Encontré ${results.length} productos para *"${text}"*\n` +
    `[${current}/${data.total}] Seleccioná el correcto:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
  return true;
}

// ──────────────────────────────────────────
// Callback: ajuste:sel:<id>
// ──────────────────────────────────────────

async function handleProductSelected(ctx) {
  await ctx.answerCallbackQuery();
  const { organizationId } = ctx.betali;

  try {
    const productId = ctx.callbackQuery.data.replace('ajuste:sel:', '');
    const session = await telegramRepo.getSession(ctx.chat.id);

    if (session?.current_flow !== 'targeted_count') {
      await ctx.editMessageText('❌ No hay un ajuste activo. Usá /ajuste para empezar.');
      return;
    }

    const data = session.flow_data;
    const product = (data.search_results || []).find(p => p.product_id === productId);

    if (!product) {
      await ctx.editMessageText('❌ Producto no encontrado. Usá /ajuste para reiniciar.');
      return;
    }

    await selectProduct(ctx, session, product, true);
  } catch (error) {
    logger.error('Error selecting product in ajuste', { organizationId, error: error.message });
    await ctx.editMessageText('❌ Error al seleccionar. Intentá de nuevo.');
  }
}

async function selectProduct(ctx, session, product, isCallback = false) {
  const data = session.flow_data;
  const current = data.total - data.remaining + 1;

  const selectedProduct = product.product_type_id
    ? { product_id: product.product_type_id, name: product.name, unit: product.unit || 'unidad', current_stock: product.current_stock ?? 0 }
    : product; // ya tiene el formato correcto si viene de search_results

  await telegramRepo.saveSession(ctx.chat.id, {
    current_flow: 'targeted_count',
    flow_step: 'enter_quantity',
    flow_data: {
      ...data,
      search_results: undefined,
      current_product: selectedProduct
    }
  });

  const replyFn = isCallback
    ? (text, opts) => ctx.editMessageText(text, opts)
    : (text, opts) => ctx.reply(text, opts);

  await replyFn(
    `✅ *${selectedProduct.name}*\n` +
    `Stock en sistema: ${selectedProduct.current_stock} ${selectedProduct.unit}\n\n` +
    `[${current}/${data.total}] ¿Cuánto contaste físicamente?`,
    { parse_mode: 'Markdown' }
  );
}

// ──────────────────────────────────────────
// Callback: ajuste:searchagain
// ──────────────────────────────────────────

async function handleSearchAgain(ctx) {
  await ctx.answerCallbackQuery();
  const session = await telegramRepo.getSession(ctx.chat.id);
  const data = session?.flow_data || {};
  const current = (data.total || 1) - (data.remaining || 1) + 1;

  await telegramRepo.saveSession(ctx.chat.id, {
    current_flow: 'targeted_count',
    flow_step: 'search_product',
    flow_data: { ...data, search_results: undefined }
  });

  await ctx.editMessageText(
    `[${current}/${data.total || '?'}] Escribí el nombre del producto a buscar:`,
    { parse_mode: 'Markdown' }
  );
}

// ──────────────────────────────────────────
// Step: enter_quantity
// ──────────────────────────────────────────

async function handleQuantityInput(ctx, session, text, organizationId) {
  const qty = parseFloat(text.replace(',', '.'));
  if (isNaN(qty) || qty < 0) {
    await ctx.reply('❌ Cantidad inválida. Ingresá un número mayor o igual a 0.');
    return true;
  }

  const data = session.flow_data;
  const product = data.current_product;
  const diff = qty - product.current_stock;

  const newItems = [...data.items, { ...product, counted_qty: qty, diff }];
  const newRemaining = data.remaining - 1;

  const emoji = diff === 0 ? '✅' : diff > 0 ? '🟢' : '🔴';
  await ctx.reply(
    `${emoji} *${product.name}*: ${qty} ${product.unit} (${formatDiff(diff, product.unit)})`,
    { parse_mode: 'Markdown' }
  );

  if (newRemaining === 0) {
    // Todos los productos ingresados — mostrar resumen
    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'targeted_count',
      flow_step: 'confirm',
      flow_data: {
        ...data,
        items: newItems,
        remaining: 0,
        current_product: undefined
      }
    });

    await showSummary(ctx, newItems, data.warehouse_name);
  } else {
    // Siguiente producto
    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'targeted_count',
      flow_step: 'search_product',
      flow_data: {
        ...data,
        items: newItems,
        remaining: newRemaining,
        current_product: undefined,
        search_results: undefined
      }
    });

    const next = data.total - newRemaining + 1;
    await ctx.reply(
      `[${next}/${data.total}] Escribí el nombre del siguiente producto:`,
      { parse_mode: 'Markdown' }
    );
  }

  return true;
}

// ──────────────────────────────────────────
// Resumen final
// ──────────────────────────────────────────

async function showSummary(ctx, items, warehouseName) {
  const withDiff = items.filter(p => p.diff !== 0);
  const ok       = items.filter(p => p.diff === 0);

  const lines = [`📊 *Resumen del ajuste* | ${warehouseName}`, ''];

  items.forEach(p => {
    lines.push(`${diffEmoji(p.diff)} *${p.name}*: sistema ${p.current_stock} | contado ${p.counted_qty} | *${formatDiff(p.diff, p.unit)}*`);
  });

  lines.push('');
  lines.push(`✅ Sin diferencias: ${ok.length}`);
  lines.push(`🔄 Con diferencias: ${withDiff.length}`);

  const keyboard = new InlineKeyboard();
  if (withDiff.length > 0) {
    keyboard.text('✅ Aplicar ajustes al stock', 'ajuste:apply').row();
  }
  keyboard.text('🗑 Descartar', 'ajuste:cancel');

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: keyboard });
}

// ──────────────────────────────────────────
// Aplicar ajustes
// ──────────────────────────────────────────

async function handleApplyAdjustment(ctx) {
  const { organizationId, userId } = ctx.betali;
  await ctx.answerCallbackQuery();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);
    if (session?.current_flow !== 'targeted_count') {
      await ctx.editMessageText('❌ No hay un ajuste activo.');
      return;
    }

    const data = session.flow_data;
    const withDiff = data.items.filter(p => p.diff !== 0);

    if (withDiff.length === 0) {
      await telegramRepo.clearSession(ctx.chat.id);
      await ctx.editMessageText('✅ Sin diferencias — no se requieren ajustes.');
      return;
    }

    const { container } = require('../../config/container');
    const stockMovementService = ServiceFactory.createStockMovementService();
    const productLotService = container.get('productLotService');
    const countRef = `AJUSTE-${new Date().toISOString().slice(0, 10)}`;

    let applied = 0;
    const errors = [];

    for (const p of withDiff) {
      const movement_type = p.diff > 0 ? 'entry' : 'exit';
      const quantity = Math.abs(p.diff);

      let lotAssignment;
      try {
        lotAssignment = await productLotService.fefoAssignLot(
          p.product_id,
          data.warehouse_id,
          quantity,
          organizationId
        );
      } catch (lotErr) {
        if (lotErr.code === 'no_lot_available') {
          logger.warn('Skipping adjustment — no lots for product', { product: p.name });
          errors.push(p.name);
          continue;
        }
        throw lotErr;
      }

      await stockMovementService.createMovement({
        lot_id: lotAssignment.lot_id,
        warehouse_id: data.warehouse_id,
        organization_id: organizationId,
        movement_type,
        quantity,
        reference: countRef,
        reference_type: 'stock_count',
        notes: `Ajuste específico. Contado: ${p.counted_qty} | Sistema: ${p.current_stock}`,
        created_by: userId
      }, organizationId);

      applied++;
    }

    await telegramRepo.clearSession(ctx.chat.id);

    let msg = `✅ *Ajustes aplicados*\n\nReferencia: \`${countRef}\`\nMovimientos creados: ${applied}`;
    if (errors.length > 0) {
      msg += `\n\n⚠️ Sin lotes (no ajustados): ${errors.join(', ')}`;
    }
    msg += '\n\n_El stock del sistema ya refleja el conteo físico._';

    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error applying targeted adjustment', { organizationId, error: error.message });
    await ctx.editMessageText(`❌ Error al aplicar ajustes: ${error.message}`);
  }
}

// ──────────────────────────────────────────
// Reanudar / Reiniciar / Cancelar
// ──────────────────────────────────────────

async function handleResumeAdjustment(ctx) {
  await ctx.answerCallbackQuery();
  const session = await telegramRepo.getSession(ctx.chat.id);
  const data = session?.flow_data || {};
  const next = (data.total || 1) - (data.remaining || 1) + 1;

  await telegramRepo.saveSession(ctx.chat.id, {
    ...session,
    flow_step: 'search_product'
  });

  await ctx.editMessageText(
    `[${next}/${data.total || '?'}] Escribí el nombre del producto a buscar:`,
    { parse_mode: 'Markdown' }
  );
}

async function handleRestartAdjustment(ctx) {
  await ctx.answerCallbackQuery();
  await telegramRepo.clearSession(ctx.chat.id);
  await handleAjuste(ctx);
}

async function handleCancelAdjustment(ctx) {
  await ctx.answerCallbackQuery();
  await telegramRepo.clearSession(ctx.chat.id);
  await ctx.editMessageText('❌ Ajuste cancelado. El stock no fue modificado.');
}

module.exports = {
  handleAjuste,
  handleAjusteText,
  handleProductSelected,
  handleSearchAgain,
  handleApplyAdjustment,
  handleResumeAdjustment,
  handleRestartAdjustment,
  handleCancelAdjustment
};
