const { ServiceFactory } = require('../config/container');
const { Logger } = require('../utils/Logger');
const telegramRepo = require('../repositories/TelegramRepository');

const logger = new Logger('TelegramBot:alertJob');

// Check interval: every minute (for precise daily scheduling)
const CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Map<connectionId, 'YYYY-MM-DD'> — tracks which connections already got
 * the digest today. Resets on server restart (fine: will re-send on next day).
 */
const digestSentToday = new Map();

// ──────────────────────────────────────────
// Stock classification (shared with /stock)
// ──────────────────────────────────────────

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

function severityOrder(s) {
  return s === 'critical' ? 2 : s === 'warning' ? 1 : 0;
}

// ──────────────────────────────────────────
// Cooldown helpers
// ──────────────────────────────────────────

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function alreadySentToday(connectionId) {
  return digestSentToday.get(connectionId) === todayUTC();
}

function markSentToday(connectionId) {
  digestSentToday.set(connectionId, todayUTC());
}

/**
 * Returns true if the current UTC time matches the connection's daily_digest_time
 * within a 1-minute window (so we only fire once even if the interval runs multiple times).
 */
function isDigestTime(dailyDigestTime) {
  if (!dailyDigestTime) return false;

  const now = new Date();
  const nowH = now.getUTCHours();
  const nowM = now.getUTCMinutes();

  // daily_digest_time is stored as 'HH:MM' (Postgres TIME)
  const [h, m] = dailyDigestTime.split(':').map(Number);
  return nowH === h && nowM === m;
}

// ──────────────────────────────────────────
// Send the daily digest message
// ──────────────────────────────────────────

const SEVERITY_EMOJI = { critical: '🔴', warning: '🟡' };

async function sendDailyDigest(bot, conn, products) {
  const minSeverity  = conn.alert_min_severity || 'warning';
  const minOrder     = severityOrder(minSeverity);

  const alertable = products
    .map(p => ({ ...p, severity: classifyStock(p) }))
    .filter(p => severityOrder(p.severity) >= minOrder && p.severity !== 'ok')
    .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));

  if (alertable.length === 0) {
    // All good — send a brief "todo ok" message
    try {
      await bot.api.sendMessage(
        conn.telegram_chat_id,
        '✅ *Resumen diario de stock*\n\nTodo en orden, sin productos con stock bajo.',
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      logger.error('Failed to send ok digest', { chatId: conn.telegram_chat_id, error: err.message });
    }
    return;
  }

  const lines = ['📦 *Resumen diario de stock*\n'];
  for (const p of alertable.slice(0, 25)) {
    const emoji  = SEVERITY_EMOJI[p.severity] || '🟡';
    const stock  = formatStock(p.current_stock, p.unit);
    const minStr = p.min_stock ? ` (mín: ${formatStock(p.min_stock, p.unit)})` : '';
    lines.push(`${emoji} *${p.name}* — ${stock}${minStr}`);
  }

  if (alertable.length > 25) {
    lines.push(`\n_...y ${alertable.length - 25} más. Usá /stock para el listado completo._`);
  }

  const criticals = alertable.filter(p => p.severity === 'critical').length;
  const warnings  = alertable.filter(p => p.severity === 'warning').length;
  lines.push(`\n🔴 ${criticals} crítico${criticals !== 1 ? 's' : ''} | 🟡 ${warnings} en alerta`);
  lines.push('\n_Usá /comprar para crear una orden de compra._');

  try {
    await bot.api.sendMessage(conn.telegram_chat_id, lines.join('\n'), { parse_mode: 'Markdown' });
    logger.info('Daily digest sent', { chatId: conn.telegram_chat_id, orgId: conn.organization_id, count: alertable.length });
  } catch (err) {
    logger.error('Failed to send daily digest', { chatId: conn.telegram_chat_id, error: err.message });
  }
}

// ──────────────────────────────────────────
// Main check — runs every minute
// ──────────────────────────────────────────

async function runAlertCheck(bot) {
  if (!bot) return;

  try {
    const connections = await telegramRepo.findAllActiveWithAlerts();
    if (connections.length === 0) return;

    const productTypeService = ServiceFactory.createProductTypeService();

    // Group by org to avoid N+1 product fetches
    const byOrg = new Map();
    for (const conn of connections) {
      if (!byOrg.has(conn.organization_id)) byOrg.set(conn.organization_id, []);
      byOrg.get(conn.organization_id).push(conn);
    }

    for (const [organizationId, conns] of byOrg) {
      let products = null; // lazy-loaded per org

      for (const conn of conns) {
        // Skip if digest already sent today for this connection
        if (alreadySentToday(conn.connection_id)) continue;

        // Skip if it's not the right time yet
        if (!isDigestTime(conn.daily_digest_time)) continue;

        // Lazy-load products for this org
        if (!products) {
          try {
            products = await productTypeService.getTypes(organizationId);
          } catch (err) {
            logger.error('Error fetching products for digest', { organizationId, error: err.message });
            break;
          }
        }

        await sendDailyDigest(bot, conn, products || []);
        markSentToday(conn.connection_id);
      }
    }
  } catch (err) {
    logger.error('Alert job error', { error: err.message });
  }
}

// ──────────────────────────────────────────
// Scheduler
// ──────────────────────────────────────────

let intervalHandle = null;

function startAlertJob(bot) {
  if (intervalHandle) return;
  logger.info('Starting daily digest job (checks every minute)');
  runAlertCheck(bot); // Run once on startup to catch missed digests
  intervalHandle = setInterval(() => runAlertCheck(bot), CHECK_INTERVAL_MS);
}

function stopAlertJob() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Daily digest job stopped');
  }
}

module.exports = {
  startAlertJob,
  stopAlertJob,
  // Exported for testing
  classifyStock,
  isDigestTime,
  alreadySentToday,
  markSentToday,
  digestSentToday,
  todayUTC,
  runAlertCheck
};
