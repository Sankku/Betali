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
   * Shared base HTML layout for all emails
   * @param {Object} options
   * @param {string} options.previewText - Text shown in inbox preview
   * @param {string} options.headerColor - Gradient colors for header (CSS)
   * @param {string} options.headerIcon - Emoji or text icon in header
   * @param {string} options.headerTitle - Main title in header
   * @param {string} options.headerSubtitle - Subtitle in header (optional)
   * @param {string} options.bodyContent - Inner HTML content of the email body
   * @param {string} options.footerExtra - Extra footer text (optional)
   */
  baseLayout({ previewText = '', headerColor = 'linear-gradient(135deg, #10B981, #059669)', headerIcon = '', headerTitle, headerSubtitle = '', bodyContent, footerExtra = '' }) {
    const year = new Date().getFullYear();
    const frontendUrl = process.env.FRONTEND_URL || 'https://betali.app';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${headerTitle}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      background-color: #f3f4f6;
      padding: 40px 16px;
    }
    .email-container {
      max-width: 580px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }

    /* Header */
    .email-header {
      background: ${headerColor};
      padding: 40px 32px 36px;
      text-align: center;
      color: #ffffff;
    }
    .email-header .logo {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 20px;
      opacity: 0.95;
    }
    .email-header .logo span {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 6px;
    }
    .email-header .icon {
      font-size: 44px;
      margin-bottom: 12px;
      display: block;
    }
    .email-header h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: -0.3px;
    }
    .email-header p {
      font-size: 15px;
      opacity: 0.88;
    }

    /* Body */
    .email-body {
      padding: 36px 32px;
    }
    .email-body p {
      font-size: 15px;
      color: #374151;
      margin-bottom: 16px;
    }
    .email-body strong {
      color: #111827;
    }

    /* Card box */
    .detail-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 20px 24px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }
    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-label {
      color: #6b7280;
    }
    .detail-value {
      font-weight: 600;
      color: #111827;
    }

    /* Alert boxes */
    .alert-box {
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
      font-size: 14px;
    }
    .alert-warning {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      color: #92400e;
    }
    .alert-info {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      color: #1e40af;
    }
    .alert-success {
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
    }
    .alert-box ul {
      margin: 8px 0 0 16px;
    }
    .alert-box li {
      margin-bottom: 4px;
    }

    /* Countdown */
    .countdown-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .countdown-number {
      font-size: 56px;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 4px;
    }
    .countdown-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .countdown-date {
      font-size: 13px;
      color: #9ca3af;
    }

    /* CTA Button */
    .cta-wrapper {
      text-align: center;
      margin: 28px 0 8px;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      letter-spacing: 0.1px;
    }
    .cta-primary {
      background: #10B981;
      color: #ffffff !important;
    }
    .cta-secondary {
      background: #3B82F6;
      color: #ffffff !important;
    }
    .cta-neutral {
      background: #1f2937;
      color: #ffffff !important;
    }

    /* Footer */
    .email-footer {
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 24px 32px;
      text-align: center;
    }
    .email-footer p {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .email-footer a {
      color: #6b7280;
      text-decoration: underline;
    }
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ''}
  <div class="email-wrapper">
    <div class="email-container">

      <!-- Header -->
      <div class="email-header">
        <div class="logo"><span>Betali</span></div>
        ${headerIcon ? `<span class="icon">${headerIcon}</span>` : ''}
        <h1>${headerTitle}</h1>
        ${headerSubtitle ? `<p>${headerSubtitle}</p>` : ''}
      </div>

      <!-- Body -->
      <div class="email-body">
        ${bodyContent}
      </div>

      <!-- Footer -->
      <div class="email-footer">
        ${footerExtra ? `<p>${footerExtra}</p>` : ''}
        <p>© ${year} Betali · Todos los derechos reservados</p>
        <p><a href="${frontendUrl}/dashboard">Ir al Dashboard</a> · <a href="mailto:soporte@betali.app">Soporte</a></p>
      </div>

    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Send email via Resend
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

  // ─────────────────────────────────────────────
  // AUTH EMAILS (delegated from Supabase via SMTP)
  // ─────────────────────────────────────────────

  /**
   * Welcome email sent after signup confirmation
   */
  async sendWelcomeEmail({ to, userName }) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://betali.app';

    const bodyContent = `
      <p>Hola <strong>${userName || 'ahí'}</strong>,</p>
      <p>¡Bienvenido a Betali! Tu cuenta ha sido creada exitosamente. Estamos muy contentos de tenerte.</p>
      <p>Con Betali podés gestionar tu inventario, ventas, clientes y mucho más, todo en un solo lugar.</p>

      <div class="alert-box alert-success">
        <strong>✅ Tu cuenta está lista</strong>
        <ul>
          <li>Crea tu organización o únete a una existente</li>
          <li>Configura tu primer almacén</li>
          <li>Empezá a agregar productos</li>
        </ul>
      </div>

      <div class="cta-wrapper">
        <a href="${frontendUrl}/dashboard" class="cta-button cta-primary">Empezar ahora</a>
      </div>

      <div class="divider"></div>
      <p style="font-size:13px; color:#6b7280;">Si no creaste esta cuenta, podés ignorar este email con seguridad.</p>
    `;

    const html = this.baseLayout({
      previewText: '¡Bienvenido a Betali! Tu cuenta está lista.',
      headerColor: 'linear-gradient(135deg, #10B981, #059669)',
      headerIcon: '🎉',
      headerTitle: '¡Bienvenido a Betali!',
      headerSubtitle: 'Tu cuenta ha sido creada exitosamente',
      bodyContent,
    });

    return this.sendEmail({
      to,
      subject: '🎉 ¡Bienvenido a Betali! Tu cuenta está lista',
      html,
    });
  }

  // ─────────────────────────────────────────────
  // BILLING & SUBSCRIPTION EMAILS
  // ─────────────────────────────────────────────

  /**
   * Payment success notification
   */
  async sendPaymentSuccessEmail({ to, userName, planName, amount, currency, nextBillingDate }) {
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
    }).format(amount);

    const formattedDate = new Date(nextBillingDate).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://betali.app';

    const bodyContent = `
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Tu pago fue procesado exitosamente. Tu suscripción está activa y podés seguir usando todas las funcionalidades de Betali.</p>

      <div class="detail-card">
        <div class="detail-row">
          <span class="detail-label">Plan</span>
          <span class="detail-value">${planName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Monto cobrado</span>
          <span class="detail-value">${formattedAmount}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Próximo cobro</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${frontendUrl}/dashboard" class="cta-button cta-primary">Ir al Dashboard</a>
      </div>
    `;

    const html = this.baseLayout({
      previewText: `Pago de ${formattedAmount} procesado exitosamente.`,
      headerColor: 'linear-gradient(135deg, #10B981, #059669)',
      headerIcon: '✅',
      headerTitle: '¡Pago exitoso!',
      headerSubtitle: 'Tu suscripción está activa',
      bodyContent,
      footerExtra: '¿Tenés preguntas sobre tu facturación? Respondé este email.',
    });

    return this.sendEmail({
      to,
      subject: `✅ Pago exitoso · Plan ${planName}`,
      html,
    });
  }

  /**
   * Payment failed notification
   */
  async sendPaymentFailedEmail({ to, userName, planName, amount, currency, reason }) {
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
    }).format(amount);

    const frontendUrl = process.env.FRONTEND_URL || 'https://betali.app';

    const bodyContent = `
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Lamentamos informarte que tu pago de <strong>${formattedAmount}</strong> para el plan <strong>${planName}</strong> no pudo ser procesado.</p>

      ${reason ? `
      <div class="detail-card">
        <div class="detail-row">
          <span class="detail-label">Motivo</span>
          <span class="detail-value">${reason}</span>
        </div>
      </div>` : ''}

      <div class="alert-box alert-warning">
        <strong>¿Qué podés hacer?</strong>
        <ul>
          <li>Verificá que los datos de tu tarjeta sean correctos</li>
          <li>Asegurate de tener fondos suficientes</li>
          <li>Intentá con otro método de pago</li>
          <li>Contactá a tu banco si el problema persiste</li>
        </ul>
      </div>

      <div class="cta-wrapper">
        <a href="${frontendUrl}/dashboard/pricing" class="cta-button cta-secondary">Intentar nuevamente</a>
      </div>
    `;

    const html = this.baseLayout({
      previewText: 'Tu pago no pudo ser procesado. Acción requerida.',
      headerColor: 'linear-gradient(135deg, #EF4444, #DC2626)',
      headerIcon: '❌',
      headerTitle: 'Pago rechazado',
      headerSubtitle: 'No pudimos procesar tu pago',
      bodyContent,
      footerExtra: '¿Necesitás ayuda? Respondé este email y te asistimos.',
    });

    return this.sendEmail({
      to,
      subject: '⚠️ Pago rechazado · Acción requerida',
      html,
    });
  }

  /**
   * Subscription expiring soon notification
   */
  async sendSubscriptionExpiringSoonEmail({ to, userName, planName, expirationDate, daysLeft }) {
    const formattedDate = new Date(expirationDate).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://betali.app';

    const bodyContent = `
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Tu suscripción al plan <strong>${planName}</strong> está próxima a vencer. Para evitar interrupciones en el servicio, te recomendamos renovarla antes de la fecha de vencimiento.</p>

      <div class="countdown-box">
        <div class="countdown-number" style="color: #F59E0B;">${daysLeft}</div>
        <div class="countdown-label">días restantes</div>
        <div class="countdown-date">Vence el ${formattedDate}</div>
      </div>

      <div class="cta-wrapper">
        <a href="${frontendUrl}/dashboard/subscription" class="cta-button cta-primary">Renovar ahora</a>
      </div>
    `;

    const html = this.baseLayout({
      previewText: `Tu suscripción vence en ${daysLeft} días.`,
      headerColor: 'linear-gradient(135deg, #F59E0B, #D97706)',
      headerIcon: '⏰',
      headerTitle: 'Tu suscripción vence pronto',
      headerSubtitle: `Quedan ${daysLeft} días`,
      bodyContent,
    });

    return this.sendEmail({
      to,
      subject: `⏰ Tu suscripción vence en ${daysLeft} días`,
      html,
    });
  }

  /**
   * Trial ending soon notification
   */
  async sendTrialEndingSoonEmail({ to, userName, planName, trialEndDate, daysLeft }) {
    const formattedDate = new Date(trialEndDate).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://betali.app';

    const bodyContent = `
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Tu período de prueba del plan <strong>${planName}</strong> está por terminar. ¡Suscribite para no perder el acceso!</p>

      <div class="countdown-box">
        <div class="countdown-number" style="color: #8B5CF6;">${daysLeft}</div>
        <div class="countdown-label">días de prueba restantes</div>
        <div class="countdown-date">Termina el ${formattedDate}</div>
      </div>

      <div class="alert-box alert-info">
        <strong>No pierdas acceso a:</strong>
        <ul>
          <li>Gestión ilimitada de inventario</li>
          <li>Reportes y estadísticas avanzadas</li>
          <li>Gestión de clientes y órdenes</li>
          <li>Soporte prioritario</li>
        </ul>
      </div>

      <div class="cta-wrapper">
        <a href="${frontendUrl}/dashboard/pricing" class="cta-button cta-primary">Suscribirme ahora</a>
      </div>
    `;

    const html = this.baseLayout({
      previewText: `Tu prueba gratuita termina en ${daysLeft} días.`,
      headerColor: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
      headerIcon: '🎁',
      headerTitle: 'Tu prueba termina pronto',
      headerSubtitle: `Quedan ${daysLeft} días de tu período gratuito`,
      bodyContent,
    });

    return this.sendEmail({
      to,
      subject: `🎁 Tu prueba gratuita termina en ${daysLeft} días`,
      html,
    });
  }

  /**
   * Subscription cancelled notification
   */
  async sendSubscriptionCancelledEmail({ to, userName, planName, endDate }) {
    const formattedDate = new Date(endDate).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://betali.app';

    const bodyContent = `
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Tu suscripción al plan <strong>${planName}</strong> ha sido cancelada. Lamentamos verte partir.</p>

      <div class="alert-box alert-info">
        <strong>📅 Seguís teniendo acceso hasta:</strong> ${formattedDate}<br>
        <span style="font-size:13px; margin-top:6px; display:block;">Después de esa fecha tu cuenta pasará al plan gratuito automáticamente.</span>
      </div>

      <p>Si cambiás de opinión, podés reactivar tu suscripción en cualquier momento desde tu panel.</p>

      <div class="cta-wrapper">
        <a href="${frontendUrl}/dashboard/pricing" class="cta-button cta-neutral">Reactivar suscripción</a>
      </div>
    `;

    const html = this.baseLayout({
      previewText: `Tu suscripción al plan ${planName} fue cancelada.`,
      headerColor: 'linear-gradient(135deg, #6B7280, #4B5563)',
      headerIcon: '📋',
      headerTitle: 'Suscripción cancelada',
      headerSubtitle: `Plan ${planName}`,
      bodyContent,
      footerExtra: '¿Tenés feedback? Nos encantaría escucharte. Respondé este email.',
    });

    return this.sendEmail({
      to,
      subject: `Confirmación de cancelación · Plan ${planName}`,
      html,
    });
  }

  /**
   * Strip HTML tags to generate plain text fallback
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
