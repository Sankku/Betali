const { ServiceFactory, container } = require('../../config/container');
const { Logger } = require('../../utils/Logger');
const { InlineKeyboard } = require('grammy');
const telegramRepo = require('../../repositories/TelegramRepository');

const logger = new Logger('TelegramBot:movimiento');

const TYPE_LABELS = {
  entry: { emoji: '📥', label: 'Entrada' },
  exit:  { emoji: '📤', label: 'Salida' }
};

// ──────────────────────────────────────────
// Step 1: /movimiento → elegir tipo
// ──────────────────────────────────────────

async function handleMovimiento(ctx) {
  await telegramRepo.clearSession(ctx.chat.id);

  const keyboard = new InlineKeyboard()
    .text('📥 Entrada de stock',  'mov:type:entry')
    .row()
    .text('📤 Salida de stock',   'mov:type:exit');

  await ctx.reply(
    '📦 *Registrar movimiento*\n\n¿Qué tipo de movimiento querés registrar?',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

// ──────────────────────────────────────────
// Step 2: tipo seleccionado → elegir producto
// ──────────────────────────────────────────

async function handleTypeSelected(ctx) {
  const type = ctx.match[1]; // 'entry' | 'exit'
  const { organizationId } = ctx.betali;

  await ctx.answerCallbackQuery();

  try {
    const productTypeService = ServiceFactory.createProductTypeService();
    const products = await productTypeService.getTypes(organizationId);
    const available = (products || []).filter(p => p.product_type !== 'elaborado');

    if (available.length === 0) {
      await ctx.editMessageText('❌ No tenés productos registrados.');
      return;
    }

    const { emoji, label } = TYPE_LABELS[type];

    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'movement',
      flow_step: 'select_product',
      flow_data: { type, products: available }
    });

    const keyboard = new InlineKeyboard();
    available.slice(0, 12).forEach(p => {
      const stock = p.current_stock ?? 0;
      keyboard.text(`${p.name} (${stock} ${p.unit || 'u'})`, `mov:prod:${p.product_type_id}`).row();
    });
    keyboard.text('❌ Cancelar', 'mov:cancel');

    await ctx.editMessageText(
      `${emoji} *${label} de stock*\n\n¿Qué producto?`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  } catch (error) {
    logger.error('Error selecting movement type', { organizationId, error: error.message });
    await ctx.editMessageText('❌ Error al cargar productos. Intentá de nuevo.');
  }
}

// ──────────────────────────────────────────
// Step 3: producto seleccionado → ingresar cantidad
// ──────────────────────────────────────────

async function handleProductSelected(ctx) {
  const productId = ctx.match[1];
  const { organizationId } = ctx.betali;

  await ctx.answerCallbackQuery();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);
    const data = session.flow_data || {};
    const product = (data.products || []).find(p => p.product_type_id === productId);

    if (!product) {
      await ctx.editMessageText('❌ Producto no encontrado. Intentá de nuevo con /movimiento.');
      return;
    }

    const { emoji, label } = TYPE_LABELS[data.type];

    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'movement',
      flow_step: 'enter_quantity',
      flow_data: {
        type: data.type,
        product_id: product.product_type_id,
        product_name: product.name,
        product_unit: product.unit || 'unidad',
        current_stock: product.current_stock ?? 0
      }
    });

    await ctx.editMessageText(
      `${emoji} *${label}* — ${product.name}\n` +
      `Stock actual: ${product.current_stock ?? 0} ${product.unit || 'unidad'}\n\n` +
      `¿Cuántas ${product.unit || 'unidades'}?\n_Escribí el número (ej: 10 o 2.5)_`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error selecting product for movement', { organizationId, error: error.message });
    await ctx.editMessageText('❌ Error al procesar. Intentá de nuevo.');
  }
}

// ──────────────────────────────────────────
// Step 4: cantidad → confirmar
// ──────────────────────────────────────────

