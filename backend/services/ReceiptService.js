const PDFDocument = require('pdfkit');
const supabase = require('../lib/supabaseClient');
const { Logger } = require('../utils/Logger');
const path = require('path');

/**
 * ReceiptService - Generates PDF receipts for payments
 */
class ReceiptService {
  constructor() {
    this.logger = new Logger('ReceiptService');
  }

  /**
   * Generate a PDF receipt for a payment
   *
   * @param {string} paymentId - The payment ID from manual_payments table
   * @returns {Promise<Buffer>} PDF as a buffer
   */
  async generateReceipt(paymentId) {
    this.logger.info('Generating receipt for payment:', { paymentId });

    // Get payment details with related data
    const { data: payment, error } = await supabase
      .from('manual_payments')
      .select(`
        *,
        subscriptions!inner (
          subscription_id,
          billing_cycle,
          subscription_plans (
            name,
            display_name,
            description
          ),
          organizations!inner (
            organization_id,
            name,
            owner_id
          )
        )
      `)
      .eq('payment_id', paymentId)
      .single();

    if (error || !payment) {
      this.logger.error('Payment not found:', { paymentId, error });
      throw new Error('Payment not found');
    }

    // Get organization owner details for the receipt
    const { data: owner } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', payment.subscriptions.organizations.owner_id)
      .single();

    // Generate PDF
    const pdfBuffer = await this.createPDF({
      payment,
      organization: payment.subscriptions.organizations,
      plan: payment.subscriptions.subscription_plans,
      owner,
      billingCycle: payment.subscriptions.billing_cycle
    });

    this.logger.info('Receipt generated successfully:', { paymentId });

    return pdfBuffer;
  }

  /**
   * Create the PDF document
   */
  async createPDF({ payment, organization, plan, owner, billingCycle }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Recibo - ${payment.payment_id}`,
            Author: 'Betali',
            Subject: 'Recibo de Pago'
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.renderHeader(doc);

        // Receipt info
        this.renderReceiptInfo(doc, payment);

        // Customer info
        this.renderCustomerInfo(doc, organization, owner);

        // Line items
        this.renderLineItems(doc, payment, plan, billingCycle);

        // Totals
        this.renderTotals(doc, payment);

        // Footer
        this.renderFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Render company header
   */
  renderHeader(doc) {
    // Company name
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('BETALI', 50, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Sistema de Gestion de Inventario', 50, 80)
      .text('www.betali.app', 50, 95);

    // Receipt badge
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#16a34a')
      .text('RECIBO', 450, 50, { align: 'right' });

    // Divider
    doc
      .moveTo(50, 130)
      .lineTo(545, 130)
      .strokeColor('#e5e5e5')
      .stroke();
  }

  /**
   * Render receipt details
   */
  renderReceiptInfo(doc, payment) {
    const yPos = 150;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Numero de Recibo:', 50, yPos)
      .font('Helvetica')
      .text(payment.payment_id.substring(0, 8).toUpperCase(), 160, yPos);

    doc
      .font('Helvetica-Bold')
      .text('Fecha de Pago:', 50, yPos + 20)
      .font('Helvetica')
      .text(this.formatDate(payment.payment_date), 160, yPos + 20);

    doc
      .font('Helvetica-Bold')
      .text('Estado:', 50, yPos + 40)
      .font('Helvetica')
      .fillColor(payment.status === 'confirmed' ? '#16a34a' : '#f59e0b')
      .text(this.translateStatus(payment.status), 160, yPos + 40);

    // MercadoPago reference if available
    if (payment.mercadopago_payment_id) {
      doc
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('Ref. MercadoPago:', 300, yPos)
        .font('Helvetica')
        .text(payment.mercadopago_payment_id, 410, yPos);
    }

    doc
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Metodo de Pago:', 300, yPos + 20)
      .font('Helvetica')
      .text(this.translatePaymentMethod(payment.payment_method), 410, yPos + 20);
  }

  /**
   * Render customer information
   */
  renderCustomerInfo(doc, organization, owner) {
    const yPos = 240;

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('Facturado a:', 50, yPos);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text(organization.name, 50, yPos + 20)
      .text(owner?.name || 'N/A', 50, yPos + 35)
      .text(owner?.email || 'N/A', 50, yPos + 50);
  }

  /**
   * Render line items table
   */
  renderLineItems(doc, payment, plan, billingCycle) {
    const tableTop = 340;

    // Table header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#ffffff');

    // Header background
    doc
      .rect(50, tableTop, 495, 25)
      .fill('#1a1a2e');

    doc
      .fillColor('#ffffff')
      .text('Descripcion', 60, tableTop + 8)
      .text('Periodo', 300, tableTop + 8)
      .text('Monto', 450, tableTop + 8, { align: 'right', width: 85 });

    // Table row
    const rowY = tableTop + 35;

    doc
      .rect(50, rowY - 5, 495, 30)
      .fill('#f9fafb');

    const planName = plan?.display_name || plan?.name || 'Suscripcion';
    const periodText = billingCycle === 'yearly' ? 'Anual' : 'Mensual';

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Plan ${planName}`, 60, rowY + 3)
      .text(periodText, 300, rowY + 3)
      .text(this.formatCurrency(payment.amount, payment.currency), 450, rowY + 3, { align: 'right', width: 85 });

