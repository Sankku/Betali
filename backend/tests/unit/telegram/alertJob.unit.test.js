/**
 * Telegram Alert Job — Unit Tests
 *
 * Tests the daily digest logic in isolation:
 * classification, timing window, cooldown.
 */

const {
  classifyStock,
  isDigestTime,
  alreadySentToday,
  markSentToday,
  digestSentToday,
  todayUTC,
  runAlertCheck
} = require('../../../telegram/alertJob');

// ──────────────────────────────────────────
// classifyStock
// ──────────────────────────────────────────

describe('classifyStock', () => {
  test('stock 0 → critical regardless of min_stock', () => {
    expect(classifyStock({ current_stock: 0, min_stock: 10 })).toBe('critical');
    expect(classifyStock({ current_stock: 0, min_stock: 0 })).toBe('critical');
    expect(classifyStock({ current_stock: 0, min_stock: null })).toBe('critical');
  });

  test('stock <= min_stock → critical', () => {
    expect(classifyStock({ current_stock: 5,  min_stock: 10 })).toBe('critical');
    expect(classifyStock({ current_stock: 10, min_stock: 10 })).toBe('critical');
  });

  test('stock <= min_stock * 1.5 → warning', () => {
    expect(classifyStock({ current_stock: 12, min_stock: 10 })).toBe('warning');
    expect(classifyStock({ current_stock: 15, min_stock: 10 })).toBe('warning');
  });

  test('stock > min_stock * 1.5 → ok', () => {
    expect(classifyStock({ current_stock: 16,  min_stock: 10 })).toBe('ok');
    expect(classifyStock({ current_stock: 100, min_stock: 10 })).toBe('ok');
  });

  test('no min_stock: only stock=0 is critical', () => {
    expect(classifyStock({ current_stock: 1, min_stock: 0 })).toBe('ok');
    expect(classifyStock({ current_stock: 1, min_stock: null })).toBe('ok');
    expect(classifyStock({ current_stock: 0, min_stock: 0 })).toBe('critical');
  });

  test('handles missing current_stock (defaults to 0 → critical)', () => {
    expect(classifyStock({ min_stock: 5 })).toBe('critical');
  });
});

// ──────────────────────────────────────────
// isDigestTime
// ──────────────────────────────────────────

describe('isDigestTime', () => {
  test('returns false for null/undefined time', () => {
    expect(isDigestTime(null)).toBe(false);
    expect(isDigestTime(undefined)).toBe(false);
    expect(isDigestTime('')).toBe(false);
  });

  test('matches current UTC hour:minute', () => {
    const now = new Date();
    const h   = String(now.getUTCHours()).padStart(2, '0');
    const m   = String(now.getUTCMinutes()).padStart(2, '0');
    expect(isDigestTime(`${h}:${m}`)).toBe(true);
  });

  test('does NOT match a different hour', () => {
    const now = new Date();
    const wrongH = String((now.getUTCHours() + 1) % 24).padStart(2, '0');
    const m      = String(now.getUTCMinutes()).padStart(2, '0');
    expect(isDigestTime(`${wrongH}:${m}`)).toBe(false);
  });

  test('does NOT match a different minute', () => {
    const now = new Date();
    const h      = String(now.getUTCHours()).padStart(2, '0');
    const wrongM = String((now.getUTCMinutes() + 1) % 60).padStart(2, '0');
    expect(isDigestTime(`${h}:${wrongM}`)).toBe(false);
  });
});

// ──────────────────────────────────────────
// alreadySentToday / markSentToday
// ──────────────────────────────────────────

describe('daily digest cooldown', () => {
  const CONN_ID = 'conn-abc-123';

  beforeEach(() => {
    digestSentToday.clear();
  });

  test('returns false when no digest sent yet', () => {
    expect(alreadySentToday(CONN_ID)).toBe(false);
  });

  test('returns true immediately after marking', () => {
    markSentToday(CONN_ID);
    expect(alreadySentToday(CONN_ID)).toBe(true);
  });

  test('different connection IDs are independent', () => {
    markSentToday('conn-1');
    expect(alreadySentToday('conn-2')).toBe(false);
  });

  test('marking stores today date in UTC', () => {
    markSentToday(CONN_ID);
    expect(digestSentToday.get(CONN_ID)).toBe(todayUTC());
  });

  test('simulating next day: override stored date to yesterday', () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    digestSentToday.set(CONN_ID, yesterdayStr);
    // Should be false since today !== yesterday
    expect(alreadySentToday(CONN_ID)).toBe(false);
  });
});

// ──────────────────────────────────────────
// runAlertCheck: null bot guard
// ──────────────────────────────────────────

describe('runAlertCheck safety', () => {
  beforeEach(() => digestSentToday.clear());

  test('does not throw when bot is null', async () => {
    await expect(runAlertCheck(null)).resolves.toBeUndefined();
  });
});

// ──────────────────────────────────────────
// Alert content logic
// ──────────────────────────────────────────

describe('alert content logic', () => {
  test('only critical and warning products are alertable', () => {
    const products = [
      { product_id: 'p1', name: 'Levadura', current_stock: 0,   min_stock: 10 },  // critical
      { product_id: 'p2', name: 'Sal',      current_stock: 8,   min_stock: 10 },  // critical
      { product_id: 'p3', name: 'Agua',     current_stock: 12,  min_stock: 10 },  // warning
      { product_id: 'p4', name: 'Harina',   current_stock: 50,  min_stock: 10 },  // ok
    ];

    const alertable = products
      .map(p => ({ ...p, severity: classifyStock(p) }))
      .filter(p => p.severity !== 'ok');

    expect(alertable).toHaveLength(3);
    expect(alertable.map(p => p.name).sort()).toEqual(['Agua', 'Levadura', 'Sal'].sort());
  });

  test('products with no min_stock only alert when stock = 0', () => {
    const products = [
      { product_id: 'p1', name: 'A', current_stock: 0,  min_stock: null },  // critical
      { product_id: 'p2', name: 'B', current_stock: 5,  min_stock: null },  // ok
    ];

    const alertable = products
      .map(p => ({ ...p, severity: classifyStock(p) }))
      .filter(p => p.severity !== 'ok');

    expect(alertable).toHaveLength(1);
    expect(alertable[0].name).toBe('A');
  });

  test('critical products rank above warning', () => {
    const severityOrder = (s) => s === 'critical' ? 2 : s === 'warning' ? 1 : 0;

    const products = [
      { product_id: 'p1', current_stock: 12, min_stock: 10 }, // warning
      { product_id: 'p2', current_stock: 0,  min_stock: 10 }, // critical
      { product_id: 'p3', current_stock: 5,  min_stock: 10 }, // critical
    ];

    const sorted = products
      .map(p => ({ ...p, severity: classifyStock(p) }))
      .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));

    expect(sorted[0].severity).toBe('critical');
    expect(sorted[1].severity).toBe('critical');
    expect(sorted[2].severity).toBe('warning');
  });
});
