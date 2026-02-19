const { Resend } = require('resend');
const { Logger } = require('../utils/Logger');

/**
 * EmailService - Handle all email notifications
 * Uses Resend for email delivery
 */
class EmailService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.logger = new Logger('EmailService');
    this.fromEmail = process.env.EMAIL_FROM || 'Betali <noreply@betali.app>';
  }

  /**
   * Initialize Resend client
   */
  initialize() {
    if (this.initialized) return;

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured. Email notifications will not work.');
      return;
    }

    try {
      this.client = new Resend(apiKey);
      this.initialized = true;
      this.logger.info('Email service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send email
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content (optional)
   */
  async sendEmail({ to, subject, html, text }) {
    this.initialize();

    if (!this.initialized) {
      this.logger.warn('Email not sent - service not initialized:', { to, subject });
      return { success: false, error: 'Email service not initialized' };
    }

    try {
      const result = await this.client.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      });

      this.logger.info('Email sent successfully:', { to, subject, id: result.id });
      return { success: true, id: result.id };
    } catch (error) {
      this.logger.error('Failed to send email:', { to, subject, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccessEmail({ to, userName, planName, amount, currency, nextBillingDate }) {
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency
    }).format(amount);

    const formattedDate = new Date(nextBillingDate).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-icon { font-size: 48px; margin-bottom: 10px; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { color: #6b7280; }
          .detail-value { font-weight: 600; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✓</div>
            <h1>¡Pago Exitoso!</h1>
            <p>Tu suscripción ha sido activada</p>
          </div>
          <div class="content">
            <p>Hola ${userName},</p>
            <p>Tu pago ha sido procesado exitosamente. Aquí están los detalles:</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div class="detail-row">
                <span class="detail-label">Plan:</span>
                <span class="detail-value">${planName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Monto:</span>
                <span class="detail-value">${formattedAmount}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Próximo cobro:</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
            </div>

            <p>Ya tienes acceso a todas las funcionalidades de tu plan. ¡Gracias por confiar en Betali!</p>

            <center>
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Ir al Dashboard</a>
            </center>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Betali. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: '✓ Pago exitoso - Tu suscripción está activa',
      html
    });
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedEmail({ to, userName, planName, amount, currency, reason }) {
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency
    }).format(amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .error-icon { font-size: 48px; margin-bottom: 10px; }
          .help-box { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="error-icon">✗</div>
            <h1>Pago Rechazado</h1>
            <p>No pudimos procesar tu pago</p>
          </div>
          <div class="content">
            <p>Hola ${userName},</p>
            <p>Lamentamos informarte que tu pago de <strong>${formattedAmount}</strong> para el plan <strong>${planName}</strong> no pudo ser procesado.</p>

            ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}

            <div class="help-box">
              <strong>¿Qué puedes hacer?</strong>
              <ul>
                <li>Verifica que los datos de tu tarjeta sean correctos</li>
                <li>Asegúrate de tener fondos suficientes</li>
                <li>Intenta con otro método de pago</li>
                <li>Contacta a tu banco si el problema persiste</li>
              </ul>
            </div>

            <center>
              <a href="${process.env.FRONTEND_URL}/dashboard/pricing" class="button">Intentar Nuevamente</a>
            </center>
          </div>
          <div class="footer">
            <p>¿Necesitas ayuda? Responde a este email o contacta a soporte.</p>
            <p>© ${new Date().getFullYear()} Betali. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: '⚠️ Pago rechazado - Acción requerida',
      html
    });
  }

  /**
   * Send subscription expiring soon notification
   */
  async sendSubscriptionExpiringSoonEmail({ to, userName, planName, expirationDate, daysLeft }) {
    const formattedDate = new Date(expirationDate).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-icon { font-size: 48px; margin-bottom: 10px; }
          .countdown { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .days-left { font-size: 48px; font-weight: bold; color: #F59E0B; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="warning-icon">⏰</div>
            <h1>Tu suscripción está por vencer</h1>
          </div>
          <div class="content">
            <p>Hola ${userName},</p>
            <p>Queremos recordarte que tu suscripción al plan <strong>${planName}</strong> vence pronto.</p>

            <div class="countdown">
              <div class="days-left">${daysLeft}</div>
              <div>días restantes</div>
              <p style="margin-top: 10px; color: #6b7280;">Vence el ${formattedDate}</p>
            </div>

            <p>Para evitar interrupciones en el servicio, te recomendamos renovar tu suscripción antes de la fecha de vencimiento.</p>

            <center>
              <a href="${process.env.FRONTEND_URL}/dashboard/subscription" class="button">Renovar Ahora</a>
            </center>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Betali. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `⏰ Tu suscripción vence en ${daysLeft} días`,
      html
    });
  }

  /**
   * Send subscription cancelled notification
   */
  async sendSubscriptionCancelledEmail({ to, userName, planName, endDate }) {
    const formattedDate = new Date(endDate).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6B7280, #4B5563); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #EFF6FF; border: 1px solid #3B82F6; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Suscripción Cancelada</h1>
          </div>
          <div class="content">
            <p>Hola ${userName},</p>
            <p>Tu suscripción al plan <strong>${planName}</strong> ha sido cancelada.</p>

            <div class="info-box">
              <strong>📅 Acceso hasta:</strong> ${formattedDate}<br>
              <p style="margin: 10px 0 0 0;">Tu suscripción permanecerá activa hasta esta fecha. Después de eso, tu cuenta pasará al plan gratuito.</p>
            </div>

            <p>Lamentamos verte partir. Si cambias de opinión, siempre puedes reactivar tu suscripción.</p>

            <center>
              <a href="${process.env.FRONTEND_URL}/dashboard/pricing" class="button">Reactivar Suscripción</a>
            </center>
          </div>
          <div class="footer">
            <p>¿Tienes feedback? Nos encantaría escucharte. Responde a este email.</p>
            <p>© ${new Date().getFullYear()} Betali. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Confirmación de cancelación de suscripción',
      html
    });
  }

  /**
   * Send trial ending soon notification
   */
  async sendTrialEndingSoonEmail({ to, userName, planName, trialEndDate, daysLeft }) {
    const formattedDate = new Date(trialEndDate).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .countdown { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .days-left { font-size: 48px; font-weight: bold; color: #8B5CF6; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Tu período de prueba termina pronto</h1>
          </div>
          <div class="content">
            <p>Hola ${userName},</p>
            <p>Tu período de prueba del plan <strong>${planName}</strong> está por terminar.</p>

            <div class="countdown">
              <div class="days-left">${daysLeft}</div>
              <div>días restantes de prueba</div>
              <p style="margin-top: 10px; color: #6b7280;">Termina el ${formattedDate}</p>
            </div>

            <div class="features">
              <strong>No pierdas acceso a:</strong>
              <ul>
                <li>Gestión ilimitada de inventario</li>
                <li>Reportes avanzados</li>
                <li>Soporte prioritario</li>
                <li>Y mucho más...</li>
              </ul>
            </div>

            <center>
              <a href="${process.env.FRONTEND_URL}/dashboard/pricing" class="button">Suscribirse Ahora</a>
            </center>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Betali. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `🎁 Tu prueba gratuita termina en ${daysLeft} días`,
      html
    });
  }

  /**
   * Strip HTML tags for plain text version
   */
  stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = new EmailService();
