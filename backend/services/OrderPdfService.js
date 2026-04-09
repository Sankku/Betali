const PDFDocument = require('pdfkit');
const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');

/**
 * OrderPdfService - Generates PDF documents for sales orders and purchase orders
 */
class OrderPdfService {
  constructor() {
    this.logger = new Logger('OrderPdfService');
  }

  // ============================================================================
  // SALES ORDER PDF
  // ============================================================================

  /**
   * Generate PDF for a sales order
   * @param {string} orderId - The order ID
   * @param {string} organizationId - Organization ID for authorization
   * @returns {Promise<Buffer>} PDF as buffer
   */
  async generateSalesOrderPdf(orderId, organizationId, lang = 'es') {
    this.logger.info('Generating sales order PDF:', { orderId });

    // Fetch order with all related data
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        clients (
          client_id,
          name,
          email,
          phone,
          address,
          cuit
        ),
        warehouse (
          warehouse_id,
          name,
          location
        ),
        order_details (
          order_detail_id,
          quantity,
          price,
          lot_id,
          product_types!order_details_product_type_id_fkey (
            product_type_id,
            name,
            sku,
            unit
          ),
          product_lots!order_details_lot_id_fkey (
            lot_id,
            lot_number
          )
        )
      `)
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      this.logger.error('Order not found:', { orderId, error });
      throw new Error('Order not found');
    }

    // Fetch organization info for header
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, email, phone, tax_id, logo_url')
      .eq('organization_id', organizationId)
      .single();

    return this.createSalesOrderPdf(order, organization, lang);
  }

  /**
   * Create the sales order PDF document
   */
  async createSalesOrderPdf(order, organization, lang = 'es') {
    const t = this.getTranslations(lang);
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `${t.salesOrder} - ${order.order_number}`,
            Author: organization?.name || 'Betali',
            Subject: t.salesOrder
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.renderCompanyHeader(doc, organization, t.salesOrder, t);

        // Order info
        this.renderOrderInfo(doc, order, 100, t);

        // Client info
        this.renderClientInfo(doc, order.clients, 160, t);

        // Line items table
        const tableEndY = this.renderLineItems(doc, order.order_details, 260, t);

        // Totals
        this.renderTotals(doc, order, tableEndY + 20, t);

        // Footer
        this.renderFooter(doc, order.notes, t);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // PURCHASE ORDER PDF
  // ============================================================================

  /**
   * Generate PDF for a purchase order
   * @param {string} purchaseOrderId - The purchase order ID
   * @param {string} organizationId - Organization ID for authorization
   * @returns {Promise<Buffer>} PDF as buffer
   */
  async generatePurchaseOrderPdf(purchaseOrderId, organizationId, lang = 'es') {
    this.logger.info('Generating purchase order PDF:', { purchaseOrderId });

    // Fetch purchase order with all related data
    const { data: purchaseOrder, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (
          supplier_id,
          name,
          email,
          phone,
          contact_person,
          cuit
        ),
        warehouse (
          warehouse_id,
          name,
          location
        ),
        purchase_order_details (
          detail_id,
          quantity,
          received_quantity,
          unit_price,
          line_total,
          notes,
          lot_id,
          product_types!purchase_order_details_product_type_id_fkey (
            product_type_id,
            name,
            sku,
            unit,
            description
          ),
          product_lots!purchase_order_details_lot_id_fkey (
            lot_id,
            lot_number
          )
        )
      `)
      .eq('purchase_order_id', purchaseOrderId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !purchaseOrder) {
      this.logger.error('Purchase order not found:', { purchaseOrderId, error });
      throw new Error('Purchase order not found');
    }

    // Fetch organization info for header
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, email, phone, tax_id, logo_url')
      .eq('organization_id', organizationId)
      .single();