async function handleQuantityInput(ctx) {
  const { organizationId } = ctx.betali;
  const text = ctx.message.text.trim();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);

    if (session?.current_flow !== 'movement' || session?.flow_step !== 'enter_quantity') {
      return;
    }

    const quantity = parseFloat(text.replace(',', '.'));
    if (isNaN(quantity) || quantity <= 0) {
      await ctx.reply('❌ Cantidad inválida. Ingresá un número mayor a 0 (ej: 5 o 2.5).');
      return;
    }

    const data = session.flow_data;
    const { emoji, label } = TYPE_LABELS[data.type];

    const newStock = data.type === 'entry'
      ? data.current_stock + quantity
      : data.current_stock - quantity;

    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'movement',
      flow_step: 'confirm',
      flow_data: { ...data, quantity }
    });

    const keyboard = new InlineKeyboard()
      .text('✅ Confirmar', 'mov:confirm')
      .text('❌ Cancelar', 'mov:cancel');

    await ctx.reply(
      `${emoji} *Confirmar movimiento*\n\n` +
      `Tipo: ${label}\n` +
      `Producto: *${data.product_name}*\n` +
      `Cantidad: ${quantity} ${data.product_unit}\n` +
      `Stock actual: ${data.current_stock} → *${newStock}*\n`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  } catch (error) {
    logger.error('Error processing quantity for movement', { organizationId, error: error.message });
    await ctx.reply('❌ Error al procesar. Intentá de nuevo.');
  }
}

// ──────────────────────────────────────────
// Step 5: confirmar → crear movimiento
// ──────────────────────────────────────────

async function handleConfirmMovement(ctx) {
  const { organizationId, userId } = ctx.betali;
  await ctx.answerCallbackQuery();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);
    const data = session?.flow_data;

    if (!data?.product_id || !data?.quantity) {
      await ctx.editMessageText('❌ No hay movimiento pendiente. Usá /movimiento para empezar.');
      return;
    }

    // Get first warehouse
    const warehouseService = ServiceFactory.createWarehouseService();
    const warehouses = await warehouseService.getOrganizationWarehouses(organizationId);
    const warehouseList = Array.isArray(warehouses) ? warehouses : (warehouses?.warehouses || warehouses?.data || []);
    const warehouse = warehouseList.filter(w => w.is_active !== false)[0];

    if (!warehouse) {
      await ctx.editMessageText('❌ No tenés depósitos configurados.');
      return;
    }

    // Resolve lot via FEFO
    const productLotService = container.get('productLotService');
    let lotAssignment;
    try {
      lotAssignment = await productLotService.fefoAssignLot(
        data.product_id,
        warehouse.warehouse_id,
        data.quantity,
        organizationId
      );
    } catch (lotErr) {
      if (lotErr.code === 'no_lot_available') {
        await ctx.editMessageText('❌ No hay lotes registrados para este producto. Registrá un lote primero desde el panel web.');
        return;
      }
      throw lotErr;
    }

    const stockMovementService = ServiceFactory.createStockMovementService();

    await stockMovementService.createMovement({
      lot_id: lotAssignment.lot_id,
      warehouse_id: warehouse.warehouse_id,
      organization_id: organizationId,
      movement_type: data.type,
      quantity: data.quantity,
      reference: 'TELEGRAM',
      reference_type: 'manual',
      notes: 'Registrado desde Telegram',
      created_by: userId
    }, organizationId);

    await telegramRepo.clearSession(ctx.chat.id);

    const { emoji, label } = TYPE_LABELS[data.type];
    const newStock = data.type === 'entry'
      ? data.current_stock + data.quantity
      : data.current_stock - data.quantity;

    await ctx.editMessageText(
      `${emoji} *${label} registrada*\n\n` +
      `Producto: *${data.product_name}*\n` +
      `Cantidad: ${data.quantity} ${data.product_unit}\n` +
      `Stock actualizado: *${newStock} ${data.product_unit}*`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error creating movement', { organizationId, error: error.message });
    await ctx.editMessageText(`❌ Error al registrar: ${error.message}`);
  }
}

// ──────────────────────────────────────────
// Cancel
// ──────────────────────────────────────────

async function handleCancelMovement(ctx) {
  await ctx.answerCallbackQuery();
  await telegramRepo.clearSession(ctx.chat.id);
  await ctx.editMessageText('❌ Movimiento cancelado.');
}

module.exports = {
  handleMovimiento,
  handleTypeSelected,
  handleProductSelected,
  handleQuantityInput,
  handleConfirmMovement,
  handleCancelMovement
};
