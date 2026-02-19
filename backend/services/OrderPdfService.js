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
  async generateSalesOrderPdf(orderId, organizationId) {
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
          products (
            product_id,
            name,
            batch_number,
            description
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

    return this.createSalesOrderPdf(order, organization);
  }

  /**
   * Create the sales order PDF document
   */
  async createSalesOrderPdf(order, organization) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Orden de Venta - ${order.order_number}`,
            Author: organization?.name || 'Betali',
            Subject: 'Orden de Venta'
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.renderCompanyHeader(doc, organization, 'ORDEN DE VENTA');

        // Order info
        this.renderOrderInfo(doc, order, 150);

        // Client info
        this.renderClientInfo(doc, order.clients, 220);

        // Line items table
        const tableEndY = this.renderLineItems(doc, order.order_details, 310);

        // Totals
        this.renderTotals(doc, order, tableEndY + 20);

        // Footer
        this.renderFooter(doc, order.notes);

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
  async generatePurchaseOrderPdf(purchaseOrderId, organizationId) {
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
          products (
            product_id,
            name,
            batch_number,
            description
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

    return this.createPurchaseOrderPdf(purchaseOrder, organization);
  }

  /**
   * Create the purchase order PDF document
   */
  async createPurchaseOrderPdf(purchaseOrder, organization) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Orden de Compra - ${purchaseOrder.purchase_order_number}`,
            Author: organization?.name || 'Betali',
            Subject: 'Orden de Compra'
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.renderCompanyHeader(doc, organization, 'ORDEN DE COMPRA');

        // PO info
        this.renderPurchaseOrderInfo(doc, purchaseOrder, 150);

        // Supplier info
        this.renderSupplierInfo(doc, purchaseOrder.suppliers, 220);

        // Line items table
        const tableEndY = this.renderPurchaseOrderLineItems(doc, purchaseOrder.purchase_order_details, 310);

        // Totals
        this.renderPurchaseOrderTotals(doc, purchaseOrder, tableEndY + 20);

        // Footer
        this.renderFooter(doc, purchaseOrder.notes);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // SHARED RENDERING METHODS
  // ============================================================================

  /**
   * Render company header
   */
  renderCompanyHeader(doc, organization, documentType) {
    // Company name
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(organization?.name || 'BETALI', 50, 50);

    // Company details
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666');

    let yPos = 75;
    if (organization?.email) {
      doc.text(organization.email, 50, yPos);
      yPos += 12;
    }
    if (organization?.phone) {
      doc.text(organization.phone, 50, yPos);
      yPos += 12;
    }
    if (organization?.tax_id) {
      doc.text(`CUIT: ${organization.tax_id}`, 50, yPos);
    }

    // Document type badge
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(documentType, 400, 50, { align: 'right', width: 145 });

    // Divider
    doc
      .moveTo(50, 130)
      .lineTo(545, 130)
      .strokeColor('#e5e5e5')
      .stroke();
  }

  /**
   * Render sales order info
   */
  renderOrderInfo(doc, order, yPos) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333');

    // Left column
    doc.text('Numero:', 50, yPos);
    doc.font('Helvetica').text(order.order_number || order.order_id.substring(0, 8), 120, yPos);

    doc.font('Helvetica-Bold').text('Fecha:', 50, yPos + 18);
    doc.font('Helvetica').text(this.formatDate(order.order_date || order.created_at), 120, yPos + 18);

    doc.font('Helvetica-Bold').text('Estado:', 50, yPos + 36);
    doc.font('Helvetica').text(this.translateStatus(order.status), 120, yPos + 36);

    // Right column
    doc.font('Helvetica-Bold').text('Almacen:', 300, yPos);
    doc.font('Helvetica').text(order.warehouse?.name || 'N/A', 370, yPos);
  }

  /**
   * Render purchase order info
   */
  renderPurchaseOrderInfo(doc, purchaseOrder, yPos) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333');

    // Left column
    doc.text('Numero:', 50, yPos);
    doc.font('Helvetica').text(purchaseOrder.purchase_order_number || purchaseOrder.purchase_order_id.substring(0, 8), 140, yPos);

    doc.font('Helvetica-Bold').text('Fecha Orden:', 50, yPos + 18);
    doc.font('Helvetica').text(this.formatDate(purchaseOrder.order_date || purchaseOrder.created_at), 140, yPos + 18);

    doc.font('Helvetica-Bold').text('Entrega Esperada:', 50, yPos + 36);
    doc.font('Helvetica').text(purchaseOrder.expected_delivery_date ? this.formatDate(purchaseOrder.expected_delivery_date) : 'N/A', 140, yPos + 36);

    // Right column
    doc.font('Helvetica-Bold').text('Estado:', 300, yPos);
    doc.font('Helvetica').text(this.translatePurchaseOrderStatus(purchaseOrder.status), 380, yPos);

    doc.font('Helvetica-Bold').text('Almacen Destino:', 300, yPos + 18);
    doc.font('Helvetica').text(purchaseOrder.warehouse?.name || 'N/A', 380, yPos + 18);

    // Note: created_by user info not included in PDF to simplify query
  }

  /**
   * Render client info box
   */
  renderClientInfo(doc, client, yPos) {
    // Box background
    doc
      .rect(50, yPos, 495, 70)
      .fill('#f9fafb');

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('CLIENTE', 60, yPos + 10);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333');

    let textY = yPos + 28;
    doc.text(client?.name || 'N/A', 60, textY);

    if (client?.address) {
      textY += 14;
      doc.text(client.address, 60, textY);
    }

    // Right side
    if (client?.phone) {
      doc.text(`Tel: ${client.phone}`, 350, yPos + 28);
    }
    if (client?.email) {
      doc.text(client.email, 350, yPos + 42);
    }
    if (client?.cuit) {
      doc.text(`CUIT: ${client.cuit}`, 350, yPos + 56);
    }
  }

  /**
   * Render supplier info box
   */
  renderSupplierInfo(doc, supplier, yPos) {
    // Box background
    doc
      .rect(50, yPos, 495, 70)
      .fill('#f9fafb');

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('PROVEEDOR', 60, yPos + 10);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333');

    let textY = yPos + 28;
    doc.text(supplier?.name || 'N/A', 60, textY);

    if (supplier?.contact_person) {
      textY += 14;
      doc.text(`Contacto: ${supplier.contact_person}`, 60, textY);
    }

    // Right side
    if (supplier?.phone) {
      doc.text(`Tel: ${supplier.phone}`, 350, yPos + 28);
    }
    if (supplier?.email) {
      doc.text(supplier.email, 350, yPos + 42);
    }
    if (supplier?.cuit) {
      doc.text(`CUIT: ${supplier.cuit}`, 350, yPos + 56);
    }
  }

  /**
   * Render line items table for sales orders
   */
  renderLineItems(doc, items, startY) {
    const tableTop = startY;
    const colWidths = { product: 200, qty: 60, price: 80, total: 90 };

    // Table header
    doc
      .rect(50, tableTop, 495, 25)
      .fill('#1a1a2e');

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('Producto', 60, tableTop + 8)
      .text('Cant.', 270, tableTop + 8, { width: colWidths.qty, align: 'center' })
      .text('Precio Unit.', 340, tableTop + 8, { width: colWidths.price, align: 'right' })
      .text('Total', 430, tableTop + 8, { width: colWidths.total, align: 'right' });

    // Table rows
    let rowY = tableTop + 30;
    const rowHeight = 25;

    (items || []).forEach((item, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(50, rowY - 3, 495, rowHeight).fill('#f9fafb');
      }

      const product = item.products || {};
      const lineTotal = (item.quantity || 0) * (item.price || 0);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#333333')
        .text(product.name || 'Producto', 60, rowY + 3, { width: colWidths.product })
        .text(String(item.quantity || 0), 270, rowY + 3, { width: colWidths.qty, align: 'center' })
        .text(this.formatCurrency(item.price || 0), 340, rowY + 3, { width: colWidths.price, align: 'right' })
        .text(this.formatCurrency(lineTotal), 430, rowY + 3, { width: colWidths.total, align: 'right' });

      // SKU in smaller text
      if (product.batch_number) {
        doc
          .fontSize(7)
          .fillColor('#666666')
          .text(`Lote: ${product.batch_number}`, 60, rowY + 14);
      }

      rowY += rowHeight;
    });

    // Table bottom border
    doc
      .moveTo(50, rowY)
      .lineTo(545, rowY)
      .strokeColor('#e5e5e5')
      .stroke();

    return rowY;
  }

  /**
   * Render line items table for purchase orders
   */
  renderPurchaseOrderLineItems(doc, items, startY) {
    const tableTop = startY;

    // Table header
    doc
      .rect(50, tableTop, 495, 25)
      .fill('#1a1a2e');

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('Producto', 60, tableTop + 8)
      .text('Cant.', 230, tableTop + 8, { width: 40, align: 'center' })
      .text('Recibido', 275, tableTop + 8, { width: 50, align: 'center' })
      .text('Precio Unit.', 335, tableTop + 8, { width: 70, align: 'right' })
      .text('Total', 420, tableTop + 8, { width: 70, align: 'right' });

    // Table rows
    let rowY = tableTop + 30;
    const rowHeight = 25;

    (items || []).forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(50, rowY - 3, 495, rowHeight).fill('#f9fafb');
      }

      const product = item.products || {};

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#333333')
        .text(product.name || 'Producto', 60, rowY + 3, { width: 165 })
        .text(String(item.quantity || 0), 230, rowY + 3, { width: 40, align: 'center' })
        .text(String(item.received_quantity || 0), 275, rowY + 3, { width: 50, align: 'center' })
        .text(this.formatCurrency(item.unit_price || 0), 335, rowY + 3, { width: 70, align: 'right' })
        .text(this.formatCurrency(item.line_total || 0), 420, rowY + 3, { width: 70, align: 'right' });

      if (product.batch_number) {
        doc
          .fontSize(7)
          .fillColor('#666666')
          .text(`Lote: ${product.batch_number}`, 60, rowY + 14);
      }

      rowY += rowHeight;
    });

    doc
      .moveTo(50, rowY)
      .lineTo(545, rowY)
      .strokeColor('#e5e5e5')
      .stroke();

    return rowY;
  }

  /**
   * Render totals for sales order
   */
  renderTotals(doc, order, yPos) {
    const totalsX = 350;
    const valuesX = 450;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333');

    // Subtotal
    doc.text('Subtotal:', totalsX, yPos);
    doc.text(this.formatCurrency(order.subtotal || 0), valuesX, yPos, { align: 'right', width: 85 });

    // Discount (if any)
    if (order.discount_amount && order.discount_amount > 0) {
      doc.text('Descuento:', totalsX, yPos + 18);
      doc.fillColor('#dc2626').text(`-${this.formatCurrency(order.discount_amount)}`, valuesX, yPos + 18, { align: 'right', width: 85 });
      doc.fillColor('#333333');
    }

    // Tax
    const taxY = order.discount_amount > 0 ? yPos + 36 : yPos + 18;
    doc.text('IVA:', totalsX, taxY);
    doc.text(this.formatCurrency(order.tax_amount || 0), valuesX, taxY, { align: 'right', width: 85 });

    // Total
    const totalY = taxY + 25;
    doc
      .moveTo(totalsX, totalY - 5)
      .lineTo(545, totalY - 5)
      .strokeColor('#e5e5e5')
      .stroke();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('TOTAL:', totalsX, totalY + 5)
      .text(this.formatCurrency(order.total_price || 0), valuesX, totalY + 5, { align: 'right', width: 85 });
  }

  /**
   * Render totals for purchase order
   */
  renderPurchaseOrderTotals(doc, purchaseOrder, yPos) {
    const totalsX = 350;
    const valuesX = 450;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333');

    let currentY = yPos;

    // Subtotal
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(this.formatCurrency(purchaseOrder.subtotal || 0), valuesX, currentY, { align: 'right', width: 85 });
    currentY += 18;

    // Discount
    if (purchaseOrder.discount_amount && purchaseOrder.discount_amount > 0) {
      doc.text('Descuento:', totalsX, currentY);
      doc.fillColor('#dc2626').text(`-${this.formatCurrency(purchaseOrder.discount_amount)}`, valuesX, currentY, { align: 'right', width: 85 });
      doc.fillColor('#333333');
      currentY += 18;
    }

    // Tax
    doc.text('IVA:', totalsX, currentY);
    doc.text(this.formatCurrency(purchaseOrder.tax_amount || 0), valuesX, currentY, { align: 'right', width: 85 });
    currentY += 18;

    // Shipping
    if (purchaseOrder.shipping_amount && purchaseOrder.shipping_amount > 0) {
      doc.text('Envio:', totalsX, currentY);
      doc.text(this.formatCurrency(purchaseOrder.shipping_amount), valuesX, currentY, { align: 'right', width: 85 });
      currentY += 18;
    }

    // Total
    currentY += 5;
    doc
      .moveTo(totalsX, currentY)
      .lineTo(545, currentY)
      .strokeColor('#e5e5e5')
      .stroke();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('TOTAL:', totalsX, currentY + 10)
      .text(this.formatCurrency(purchaseOrder.total || 0), valuesX, currentY + 10, { align: 'right', width: 85 });
  }

  /**
   * Render footer
   */
  renderFooter(doc, notes) {
    const footerY = 720;

    // Notes section
    if (notes) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('Notas:', 50, footerY - 60);

      doc
        .font('Helvetica')
        .fillColor('#666666')
        .text(notes, 50, footerY - 45, { width: 495 });
    }

    // Divider
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor('#e5e5e5')
      .stroke();

    // Footer text
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Este documento fue generado automaticamente.', 50, footerY + 10, { align: 'center', width: 495 })
      .text(`Generado el ${this.formatDate(new Date())} | Betali`, 50, footerY + 22, { align: 'center', width: 495 });
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

  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  translateStatus(status) {
    const translations = {
      'draft': 'Borrador',
      'pending': 'Pendiente',
      'processing': 'Procesando',
      'shipped': 'Enviado',
      'completed': 'Completado',
      'cancelled': 'Cancelado'
    };
    return translations[status] || status;
  }

  translatePurchaseOrderStatus(status) {
    const translations = {
      'draft': 'Borrador',
      'pending': 'Pendiente',
      'approved': 'Aprobada',
      'received': 'Recibida',
      'partially_received': 'Parcialmente Recibida',
      'cancelled': 'Cancelada'
    };
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
  async generateBatchSalesOrderPdf(orderIds, organizationId) {
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
          products (
            product_id,
            name,
            batch_number,
            description
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

    return this.createBatchSalesOrderPdf(orders, organization);
  }

  /**
   * Create a combined PDF document for multiple sales orders
   */
  async createBatchSalesOrderPdf(orders, organization) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Ordenes de Venta (${orders.length})`,
            Author: organization?.name || 'Betali',
            Subject: 'Ordenes de Venta'
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
          this.renderCompanyHeader(doc, organization, 'ORDEN DE VENTA');

          // Order info
          this.renderOrderInfo(doc, order, 150);

          // Client info
          this.renderClientInfo(doc, order.clients, 220);

          // Line items table
          const tableEndY = this.renderLineItems(doc, order.order_details, 310);

          // Totals
          this.renderTotals(doc, order, tableEndY + 20);

          // Footer
          this.renderFooter(doc, order.notes);
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
  async generateBatchPurchaseOrderPdf(purchaseOrderIds, organizationId) {
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
          products (
            product_id,
            name,
            batch_number,
            description
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

    return this.createBatchPurchaseOrderPdf(purchaseOrders, organization);
  }

  /**
   * Create a combined PDF document for multiple purchase orders
   */
  async createBatchPurchaseOrderPdf(purchaseOrders, organization) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Ordenes de Compra (${purchaseOrders.length})`,
            Author: organization?.name || 'Betali',
            Subject: 'Ordenes de Compra'
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
          this.renderCompanyHeader(doc, organization, 'ORDEN DE COMPRA');

          // PO info
          this.renderPurchaseOrderInfo(doc, purchaseOrder, 150);

          // Supplier info
          this.renderSupplierInfo(doc, purchaseOrder.suppliers, 220);

          // Line items table
          const tableEndY = this.renderPurchaseOrderLineItems(doc, purchaseOrder.purchase_order_details, 310);

          // Totals
          this.renderPurchaseOrderTotals(doc, purchaseOrder, tableEndY + 20);

          // Footer
          this.renderFooter(doc, purchaseOrder.notes);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new OrderPdfService();