    return this.createPurchaseOrderPdf(purchaseOrder, organization, lang);
  }

  /**
   * Create the purchase order PDF document
   */
  async createPurchaseOrderPdf(purchaseOrder, organization, lang = 'es') {
    const t = this.getTranslations(lang);
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `${t.purchaseOrder} - ${purchaseOrder.purchase_order_number}`,
            Author: organization?.name || 'Betali',
            Subject: t.purchaseOrder
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.renderCompanyHeader(doc, organization, t.purchaseOrder, t);

        // PO info
        this.renderPurchaseOrderInfo(doc, purchaseOrder, 100, t);

        // Supplier info
        this.renderSupplierInfo(doc, purchaseOrder.suppliers, 160, t);

        // Line items table
        const tableEndY = this.renderPurchaseOrderLineItems(doc, purchaseOrder.purchase_order_details, 260, t);

        // Totals
        this.renderPurchaseOrderTotals(doc, purchaseOrder, tableEndY + 20, t);

        // Footer
        this.renderFooter(doc, purchaseOrder.notes, t);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // SHARED RENDERING METHODS
  // ============================================================================

  // i18n translations
  getTranslations(lang) {
    const translations = {
      es: {
        salesOrder:         'ORDEN DE VENTA',
        purchaseOrder:      'ORDEN DE COMPRA',
        number:             'Número:',
        date:               'Fecha:',
        status:             'Estado:',
        warehouse:          'Almacén:',
        orderDate:          'Fecha Orden:',
        expectedDelivery:   'Entrega Esperada:',
        destWarehouse:      'Almacén Destino:',
        client:             'CLIENTE',
        supplier:           'PROVEEDOR',
        articles:           'ARTÍCULOS',
        products:           'PRODUCTOS',
        product:            'Producto',
        qty:                'Cant.',
        received:           'Recibido',
        unitPrice:          'Precio Unit.',
        total:              'Total',
        subtotal:           'Subtotal:',
        discount:           'Descuento:',
        tax:                'IVA:',
        shipping:           'Envío:',
        grandTotal:         'TOTAL:',
        notes:              'NOTAS',
        contact:            'Contacto:',
        tel:                'Tel:',
        cuit:               'CUIT:',
        sku:                'SKU:',
        lot:                'Lote:',
        generatedOn:        (date) => `Documento generado automáticamente el ${date} · Betali`,
        dateLocale:         'es-AR',
        statuses: {
          draft:             'Borrador',
          pending:           'Pendiente',
          processing:        'Procesando',
          shipped:           'Enviado',
          completed:         'Completado',
          cancelled:         'Cancelado',
          approved:          'Aprobada',
          received:          'Recibida',
          partially_received:'Parcialmente Recibida',
          cancelledF:        'Cancelada',
        },
        statusGroups: {
          completed: ['completado', 'recibida', 'aprobada'],
          cancelled: ['cancelado', 'cancelada'],
        },
      },
      en: {
        salesOrder:         'SALES ORDER',
        purchaseOrder:      'PURCHASE ORDER',
        number:             'Number:',
        date:               'Date:',
        status:             'Status:',
        warehouse:          'Warehouse:',
        orderDate:          'Order Date:',
        expectedDelivery:   'Expected Delivery:',
        destWarehouse:      'Destination Warehouse:',
        client:             'CLIENT',
        supplier:           'SUPPLIER',
        articles:           'ITEMS',
        products:           'PRODUCTS',
        product:            'Product',
        qty:                'Qty.',
        received:           'Received',
        unitPrice:          'Unit Price',
        total:              'Total',
        subtotal:           'Subtotal:',
        discount:           'Discount:',
        tax:                'Tax:',
        shipping:           'Shipping:',
        grandTotal:         'TOTAL:',
        notes:              'NOTES',
        contact:            'Contact:',
        tel:                'Tel:',
        cuit:               'Tax ID:',
        sku:                'SKU:',
        lot:                'Lot:',
        generatedOn:        (date) => `Automatically generated on ${date} · Betali`,
        dateLocale:         'en-US',
        statuses: {
          draft:             'Draft',
          pending:           'Pending',
          processing:        'Processing',
          shipped:           'Shipped',
          completed:         'Completed',
          cancelled:         'Cancelled',
          approved:          'Approved',
          received:          'Received',
          partially_received:'Partially Received',
          cancelledF:        'Cancelled',
        },
        statusGroups: {
          completed: ['completed', 'received', 'approved'],
          cancelled: ['cancelled'],
        },
      },
    };
    return translations[lang] || translations['es'];
  }

  // Design tokens
  get colors() {
    return {
      navy:       '#0F172A',
      navyMid:    '#1E293B',
      accent:     '#0369A1',
      accentLight:'#E0F2FE',
      gray50:     '#F8FAFC',
      gray100:    '#F1F5F9',
      gray200:    '#E2E8F0',
      gray400:    '#94A3B8',
      gray600:    '#475569',
      text:       '#0F172A',
      textMuted:  '#64748B',
      white:      '#FFFFFF',
      green:      '#166534',
      greenBg:    '#DCFCE7',
      red:        '#991B1B',
      redBg:      '#FEE2E2',
      amber:      '#92400E',
      amberBg:    '#FEF3C7',
    };
  }

  /**
   * Render company header — accent bar + two-column layout
   */
  renderCompanyHeader(doc, organization, documentType, t) {
    const C = this.colors;

    // Top accent bar
    doc.rect(0, 0, 595, 6).fill(C.accent);

    // Company name (left)
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor(C.navy)
      .text(organization?.name || 'BETALI', 50, 28);

    // Company meta (left, below name)
    doc.fontSize(8).font('Helvetica').fillColor(C.textMuted);
    let metaY = 54;
    if (organization?.email)  { doc.text(organization.email,          50, metaY); metaY += 11; }
    if (organization?.phone)  { doc.text(organization.phone,          50, metaY); metaY += 11; }
    if (organization?.tax_id) { doc.text(`CUIT: ${organization.tax_id}`, 50, metaY); }

    // Document type — text only, right-aligned
    doc
      .fontSize(15)
      .font('Helvetica-Bold')
      .fillColor(C.accent)
      .text(documentType, 300, 30, { width: 245, align: 'right' });

    // Thin underline below document type
    doc
      .moveTo(300, 53)
      .lineTo(545, 53)
      .lineWidth(1.5)
      .strokeColor(C.accent)
      .stroke();

    // Thin divider
    doc
      .moveTo(50, 82)
      .lineTo(545, 82)
      .lineWidth(0.5)
      .strokeColor(C.gray200)
      .stroke();
  }

  /**
   * Helper: draw a status badge pill
   */
  renderStatusBadge(doc, text, x, y, t) {
    const C = this.colors;
    const lowerText = (text || '').toLowerCase();
    let bg, fg;

    const completedGroup = t?.statusGroups?.completed || ['completado', 'recibida', 'aprobada'];
    const cancelledGroup = t?.statusGroups?.cancelled || ['cancelado', 'cancelada'];

    if (completedGroup.includes(lowerText)) {
      bg = C.greenBg; fg = C.green;
    } else if (cancelledGroup.includes(lowerText)) {
      bg = C.redBg;   fg = C.red;
    } else {
      bg = C.amberBg; fg = C.amber;
    }

    const badgeW = 80;
    doc.roundedRect(x, y - 2, badgeW, 15, 4).fill(bg);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(fg).text(text, x, y + 1, { width: badgeW, align: 'center' });
  }

  /**
   * Render a two-column info grid row
   */
  renderInfoRow(doc, label, value, lx, rx, y) {
    const C = this.colors;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.textMuted).text(label, lx, y);
    doc.font('Helvetica').fillColor(C.text).text(value || '—', rx, y);
  }

  /**
   * Render sales order info
   */
  renderOrderInfo(doc, order, yPos, t) {
    const status = this.translateStatus(order.status, t);

    // Left column
    this.renderInfoRow(doc, t.number,   order.order_number || `ORD-${order.order_id.substring(0, 8).toUpperCase()}`, 50, 120, yPos);
    this.renderInfoRow(doc, t.date,     this.formatDate(order.order_date || order.created_at, t.dateLocale), 50, 120, yPos + 16);
    this.renderInfoRow(doc, t.status,   '', 50, 120, yPos + 32);
    this.renderStatusBadge(doc, status, 120, yPos + 32, t);

    // Right column
    this.renderInfoRow(doc, t.warehouse, order.warehouse?.name || '—', 300, 380, yPos);
  }

  /**
   * Render purchase order info
   */
  renderPurchaseOrderInfo(doc, purchaseOrder, yPos, t) {
    const status = this.translatePurchaseOrderStatus(purchaseOrder.status, t);

    // Left column
    this.renderInfoRow(doc, t.number,           purchaseOrder.purchase_order_number || purchaseOrder.purchase_order_id.substring(0, 8), 50, 140, yPos);
    this.renderInfoRow(doc, t.orderDate,         this.formatDate(purchaseOrder.order_date || purchaseOrder.created_at, t.dateLocale), 50, 140, yPos + 16);
    this.renderInfoRow(doc, t.expectedDelivery,  purchaseOrder.expected_delivery_date ? this.formatDate(purchaseOrder.expected_delivery_date, t.dateLocale) : '—', 50, 140, yPos + 32);

    // Right column
    this.renderInfoRow(doc, t.status, '', 300, 380, yPos);
    this.renderStatusBadge(doc, status, 380, yPos, t);
    this.renderInfoRow(doc, t.destWarehouse, purchaseOrder.warehouse?.name || '—', 300, 400, yPos + 16);
  }

  /**
   * Render contact info card (client or supplier)
   */
  renderContactCard(doc, title, name, contact, phone, email, cuit, yPos, t) {
    const C = this.colors;
    const boxH = 72;

    // Card background + left accent bar
    doc.rect(50, yPos, 495, boxH).fill(C.gray50);
    doc.rect(50, yPos, 3, boxH).fill(C.accent);

    // Title
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor(C.accent)
      .text(title, 62, yPos + 9);

    // Name
    doc
      .fontSize(10.5)
      .font('Helvetica-Bold')
      .fillColor(C.text)
      .text(name || 'N/A', 62, yPos + 22);

    // Contact / address
    if (contact) {
      doc.fontSize(8.5).font('Helvetica').fillColor(C.textMuted).text(contact, 62, yPos + 38);
    }

    // Right column — contact details
    const rightX = 330;
    let rightY = yPos + 14;
    if (phone) {
      doc.fontSize(8.5).font('Helvetica').fillColor(C.textMuted).text(`${t?.tel || 'Tel:'} ${phone}`, rightX, rightY);
      rightY += 13;
    }
    if (email) {
      doc.fontSize(8.5).font('Helvetica').fillColor(C.textMuted).text(email, rightX, rightY);
      rightY += 13;
    }
    if (cuit) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.textMuted).text(`${t?.cuit || 'CUIT:'} ${cuit}`, rightX, rightY);
    }
  }

  /**
   * Render client info box
   */
  renderClientInfo(doc, client, yPos, t) {
    this.renderContactCard(
      doc,
      t.client,
      client?.name,
      client?.address,
      client?.phone,
      client?.email,
      client?.cuit,
      yPos,
      t
    );
  }

  /**
   * Render supplier info box
   */
  renderSupplierInfo(doc, supplier, yPos, t) {
    this.renderContactCard(
      doc,
      t.supplier,
      supplier?.name,
      supplier?.contact_person ? `${t.contact} ${supplier.contact_person}` : null,
      supplier?.phone,
      supplier?.email,
      supplier?.cuit,
      yPos,
      t
    );
  }

  /**
   * Render line items table for sales orders
   */
  renderLineItems(doc, items, startY, t) {
    const C = this.colors;
    const tableTop = startY;
    const colWidths = { product: 200, qty: 60, price: 80, total: 90 };

    // Section label
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.accent).text(t.articles, 50, tableTop - 14);

    // Table header
    doc
      .rect(50, tableTop, 495, 26)
      .fill(C.accent);

    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor(C.white)
      .text(t.product, 60, tableTop + 9)
      .text(t.qty, 270, tableTop + 9, { width: colWidths.qty, align: 'center' })
      .text(t.unitPrice, 340, tableTop + 9, { width: colWidths.price, align: 'right' })
      .text(t.total, 430, tableTop + 9, { width: colWidths.total, align: 'right' });

    // Table rows
    let rowY = tableTop + 30;

    (items || []).forEach((item, index) => {
      const C = this.colors;
      const product = item.product_types || item.products || {};
      const lotNumber = item.product_lots?.lot_number;
      const subLines = (product.sku ? 1 : 0) + (lotNumber ? 1 : 0);
      const rowHeight = 22 + subLines * 11;

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(50, rowY - 2, 495, rowHeight).fill(C.gray50);
      }

      const lineTotal = (item.quantity || 0) * (item.price || 0);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(C.text)
        .text(product.name || 'Producto', 60, rowY + 3, { width: colWidths.product });

      doc
        .font('Helvetica')
        .fillColor(C.textMuted)
        .text(String(item.quantity || 0), 270, rowY + 3, { width: colWidths.qty, align: 'center' })
        .fillColor(C.text)
        .text(this.formatCurrency(item.price || 0), 340, rowY + 3, { width: colWidths.price, align: 'right' })
        .font('Helvetica-Bold')
        .text(this.formatCurrency(lineTotal), 430, rowY + 3, { width: colWidths.total, align: 'right' });

      let subY = rowY + 15;
      if (product.sku) {
        doc.fontSize(7).font('Helvetica').fillColor(C.gray400).text(`${t.sku} ${product.sku}`, 60, subY);
        subY += 11;
      }
      if (lotNumber) {
        doc.fillColor(C.accent).font('Helvetica-Bold').text(`${t.lot} ${lotNumber}`, 60, subY);
      }

      rowY += rowHeight;
    });

    // Table bottom border
    doc
      .moveTo(50, rowY)
      .lineTo(545, rowY)
      .lineWidth(0.5)
      .strokeColor(this.colors.gray200)
      .stroke();

    return rowY;
  }

  /**
   * Render line items table for purchase orders
   */
  renderPurchaseOrderLineItems(doc, items, startY, t) {
    const C = this.colors;
    const tableTop = startY;

    // Section label
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.accent).text(t.products, 50, tableTop - 14);

    // Table header
    doc
      .rect(50, tableTop, 495, 26)
      .fill(C.accent);

    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor(C.white)
      .text(t.product, 60, tableTop + 9)
      .text(t.qty, 230, tableTop + 9, { width: 40, align: 'center' })
      .text(t.received, 275, tableTop + 9, { width: 50, align: 'center' })
      .text(t.unitPrice, 335, tableTop + 9, { width: 70, align: 'right' })
      .text(t.total, 420, tableTop + 9, { width: 70, align: 'right' });

    // Table rows
    let rowY = tableTop + 30;

    (items || []).forEach((item, index) => {
      const C = this.colors;
      const product = item.product_types || item.products || {};
      const lotNumber = item.product_lots?.lot_number;
      const subLines = (product.sku ? 1 : 0) + (lotNumber ? 1 : 0);
      const rowHeight = 22 + subLines * 11;

      if (index % 2 === 0) {
        doc.rect(50, rowY - 2, 495, rowHeight).fill(C.gray50);
      }

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(C.text)
        .text(product.name || 'Producto', 60, rowY + 3, { width: 165 });

      doc
        .font('Helvetica')
        .fillColor(C.textMuted)
        .text(String(item.quantity || 0), 230, rowY + 3, { width: 40, align: 'center' })
        .text(String(item.received_quantity || 0), 275, rowY + 3, { width: 50, align: 'center' })
        .fillColor(C.text)
        .text(this.formatCurrency(item.unit_price || 0), 335, rowY + 3, { width: 70, align: 'right' })
        .font('Helvetica-Bold')
        .text(this.formatCurrency(item.line_total || 0), 420, rowY + 3, { width: 70, align: 'right' });

      let subY = rowY + 15;
      if (product.sku) {
        doc.fontSize(7).font('Helvetica').fillColor(C.gray400).text(`${t.sku} ${product.sku}`, 60, subY);
        subY += 11;
      }
      if (lotNumber) {
        doc.fillColor(C.accent).font('Helvetica-Bold').text(`${t.lot} ${lotNumber}`, 60, subY);
      }

      rowY += rowHeight;
    });

    doc
      .moveTo(50, rowY)
      .lineTo(545, rowY)
      .lineWidth(0.5)
      .strokeColor(this.colors.gray200)
      .stroke();

    return rowY;
  }

  /**
   * Shared totals renderer
   */
  renderTotalsBlock(doc, subtotal, discountAmount, taxAmount, shippingAmount, total, yPos, t) {
    const C = this.colors;
    const boxX = 340;
    const boxW = 205;
    const lineH = 18;
    let rows = 2; // subtotal + tax always
    if (discountAmount > 0) rows++;
    if (shippingAmount > 0) rows++;
    const subtotalBoxH = rows * lineH + 10;
    const totalBoxH = 34;
    const totalBoxH2 = subtotalBoxH + totalBoxH;

    // Outer card
    doc.rect(boxX, yPos, boxW, totalBoxH2).fill(C.gray50);

    // Rows
    let ry = yPos + 10;
    const lx = boxX + 12;
    const rx = boxX + boxW - 12;

    const addRow = (label, value, isMuted = false) => {
      doc.fontSize(9).font('Helvetica').fillColor(isMuted ? C.textMuted : C.text).text(label, lx, ry);
      doc.text(value, lx, ry, { width: boxW - 24, align: 'right' });
      ry += lineH;
    };

    addRow(t.subtotal, this.formatCurrency(subtotal));
    if (discountAmount > 0) {
      doc.fontSize(9).font('Helvetica').fillColor(C.red).text(t.discount, lx, ry);
      doc.text(`-${this.formatCurrency(discountAmount)}`, lx, ry, { width: boxW - 24, align: 'right' });
      ry += lineH;
    }
    addRow(t.tax, this.formatCurrency(taxAmount));
    if (shippingAmount > 0) addRow(t.shipping, this.formatCurrency(shippingAmount));

    // Total row — accent background
    doc.rect(boxX, yPos + subtotalBoxH, boxW, totalBoxH).fill(C.accent);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(C.white)
      .text(t.grandTotal, lx, yPos + subtotalBoxH + 10);
    doc
      .fillColor(C.white)
      .text(this.formatCurrency(total), lx, yPos + subtotalBoxH + 10, { width: boxW - 24, align: 'right' });
  }

  /**
   * Render totals for sales order
   */
  renderTotals(doc, order, yPos, t) {
    this.renderTotalsBlock(
      doc,
      order.subtotal || 0,
      order.discount_amount || 0,
      order.tax_amount || 0,
      0,
      order.total_price || order.total || 0,
      yPos,
      t
    );
  }

  /**
   * Render totals for purchase order
   */
  renderPurchaseOrderTotals(doc, purchaseOrder, yPos, t) {
    this.renderTotalsBlock(
      doc,
      purchaseOrder.subtotal || 0,
      purchaseOrder.discount_amount || 0,
      purchaseOrder.tax_amount || 0,
      purchaseOrder.shipping_amount || 0,
      purchaseOrder.total || 0,
      yPos,
      t
    );
  }

  /**
   * Render footer
   */
  renderFooter(doc, notes, t) {
    const C = this.colors;
    const footerY = 720;

    // Notes section
    if (notes) {
      doc.rect(50, footerY - 55, 495, 44).fill(C.gray100);
      doc.rect(50, footerY - 55, 3, 44).fill(C.gray400);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C.textMuted).text(t.notes, 62, footerY - 48);
      doc.fontSize(8.5).font('Helvetica').fillColor(C.text).text(notes, 62, footerY - 38, { width: 470 });
    }

    // Bottom accent bar
    doc.rect(0, footerY + 2, 595, 4).fill(C.accent);

    // Footer text
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor(C.gray400)
      .text(
        t.generatedOn(this.formatDate(new Date(), t.dateLocale)),
        50, footerY - 12,
        { align: 'center', width: 495 }
      );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  formatCurrency(amount, currency = 'ARS') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  }

  formatDate(date, locale = 'es-AR') {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  translateStatus(status, t) {
    if (t?.statuses) {
      const map = { draft: t.statuses.draft, pending: t.statuses.pending, processing: t.statuses.processing, shipped: t.statuses.shipped, completed: t.statuses.completed, cancelled: t.statuses.cancelled };
      return map[status] || status;
    }
    const translations = { draft: 'Borrador', pending: 'Pendiente', processing: 'Procesando', shipped: 'Enviado', completed: 'Completado', cancelled: 'Cancelado' };
    return translations[status] || status;
  }

  translatePurchaseOrderStatus(status, t) {
    if (t?.statuses) {
      const map = { draft: t.statuses.draft, pending: t.statuses.pending, approved: t.statuses.approved, received: t.statuses.received, partially_received: t.statuses.partially_received, cancelled: t.statuses.cancelledF };
      return map[status] || status;
    }
    const translations = { draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobada', received: 'Recibida', partially_received: 'Parcialmente Recibida', cancelled: 'Cancelada' };
    return translations[status] || status;
  }

  // ============================================================================
  // BATCH PDF GENERATION
  // ============================================================================

  /**
   * Generate a combined PDF for multiple sales orders (one page per order)
   * @param {string[]} orderIds - Array of order IDs
   * @param {string} organizationId - Organization ID for authorization
   * @returns {Promise<Buffer>} PDF as buffer
   */
  async generateBatchSalesOrderPdf(orderIds, organizationId, lang = 'es') {
    this.logger.info('Generating batch sales order PDF:', { orderCount: orderIds.length, orderIds, organizationId });

    // Fetch all orders with related data
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        clients (
          client_id,
          name,
          email,
          phone,
          address,
          cuit
        ),
        warehouse (
          warehouse_id,
          name,
          location
        ),
        order_details (
          order_detail_id,
          quantity,
          price,
          lot_id,
          product_types!order_details_product_type_id_fkey (
            product_type_id,
            name,
            sku,
            unit
          ),
          product_lots!order_details_lot_id_fkey (
            lot_id,
            lot_number
          )
        )
      `)
      .in('order_id', orderIds)
      .eq('organization_id', organizationId);

    this.logger.info('Orders query result:', {
      foundCount: orders?.length || 0,
      error: error?.message || null,
      orderIds,
      organizationId
    });

    if (error) {
      this.logger.error('Orders query error:', { error });
      throw new Error(`Database error: ${error.message}`);
    }

    if (!orders || orders.length === 0) {
      this.logger.error('No orders found:', { orderIds, organizationId });
      throw new Error('Orders not found');
    }

    // Fetch organization info for header
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, email, phone, tax_id, logo_url')
      .eq('organization_id', organizationId)
      .single();

    return this.createBatchSalesOrderPdf(orders, organization, lang);
  }

  /**
   * Create a combined PDF document for multiple sales orders
   */
  async createBatchSalesOrderPdf(orders, organization, lang = 'es') {
    const t = this.getTranslations(lang);
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `${t.salesOrder} (${orders.length})`,
            Author: organization?.name || 'Betali',
            Subject: t.salesOrder
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        orders.forEach((order, index) => {
          if (index > 0) {
            doc.addPage();
          }

          // Header
          this.renderCompanyHeader(doc, organization, t.salesOrder, t);

          // Order info
          this.renderOrderInfo(doc, order, 100, t);

          // Client info
          this.renderClientInfo(doc, order.clients, 160, t);

          // Line items table
          const tableEndY = this.renderLineItems(doc, order.order_details, 260, t);

          // Totals
          this.renderTotals(doc, order, tableEndY + 20, t);

          // Footer
          this.renderFooter(doc, order.notes, t);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate a combined PDF for multiple purchase orders (one page per order)
   * @param {string[]} purchaseOrderIds - Array of purchase order IDs
   * @param {string} organizationId - Organization ID for authorization
   * @returns {Promise<Buffer>} PDF as buffer
   */
  async generateBatchPurchaseOrderPdf(purchaseOrderIds, organizationId, lang = 'es') {
    this.logger.info('Generating batch purchase order PDF:', { orderCount: purchaseOrderIds.length });

    // Fetch all purchase orders with related data
    const { data: purchaseOrders, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (
          supplier_id,
          name,
          email,
          phone,
          contact_person,
          cuit
        ),
        warehouse (
          warehouse_id,
          name,
          location
        ),
        purchase_order_details (
          detail_id,
          quantity,
          received_quantity,
          unit_price,
          line_total,
          notes,
          lot_id,
          product_types!purchase_order_details_product_type_id_fkey (
            product_type_id,
            name,
            sku,
            unit,
            description
          ),
          product_lots!purchase_order_details_lot_id_fkey (
            lot_id,
            lot_number
          )
        )
      `)
      .in('purchase_order_id', purchaseOrderIds)
      .eq('organization_id', organizationId);

    if (error || !purchaseOrders || purchaseOrders.length === 0) {
      this.logger.error('Purchase orders not found:', { purchaseOrderIds, error });
      throw new Error('Purchase orders not found');
    }

    // Fetch organization info for header
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, email, phone, tax_id, logo_url')
      .eq('organization_id', organizationId)
      .single();

    return this.createBatchPurchaseOrderPdf(purchaseOrders, organization, lang);
  }

  /**
   * Create a combined PDF document for multiple purchase orders
   */
  async createBatchPurchaseOrderPdf(purchaseOrders, organization, lang = 'es') {
    const t = this.getTranslations(lang);
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `${t.purchaseOrder} (${purchaseOrders.length})`,
            Author: organization?.name || 'Betali',
            Subject: t.purchaseOrder
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        purchaseOrders.forEach((purchaseOrder, index) => {
          if (index > 0) {
            doc.addPage();
          }

          // Header
          this.renderCompanyHeader(doc, organization, t.purchaseOrder, t);

          // PO info
          this.renderPurchaseOrderInfo(doc, purchaseOrder, 100, t);

          // Supplier info
          this.renderSupplierInfo(doc, purchaseOrder.suppliers, 160, t);

          // Line items table
          const tableEndY = this.renderPurchaseOrderLineItems(doc, purchaseOrder.purchase_order_details, 260, t);

          // Totals
          this.renderPurchaseOrderTotals(doc, purchaseOrder, tableEndY + 20, t);

          // Footer
          this.renderFooter(doc, purchaseOrder.notes, t);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new OrderPdfService();
