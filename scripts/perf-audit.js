#!/usr/bin/env node

/**
 * BETALI PERFORMANCE AUDITOR
 * ──────────────────────────────────────────────────────────────────────────
 * Usa Playwright para autenticar y medir Core Web Vitals + métricas de
 * performance en cada página del dashboard. Genera un reporte HTML detallado.
 *
 * Métricas por página:
 *   - TTFB (Time to First Byte)
 *   - FCP  (First Contentful Paint)
 *   - LCP  (Largest Contentful Paint)
 *   - CLS  (Cumulative Layout Shift)
 *   - TBT  (Total Blocking Time estimado)
 *   - JS Heap usado
 *   - Recursos cargados (JS/CSS/API calls)
 *   - Tiempo total de carga
 *
 * Uso:
 *   node scripts/perf-audit.js
 *   node scripts/perf-audit.js --url=http://localhost:3000
 *   node scripts/perf-audit.js --output=./perf-report.html
 *   node scripts/perf-audit.js --pages=dashboard,orders,products
 *   node scripts/perf-audit.js --runs=3   (promedia N runs por página)
 *
 * Requiere: frontend en :3000, backend en :4000
 * ──────────────────────────────────────────────────────────────────────────
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ─── Config ────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; })
);

const BASE_URL   = args.url    || 'http://localhost:3000';
const OUTPUT     = args.output || path.join(process.cwd(), 'perf-report.html');
const RUNS       = parseInt(args.runs) || 1;
const SCREENSHOT = args.screenshots !== 'false';
const TIMEOUT    = 20000;

const EMAIL    = 'admin@betali-test.com';
const PASSWORD = 'TestPassword123!';

// Páginas a auditar
const ALL_PAGES = {
  dashboard:        '/dashboard',
  products:         '/dashboard/products',
  orders:           '/dashboard/orders',
  warehouse:        '/dashboard/warehouse',
  'stock-movements':'/dashboard/stock-movements',
  clients:          '/dashboard/clients',
  suppliers:        '/dashboard/suppliers',
  'purchase-orders':'/dashboard/purchase-orders',
  users:            '/dashboard/users',
  settings:         '/dashboard/settings',
};

const selectedKeys = args.pages
  ? args.pages.split(',').map(s => s.trim())
  : Object.keys(ALL_PAGES);

const PAGES = Object.fromEntries(
  selectedKeys.filter(k => ALL_PAGES[k]).map(k => [k, ALL_PAGES[k]])
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function checkServer(url) {
  return new Promise(resolve => {
    http.get(url, res => resolve(res.statusCode < 500)).on('error', () => resolve(false));
  });
}

function score(metric, thresholds) {
  const [good, poor] = thresholds;
  if (metric <= good)  return { label: 'BUENO',    color: '#0cce6b', bg: '#e6f9ef' };
  if (metric <= poor)  return { label: 'MEJORAR',  color: '#ffa400', bg: '#fff8e6' };
  return                      { label: 'MALO',     color: '#ff4e42', bg: '#ffe8e7' };
}

const THRESHOLDS = {
  fcp:  [1800, 3000],
  lcp:  [2500, 4000],
  cls:  [0.1,  0.25],
  ttfb: [800,  1800],
  load: [3000, 6000],
};

// ─── Metric collection script (runs inside page context) ────────────────────

const COLLECT_METRICS_SCRIPT = `
() => new Promise(resolve => {
  const result = {
    fcp: null, lcp: null, cls: 0,
    ttfb: null, domInteractive: null, domComplete: null, loadEvent: null,
    jsHeapUsed: null, jsHeapTotal: null,
    resourceCount: 0, jsSize: 0, cssSize: 0, imgSize: 0,
    apiCallCount: 0, apiTotalTime: 0,
    longTaskCount: 0, longTaskTotalMs: 0,
  };

  // Navigation timing
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) {
    result.ttfb           = Math.round(nav.responseStart - nav.requestStart);
    result.domInteractive = Math.round(nav.domInteractive);
    result.domComplete    = Math.round(nav.domComplete);
    result.loadEvent      = Math.round(nav.loadEventEnd);
  }

  // Paint timing
  const paints = performance.getEntriesByType('paint');
  paints.forEach(p => {
    if (p.name === 'first-contentful-paint') result.fcp = Math.round(p.startTime);
  });

  // Resources
  const resources = performance.getEntriesByType('resource');
  result.resourceCount = resources.length;
  resources.forEach(r => {
    const size = r.transferSize || 0;
    if (r.initiatorType === 'script')                 result.jsSize  += size;
    else if (r.initiatorType === 'link' && r.name.includes('.css')) result.cssSize += size;
    else if (r.initiatorType === 'img')               result.imgSize += size;
    else if (r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest') {
      result.apiCallCount++;
      result.apiTotalTime += Math.round(r.duration);
    }
  });

  // JS Heap (Chrome only)
  if (performance.memory) {
    result.jsHeapUsed  = performance.memory.usedJSHeapSize;
    result.jsHeapTotal = performance.memory.totalJSHeapSize;
  }

  // LCP + CLS via PerformanceObserver with timeout fallback
  let lcpDone = false, clsDone = false;
  const tryResolve = () => { if (lcpDone && clsDone) resolve(result); };

  let lcpObs, clsObs;

  try {
    lcpObs = new PerformanceObserver(list => {
      const entries = list.getEntries();
      if (entries.length) result.lcp = Math.round(entries[entries.length - 1].startTime);
    });
    lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch(e) {}

  try {
    clsObs = new PerformanceObserver(list => {
      list.getEntries().forEach(e => { if (!e.hadRecentInput) result.cls += e.value; });
    });
    clsObs.observe({ type: 'layout-shift', buffered: true });
  } catch(e) {}

  // Long tasks
  try {
    new PerformanceObserver(list => {
      list.getEntries().forEach(e => {
        result.longTaskCount++;
        result.longTaskTotalMs += Math.round(e.duration);
      });
    }).observe({ type: 'longtask', buffered: true });
  } catch(e) {}

  // Give observers 2s to collect buffered entries, then resolve
  setTimeout(() => {
    try { if (lcpObs) lcpObs.disconnect(); } catch(e) {}
    try { if (clsObs) clsObs.disconnect(); } catch(e) {}
    result.cls = Math.round(result.cls * 1000) / 1000;
    resolve(result);
  }, 2000);
})
`;

// ─── Auth ────────────────────────────────────────────────────────────────────

async function authenticate(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*dashboard/, { timeout: 15000 });
}

// ─── Measure one page ────────────────────────────────────────────────────────

async function measurePage(page, name, route) {
  const url = `${BASE_URL}${route}`;
  console.log(`  Midiendo: ${name} (${url})`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT });
  const metrics = await page.evaluate(COLLECT_METRICS_SCRIPT);

  // CDP-level JS metrics
  try {
    const cdpMetrics = await page.evaluate(() => {
      const m = {};
      if (performance.memory) {
        m.jsHeapUsed  = performance.memory.usedJSHeapSize;
        m.jsHeapTotal = performance.memory.totalJSHeapSize;
      }
      return m;
    });
    Object.assign(metrics, cdpMetrics);
  } catch(_) {}

  let screenshot = null;
  if (SCREENSHOT) {
    const buf = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 70 });
    screenshot = buf.toString('base64');
  }

  return { name, route, url, ...metrics, screenshot };
}

// ─── Multi-run average ───────────────────────────────────────────────────────

async function measurePageAvg(browser, context, name, route) {
  const numericKeys = ['fcp','lcp','cls','ttfb','domInteractive','domComplete',
                       'loadEvent','jsHeapUsed','jsSize','cssSize','imgSize',
                       'apiCallCount','apiTotalTime','longTaskCount','longTaskTotalMs'];
  const runs = [];

  for (let i = 0; i < RUNS; i++) {
    const page = await context.newPage();
    try {
      const result = await measurePage(page, name, route);
      runs.push(result);
    } finally {
      await page.close();
    }
  }

  if (runs.length === 1) return runs[0];

  // Average numeric metrics, keep last screenshot
  const avg = { ...runs[runs.length - 1] };
  numericKeys.forEach(k => {
    const vals = runs.map(r => r[k]).filter(v => v !== null && v !== undefined);
    avg[k] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });
  return avg;
}

// ─── HTML report ─────────────────────────────────────────────────────────────

function fmt(ms, unit = 'ms') {
  if (ms === null || ms === undefined) return '<span style="color:#999">N/A</span>';
  if (unit === 'ms') return `${ms.toLocaleString()} ms`;
  if (unit === 'kb') return `${(ms / 1024).toFixed(1)} KB`;
  if (unit === 'mb') return `${(ms / 1024 / 1024).toFixed(1)} MB`;
  return ms;
}

function metricBadge(value, thresholds, unit = 'ms') {
  if (value === null || value === undefined) return `<span style="color:#999">N/A</span>`;
  const s = score(value, thresholds);
  const display = unit === 'cls' ? value.toFixed(3) : fmt(value, unit);
  return `<span style="background:${s.bg};color:${s.color};padding:2px 8px;border-radius:12px;font-weight:600;font-size:0.85em">${display} ${s.label}</span>`;
}

function generateHTML(results, bundleStats) {
  const now = new Date().toLocaleString('es-AR');
  const pageCards = results.map(r => {
    const lcpScore  = score(r.lcp  ?? 9999, THRESHOLDS.lcp);
    const fcpScore  = score(r.fcp  ?? 9999, THRESHOLDS.fcp);
    const clsScore  = score(r.cls  ?? 1,    THRESHOLDS.cls);
    const ttfbScore = score(r.ttfb ?? 9999, THRESHOLDS.ttfb);
    const loadScore = score(r.loadEvent ?? 9999, THRESHOLDS.load);

    const overallBad = [lcpScore, fcpScore, clsScore, ttfbScore, loadScore]
      .filter(s => s.label === 'MALO').length;
    const overallWarn = [lcpScore, fcpScore, clsScore, ttfbScore, loadScore]
      .filter(s => s.label === 'MEJORAR').length;
    const headerColor = overallBad > 0 ? '#ff4e42' : overallWarn > 1 ? '#ffa400' : '#0cce6b';

    return `
<div class="page-card">
  <div class="page-header" style="border-left:4px solid ${headerColor}">
    <div>
      <h2>${r.name}</h2>
      <code>${r.route}</code>
    </div>
    ${r.screenshot ? `<img class="thumb" src="data:image/jpeg;base64,${r.screenshot}" alt="screenshot" onclick="this.classList.toggle('zoomed')">` : ''}
  </div>

  <div class="cwv-grid">
    <div class="cwv-item">
      <div class="cwv-label">LCP</div>
      <div class="cwv-value">${metricBadge(r.lcp, THRESHOLDS.lcp)}</div>
      <div class="cwv-desc">Largest Contentful Paint</div>
    </div>
    <div class="cwv-item">
      <div class="cwv-label">FCP</div>
      <div class="cwv-value">${metricBadge(r.fcp, THRESHOLDS.fcp)}</div>
      <div class="cwv-desc">First Contentful Paint</div>
    </div>
    <div class="cwv-item">
      <div class="cwv-label">CLS</div>
      <div class="cwv-value">${metricBadge(r.cls, THRESHOLDS.cls, 'cls')}</div>
      <div class="cwv-desc">Cumulative Layout Shift</div>
    </div>
    <div class="cwv-item">
      <div class="cwv-label">TTFB</div>
      <div class="cwv-value">${metricBadge(r.ttfb, THRESHOLDS.ttfb)}</div>
      <div class="cwv-desc">Time to First Byte</div>
    </div>
    <div class="cwv-item">
      <div class="cwv-label">Carga total</div>
      <div class="cwv-value">${metricBadge(r.loadEvent, THRESHOLDS.load)}</div>
      <div class="cwv-desc">Load Event</div>
    </div>
    <div class="cwv-item">
      <div class="cwv-label">DOM Interactive</div>
      <div class="cwv-value">${fmt(r.domInteractive)}</div>
      <div class="cwv-desc">JS listo para interactuar</div>
    </div>
  </div>

  <div class="resource-grid">
    <div class="res-item"><span class="res-icon">📦</span><b>${fmt(r.jsSize, 'kb')}</b><br><small>JS transferido</small></div>
    <div class="res-item"><span class="res-icon">🎨</span><b>${fmt(r.cssSize, 'kb')}</b><br><small>CSS transferido</small></div>
    <div class="res-item"><span class="res-icon">🔗</span><b>${r.apiCallCount ?? 0}</b><br><small>llamadas API</small></div>
    <div class="res-item"><span class="res-icon">⏱️</span><b>${fmt(r.apiTotalTime)}</b><br><small>tiempo total API</small></div>
    <div class="res-item"><span class="res-icon">🧱</span><b>${r.resourceCount ?? 0}</b><br><small>recursos totales</small></div>
    <div class="res-item"><span class="res-icon">🧠</span><b>${fmt(r.jsHeapUsed, 'mb')}</b><br><small>JS Heap usado</small></div>
    ${r.longTaskCount > 0 ? `<div class="res-item warn"><span class="res-icon">🐢</span><b>${r.longTaskCount} tareas largas</b><br><small>${fmt(r.longTaskTotalMs)} bloqueando UI</small></div>` : ''}
  </div>
</div>`;
  }).join('\n');

  const summaryRows = results.map(r => {
    const lcpS = score(r.lcp  ?? 9999, THRESHOLDS.lcp);
    const fcpS = score(r.fcp  ?? 9999, THRESHOLDS.fcp);
    const clsS = score(r.cls  ?? 1,    THRESHOLDS.cls);
    return `
<tr>
  <td><b>${r.name}</b><br><small>${r.route}</small></td>
  <td><span style="color:${lcpS.color}">${r.lcp ?? 'N/A'} ms</span></td>
  <td><span style="color:${fcpS.color}">${r.fcp ?? 'N/A'} ms</span></td>
  <td><span style="color:${clsS.color}">${r.cls?.toFixed(3) ?? 'N/A'}</span></td>
  <td>${r.ttfb ?? 'N/A'} ms</td>
  <td>${r.apiCallCount ?? 0}</td>
  <td>${r.longTaskCount ?? 0}</td>
</tr>`;
  }).join('');

  const bundleSection = bundleStats ? `
<div class="section">
  <h2>📦 Bundle Analysis</h2>
  <pre class="bundle-pre">${bundleStats}</pre>
</div>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Betali — Performance Audit ${now}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f5f7fa; color:#1a1a2e; line-height:1.5; }
  header { background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%); color:#fff; padding:32px 40px; }
  header h1 { font-size:1.8em; font-weight:700; }
  header p  { opacity:0.7; margin-top:4px; }
  .container { max-width:1200px; margin:0 auto; padding:32px 24px; }
  .section { margin-bottom:40px; }
  .section h2 { font-size:1.3em; margin-bottom:16px; color:#16213e; border-bottom:2px solid #e2e8f0; padding-bottom:8px; }
  .summary-table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.06); }
  .summary-table th { background:#16213e; color:#fff; padding:12px 16px; text-align:left; font-size:.85em; text-transform:uppercase; letter-spacing:.04em; }
  .summary-table td { padding:12px 16px; border-bottom:1px solid #f0f4f8; font-size:.9em; }
  .summary-table tr:last-child td { border-bottom:none; }
  .page-card { background:#fff; border-radius:16px; padding:28px; margin-bottom:24px; box-shadow:0 2px 8px rgba(0,0,0,.07); }
  .page-header { display:flex; justify-content:space-between; align-items:flex-start; padding-left:16px; margin-bottom:20px; }
  .page-header h2 { font-size:1.2em; text-transform:capitalize; }
  .page-header code { color:#64748b; font-size:.85em; }
  .cwv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:16px; margin-bottom:20px; }
  .cwv-item { background:#f8fafc; border-radius:10px; padding:14px; text-align:center; }
  .cwv-label { font-size:.75em; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#94a3b8; margin-bottom:6px; }
  .cwv-value { font-size:1em; margin-bottom:4px; }
  .cwv-desc  { font-size:.75em; color:#94a3b8; }
  .resource-grid { display:flex; flex-wrap:wrap; gap:12px; }
  .res-item { background:#f8fafc; border-radius:8px; padding:12px 16px; text-align:center; min-width:110px; font-size:.85em; }
  .res-item.warn { background:#fff8e6; }
  .res-icon { font-size:1.2em; display:block; margin-bottom:4px; }
  .thumb { width:160px; height:90px; object-fit:cover; border-radius:8px; cursor:pointer; transition:all .3s; border:1px solid #e2e8f0; }
  .thumb.zoomed { width:640px; height:360px; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:999; box-shadow:0 0 0 9999px rgba(0,0,0,.5); border-radius:12px; }
  .legend { display:flex; gap:20px; margin-bottom:20px; flex-wrap:wrap; }
  .legend-item { display:flex; align-items:center; gap:8px; font-size:.85em; }
  .dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
  .bundle-pre { background:#1a1a2e; color:#a8ff78; padding:20px; border-radius:8px; font-size:.8em; overflow-x:auto; white-space:pre-wrap; }
  .thresholds { font-size:.8em; color:#64748b; margin-bottom:16px; }
</style>
</head>
<body>
<header>
  <h1>Betali — Reporte de Performance</h1>
  <p>Generado: ${now} · ${results.length} páginas auditadas · ${RUNS} run(s) promediado(s)</p>
</header>
<div class="container">

  <div class="section">
    <h2>Resumen</h2>
    <div class="thresholds">
      Umbrales: LCP ≤2.5s BUENO / ≤4s MEJORAR | FCP ≤1.8s / ≤3s | CLS ≤0.1 / ≤0.25 | TTFB ≤800ms / ≤1.8s | Carga total ≤3s / ≤6s
    </div>
    <div class="legend">
      <div class="legend-item"><span class="dot" style="background:#0cce6b"></span>BUENO</div>
      <div class="legend-item"><span class="dot" style="background:#ffa400"></span>MEJORAR</div>
      <div class="legend-item"><span class="dot" style="background:#ff4e42"></span>MALO</div>
    </div>
    <table class="summary-table">
      <thead><tr><th>Página</th><th>LCP</th><th>FCP</th><th>CLS</th><th>TTFB</th><th>API calls</th><th>Long tasks</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Detalle por página</h2>
    ${pageCards}
  </div>

  ${bundleSection}

</div>
</body>
</html>`;
}

// ─── Bundle stats ────────────────────────────────────────────────────────────

async function getBundleStats() {
  const distDir = path.join(process.cwd(), 'frontend', 'dist', 'assets');
  if (!fs.existsSync(distDir)) return null;

  const files = fs.readdirSync(distDir);
  const stats = files
    .filter(f => f.endsWith('.js') || f.endsWith('.css'))
    .map(f => {
      const stat = fs.statSync(path.join(distDir, f));
      return { file: f, size: stat.size };
    })
    .sort((a, b) => b.size - a.size);

  const total = stats.reduce((s, f) => s + f.size, 0);
  const lines = stats.map(f => {
    const bar = '█'.repeat(Math.round((f.size / stats[0].size) * 30));
    return `${f.file.padEnd(50)} ${(f.size/1024).toFixed(1).padStart(8)} KB  ${bar}`;
  });
  lines.push('');
  lines.push(`Total: ${(total/1024).toFixed(1)} KB`);

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 BETALI PERFORMANCE AUDITOR\n');

  // Pre-flight checks
  console.log('⏳ Verificando servidores...');
  const [frontOk, backOk] = await Promise.all([
    checkServer(`${BASE_URL}/`),
    checkServer('http://localhost:4000/health'),
  ]);

  if (!frontOk) {
    console.error(`❌ Frontend no responde en ${BASE_URL}. Inicia con: bun run front`);
    process.exit(1);
  }
  if (!backOk) {
    console.warn('⚠️  Backend no responde en :4000. Las métricas de API pueden ser 0.');
  }

  console.log(`✅ Frontend: OK | Backend: ${backOk ? 'OK' : 'OFFLINE'}`);
  console.log(`📋 Páginas: ${Object.keys(PAGES).join(', ')}`);
  console.log(`🔁 Runs por página: ${RUNS}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // Throttle CPU to simulate slower device (1x = no throttle, 4x = slower)
  });

  // Authenticate once, save state
  console.log('🔐 Autenticando...');
  const authPage = await context.newPage();
  try {
    await authenticate(authPage);
    console.log('✅ Autenticado correctamente\n');
  } catch (e) {
    console.error('❌ Fallo de autenticación:', e.message);
    await browser.close();
    process.exit(1);
  } finally {
    await authPage.close();
  }

  // Measure each page
  const results = [];
  for (const [name, route] of Object.entries(PAGES)) {
    try {
      const result = await measurePageAvg(browser, context, name, route);
      results.push(result);
      const lcp = result.lcp ? `LCP: ${result.lcp}ms` : 'LCP: N/A';
      const fcp = result.fcp ? `FCP: ${result.fcp}ms` : 'FCP: N/A';
      console.log(`  ✅ ${name.padEnd(20)} ${lcp.padEnd(18)} ${fcp}`);
    } catch (e) {
      console.error(`  ❌ ${name}: ${e.message}`);
      results.push({ name, route, error: e.message });
    }
  }

  await browser.close();

  // Bundle stats
  const bundleStats = await getBundleStats();
  if (bundleStats) console.log('\n📦 Bundle stats del último build encontrados');

  // Generate report
  const html = generateHTML(results, bundleStats);
  fs.writeFileSync(OUTPUT, html, 'utf8');

  console.log(`\n✅ Reporte generado: ${OUTPUT}`);
  console.log(`   Abrí con: open "${OUTPUT}"\n`);

  // Quick summary
  const avgLcp = results.filter(r => r.lcp).reduce((s, r) => s + r.lcp, 0) / results.filter(r => r.lcp).length;
  const issues = results.filter(r => r.lcp > THRESHOLDS.lcp[0] || r.fcp > THRESHOLDS.fcp[0] || r.longTaskCount > 0);
  if (issues.length > 0) {
    console.log(`⚠️  ${issues.length} página(s) necesitan atención:`);
    issues.forEach(r => {
      const reasons = [];
      if (r.lcp > THRESHOLDS.lcp[1])  reasons.push(`LCP alto (${r.lcp}ms)`);
      else if (r.lcp > THRESHOLDS.lcp[0]) reasons.push(`LCP mejorable (${r.lcp}ms)`);
      if (r.fcp > THRESHOLDS.fcp[1])  reasons.push(`FCP alto (${r.fcp}ms)`);
      if (r.cls > THRESHOLDS.cls[0])  reasons.push(`CLS alto (${r.cls?.toFixed(3)})`);
      if (r.longTaskCount > 0)         reasons.push(`${r.longTaskCount} long tasks`);
      console.log(`   - ${r.name}: ${reasons.join(', ')}`);
    });
  } else {
    console.log('🎉 ¡Todas las páginas pasaron los umbrales de Core Web Vitals!');
  }
  console.log(`\n   LCP promedio: ${Math.round(avgLcp)}ms\n`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
