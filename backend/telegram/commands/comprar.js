const { ServiceFactory } = require('../../config/container');
const { Logger } = require('../../utils/Logger');
const { InlineKeyboard } = require('grammy');
const telegramRepo = require('../../repositories/TelegramRepository');

const logger = new Logger('TelegramBot:comprar');

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function formatMoney(n) {
  return typeof n === 'number' ? `$${n.toFixed(2)}` : '$0.00';
}

function buildSummaryLines(items) {
  return items.map(
    (it, i) => `  ${i + 1}. *${it.product_name}* — ${it.quantity} × ${formatMoney(it.unit_price)} = ${formatMoney(it.quantity * it.unit_price)}`
  );
}

// ──────────────────────────────────────────
// Step 1: /comprar → elegir proveedor
// ──────────────────────────────────────────

async function handleComprar(ctx) {
  const { organizationId } = ctx.betali;

  try {
    const supplierService = ServiceFactory.createSupplierService();
    const result = await supplierService.getOrganizationSuppliers(organizationId);
    const suppliers = Array.isArray(result) ? result : (result?.suppliers || result?.data || []);
    const active = suppliers.filter(s => s.is_active !== false);

    // Clear any previous session
    await telegramRepo.clearSession(ctx.chat.id);

    const keyboard = new InlineKeyboard();

    // Show up to 8 suppliers (Telegram inline keyboards have limits)
    const shown = active.slice(0, 8);
    shown.forEach(s => {
      keyboard.text(`🏪 ${s.name}`, `comprar:sup:${s.supplier_id}`).row();
    });
    keyboard.text('➖ Sin proveedor', 'comprar:sup:none');

    const supplierText = shown.length > 0
      ? `Encontré *${shown.length}* proveedor${shown.length > 1 ? 'es' : ''}. ¿A cuál le comprás?`
      : 'No tenés proveedores registrados. Podés crear la OC sin proveedor.';

    await ctx.reply(
      `🛒 *Nueva orden de compra*\n\n${supplierText}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  } catch (error) {
    logger.error('Error starting /comprar', { organizationId, error: error.message });
    await ctx.reply('❌ No pude iniciar la orden de compra. Intentá de nuevo.');
  }
}

// ──────────────────────────────────────────
// Step 2: elegir proveedor → elegir producto
// ──────────────────────────────────────────

async function handleSupplierSelected(ctx) {
  const rawSupplierId = ctx.match[1]; // 'none' or UUID
  const supplierId = rawSupplierId === 'none' ? null : rawSupplierId;
  const { organizationId } = ctx.betali;

  await ctx.answerCallbackQuery();

  try {
    // Resolve warehouse automatically (first active one)
    const warehouseService = ServiceFactory.createWarehouseService();
    const warehouses = await warehouseService.getOrganizationWarehouses(organizationId);
    const warehouseList = Array.isArray(warehouses) ? warehouses : (warehouses?.warehouses || warehouses?.data || []);
    const activeWarehouses = warehouseList.filter(w => w.is_active !== false);

    if (activeWarehouses.length === 0) {
      await ctx.editMessageText('❌ No tenés depósitos configurados. Creá uno en la app antes de hacer una OC.');
      return;
    }

    const warehouseId = activeWarehouses[0].warehouse_id;
    const warehouseName = activeWarehouses[0].name;

    // Fetch supplier name for display
    let supplierName = 'Sin proveedor';
    if (supplierId) {
      const supplierService = ServiceFactory.createSupplierService();
      const supplier = await supplierService.getSupplierById(supplierId, organizationId);
      supplierName = supplier?.name || 'Proveedor';
    }

    // Save session state
    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'create_order',
      flow_step: 'select_product',
      flow_data: {
        supplier_id: supplierId,
        supplier_name: supplierName,
        warehouse_id: warehouseId,
        warehouse_name: warehouseName,
        items: []
      }
    });

    await showProductSelector(ctx, organizationId, supplierId, supplierName, warehouseName, []);
  } catch (error) {
    logger.error('Error selecting supplier', { organizationId, error: error.message });
    await ctx.editMessageText('❌ Error al procesar. Intentá de nuevo con /comprar.');
  }
}

async function showProductSelector(ctx, organizationId, supplierId, supplierName, warehouseName, currentItems) {
  const productService = ServiceFactory.createProductService();
  const products = await productService.getOrganizationProducts(organizationId);
  const available = (products || []).filter(p => p.product_type !== 'elaborado');

  const keyboard = new InlineKeyboard();
  const shown = available.slice(0, 10);
  shown.forEach(p => {
    keyboard.text(`📦 ${p.name}`, `comprar:prod:${p.product_id}`).row();
  });

  if (currentItems.length > 0) {
    keyboard.text('✅ Confirmar OC', 'comprar:confirm').row();
  }
  keyboard.text('❌ Cancelar', 'comprar:cancel');

  const header = [
    `🛒 *Nueva OC* | Proveedor: ${supplierName}`,
    `📍 Depósito: ${warehouseName}`,
  ];

  if (currentItems.length > 0) {
    header.push('', '*Productos ya agregados:*', ...buildSummaryLines(currentItems));
  }

  header.push('', '¿Qué producto querés agregar?');

  const method = currentItems.length === 0 ? 'editMessageText' : 'reply';
  await ctx[method](header.join('\n'), { parse_mode: 'Markdown', reply_markup: keyboard });
}

// ──────────────────────────────────────────
// Step 3: elegir producto → ingresar cantidad
// ──────────────────────────────────────────

async function handleProductSelected(ctx) {
  const productId = ctx.match[1];
  const { organizationId } = ctx.betali;

  await ctx.answerCallbackQuery();

  try {
    const productService = ServiceFactory.createProductService();
    const products = await productService.getOrganizationProducts(organizationId);
    const product = (products || []).find(p => p.product_id === productId);

    if (!product) {
      await ctx.editMessageText('❌ Producto no encontrado. Intentá de nuevo.');
      return;
    }

    const session = await telegramRepo.getSession(ctx.chat.id);
    const flowData = session.flow_data || {};

    // Update session: waiting for quantity
    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'create_order',
      flow_step: 'enter_quantity',
      flow_data: {
        ...flowData,
        current_product_id: productId,
        current_product_name: product.name,
        current_product_unit: product.unit || 'unidad'
      }
    });

    await ctx.editMessageText(
      `📦 *${product.name}*\n\n¿Cuántas ${product.unit || 'unidades'} querés pedir?\n\n_Escribí el número (ej: 10)_`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error selecting product', { organizationId, error: error.message });
    await ctx.editMessageText('❌ Error al seleccionar el producto. Intentá de nuevo.');
  }
}

// ──────────────────────────────────────────
// Step 4: ingresar cantidad → agregar a lista
// ──────────────────────────────────────────

async function handleQuantityInput(ctx) {
  const { organizationId } = ctx.betali;
  const text = ctx.message.text.trim();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);

    if (session.current_flow !== 'create_order' || session.flow_step !== 'enter_quantity') {
      return; // Not in the right step, ignore
    }

    const quantity = parseFloat(text.replace(',', '.'));
    if (isNaN(quantity) || quantity <= 0) {
      await ctx.reply('❌ Cantidad inválida. Ingresá un número positivo (ej: 5 o 2.5).');
      return;
    }

    const flowData = session.flow_data || {};
    const newItem = {
      product_id: flowData.current_product_id,
      product_name: flowData.current_product_name,
      unit: flowData.current_product_unit,
      quantity,
      unit_price: 0  // Precio se puede editar desde la app
    };

    const updatedItems = [...(flowData.items || []), newItem];

    // Update session
    await telegramRepo.saveSession(ctx.chat.id, {
      current_flow: 'create_order',
      flow_step: 'select_product',
      flow_data: {
        supplier_id: flowData.supplier_id,
        supplier_name: flowData.supplier_name,
        warehouse_id: flowData.warehouse_id,
        warehouse_name: flowData.warehouse_name,
        items: updatedItems
      }
    });

    await showProductSelector(
      ctx,
      organizationId,
      flowData.supplier_id,
      flowData.supplier_name,
      flowData.warehouse_name,
      updatedItems
    );
  } catch (error) {
    logger.error('Error processing quantity input', { organizationId, error: error.message });
    await ctx.reply('❌ Error al procesar la cantidad. Intentá de nuevo.');
  }
}

// ──────────────────────────────────────────
// Step 5: confirmar → crear OC
// ──────────────────────────────────────────

async function handleConfirmOrder(ctx) {
  const { organizationId, userId } = ctx.betali;

  await ctx.answerCallbackQuery();

  try {
    const session = await telegramRepo.getSession(ctx.chat.id);
    const flowData = session.flow_data || {};

    if (!flowData.items || flowData.items.length === 0) {
      await ctx.editMessageText('❌ No hay productos en la orden. Usá /comprar para empezar.');
      return;
    }

    const purchaseOrderService = ServiceFactory.createPurchaseOrderService();

    const orderData = {
      supplier_id: flowData.supplier_id || null,
      warehouse_id: flowData.warehouse_id,
      user_id: userId,
      created_by: userId,
      status: 'draft',
      notes: 'Creada desde Telegram',
      items: flowData.items.map(it => ({
        product_id: it.product_id,
        quantity: it.quantity,
        unit_price: it.unit_price || 0
      }))
    };

    const created = await purchaseOrderService.createPurchaseOrder(orderData, organizationId);

    await telegramRepo.clearSession(ctx.chat.id);

    const summaryLines = buildSummaryLines(flowData.items);
    const msg = [
      '✅ *Orden de compra creada*',
      '',
      `📋 *OC #${created.purchase_order_number || created.purchase_order_id.slice(0, 8).toUpperCase()}*`,
      `🏪 Proveedor: ${flowData.supplier_name}`,
      `📍 Depósito: ${flowData.warehouse_name}`,
      `📦 Estado: *Borrador*`,
      '',
      '*Productos:*',
      ...summaryLines,
      '',
      '_Podés completar precios y aprobarla desde la app._'
    ];

    await ctx.editMessageText(msg.join('\n'), { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error creating purchase order', { organizationId, error: error.message });
    await ctx.editMessageText(`❌ Error al crear la OC: ${error.message}`);
  }
}

// ──────────────────────────────────────────
// Cancel
// ──────────────────────────────────────────

async function handleCancelOrder(ctx) {
  await ctx.answerCallbackQuery();
  await telegramRepo.clearSession(ctx.chat.id);
  await ctx.editMessageText('❌ Orden cancelada.');
}

module.exports = {
  handleComprar,
  handleSupplierSelected,
  handleProductSelected,
  handleQuantityInput,
  handleConfirmOrder,
  handleCancelOrder
};