    // If there's a description/notes
    if (payment.notes) {
      doc
        .fontSize(9)
        .fillColor('#666666')
        .text(payment.notes, 60, rowY + 40, { width: 400 });
    }
  }

  /**
   * Render totals section
   */
  renderTotals(doc, payment) {
    const yPos = 450;

    // Subtotal
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#333333')
      .text('Subtotal:', 380, yPos)
      .text(this.formatCurrency(payment.amount, payment.currency), 450, yPos, { align: 'right', width: 85 });

    // IVA (if applicable - Argentina typically 21%)
    // Note: This is informational, actual tax handling depends on business requirements
    // doc
    //   .text('IVA (21%):', 380, yPos + 20)
    //   .text(this.formatCurrency(payment.amount * 0.21, payment.currency), 450, yPos + 20, { align: 'right', width: 85 });

    // Divider
    doc
      .moveTo(380, yPos + 25)
      .lineTo(545, yPos + 25)
      .strokeColor('#e5e5e5')
      .stroke();

    // Total
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('TOTAL:', 380, yPos + 35)
      .text(this.formatCurrency(payment.amount, payment.currency), 450, yPos + 35, { align: 'right', width: 85 });

    // Payment status badge
    if (payment.status === 'confirmed') {
      doc
        .rect(380, yPos + 60, 165, 25)
        .fill('#dcfce7');

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#16a34a')
        .text('PAGADO', 380, yPos + 67, { align: 'center', width: 165 });
    }
  }

  /**
   * Render footer
   */
  renderFooter(doc) {
    const yPos = 700;

    // Divider
    doc
      .moveTo(50, yPos)
      .lineTo(545, yPos)
      .strokeColor('#e5e5e5')
      .stroke();

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Gracias por tu pago.', 50, yPos + 15, { align: 'center', width: 495 })
      .text('Este recibo fue generado automaticamente y es valido sin firma.', 50, yPos + 30, { align: 'center', width: 495 })
      .text('Para consultas: soporte@betali.app', 50, yPos + 45, { align: 'center', width: 495 });

    // Generated timestamp
    doc
      .fontSize(8)
      .text(`Generado el ${this.formatDate(new Date())} | Betali v1.0`, 50, yPos + 70, { align: 'center', width: 495 });
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount, currency = 'ARS') {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    });
    return formatter.format(amount);
  }

  /**
   * Format date
   */
  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Translate payment status
   */
  translateStatus(status) {
    const translations = {
      'confirmed': 'Confirmado',
      'pending': 'Pendiente',
      'failed': 'Fallido',
      'refunded': 'Reembolsado'
    };
    return translations[status] || status;
  }

  /**
   * Translate payment method
   */
  translatePaymentMethod(method) {
    const translations = {
      'credit_card': 'Tarjeta de Credito',
      'debit_card': 'Tarjeta de Debito',
      'bank_transfer': 'Transferencia Bancaria',
      'mercadopago': 'MercadoPago',
      'cash': 'Efectivo'
    };
    return translations[method] || method || 'MercadoPago';
  }

  /**
   * Store receipt in Supabase storage (optional)
   */
  async storeReceipt(paymentId, pdfBuffer) {
    try {
      const fileName = `receipts/${paymentId}.pdf`;

      const { data, error } = await supabase
        .storage
        .from('documents')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        this.logger.error('Error storing receipt:', error);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('documents')
        .getPublicUrl(fileName);

      // Update payment record with receipt URL
      await supabase
        .from('manual_payments')
        .update({ receipt_url: publicUrl })
        .eq('payment_id', paymentId);

      return publicUrl;
    } catch (error) {
      this.logger.error('Error storing receipt:', error);
      return null;
    }
  }
}

module.exports = new ReceiptService();
