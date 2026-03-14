#!/usr/bin/env node

/**
 * BETALI AI EXPLORER — Autonomous QA Agent
 * ──────────────────────────────────────────────────────────────────────────
 * Uses Playwright + Ollama to autonomously navigate the app, discover broken
 * flows, and generate a report of issues found. No predefined test scripts —
 * the AI decides what to click and test next.
 *
 * Concept:
 *   1. Start at a known page (dashboard)
 *   2. Take a snapshot of visible elements (accessibility tree)
 *   3. Ask Ollama: "What's the most important thing to test next?"
 *   4. Execute the action (click, fill, navigate)
 *   5. Detect JS errors, 4xx/5xx responses, broken states
 *   6. Repeat for N steps
 *   7. Output a report of all issues found
 *
 * Usage:
 *   node scripts/ai-explorer.js
 *   node scripts/ai-explorer.js --steps=20 --start=/dashboard/orders
 *   node scripts/ai-explorer.js --report=./explorer-report.json
 * ──────────────────────────────────────────────────────────────────────────
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.slice(2).split('='))
);

const CONFIG = {
  baseURL:       args.url     || process.env.APP_URL  || 'http://localhost:3000',
  ollamaURL:     args.ollama  || 'http://localhost:11434/api/generate',
  model:         args.model   || 'qwen2.5-coder:7b',
  maxSteps:      parseInt(args.steps   || '15'),
  startPath:     args.start   || '/dashboard',
  reportFile:    args.report  || './explorer-report.json',
  headless:      args.headless !== 'false',
  email:         process.env.TEST_EMAIL    || 'admin@betali-test.com',
  password:      process.env.TEST_PASSWORD || 'TestPassword123!',
  screenshotDir: './explorer-screenshots',
};

// ─── Colors ──────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  gray:   (s) => `\x1b[90m${s}\x1b[0m`,
};

// ─── Ollama helper ───────────────────────────────────────────────
async function askOllama(prompt) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.ollamaURL);
    const payload = JSON.stringify({ model: CONFIG.model, prompt, stream: false });

    const req = http.request({
      hostname: url.hostname,
      port: url.port || 11434,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 120000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data).response || '');
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Ollama timeout')); });
    req.write(payload);
    req.end();
  });
}

// ─── Get interactive elements snapshot ──────────────────────────
async function getPageSnapshot(page) {
  return await page.evaluate(() => {
    const elements = [];
    const selectors = [
      'button:not([disabled])', 'a[href]', 'input:not([type="hidden"])',
      'select', 'textarea', '[role="button"]', '[role="tab"]', '[role="menuitem"]',
      '[data-testid]',
    ];

    const seen = new Set();
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (seen.has(el)) return;
        seen.add(el);
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;  // skip hidden

        const label = el.textContent?.trim().slice(0, 60) ||
          el.getAttribute('aria-label') ||
          el.getAttribute('placeholder') ||
          el.getAttribute('title') ||
          el.tagName.toLowerCase();

        const id = el.id ? `#${el.id}` : '';
        const testId = el.dataset?.testid ? `[data-testid="${el.dataset.testid}"]` : '';
        const selector = id || testId || sel;

        elements.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
          label: label.replace(/\s+/g, ' '),
          selector: selector,
          href: el.getAttribute('href') || '',
        });
      });
    });

    return {
      url: window.location.pathname,
      title: document.title,
      elements: elements.slice(0, 40),  // limit to 40 to keep prompt manageable
    };
  });
}

// ─── Detect issues on page ───────────────────────────────────────
async function detectIssues(page, consoleErrors, networkErrors) {
  const issues = [];

  // JS console errors — filter out expected network/infra noise, keep real JS errors
  const IGNORED_CONSOLE = [
    'favicon',
    'ERR_BLOCKED_BY_CLIENT',
    'ERR_CONNECTION_REFUSED',
    'Failed to fetch',
    'TypeError: Failed to fetch',
    'Failed to load resource',
    'net::',
    'Load failed',
    'You do not have permission',        // 403 on /api/users during org context load
    'Please provide x-organization-id',  // race: org context not yet ready
  ];
  consoleErrors.forEach(e => {
    if (e.type === 'error' && !IGNORED_CONSOLE.some(s => e.text.includes(s))) {
      issues.push({ type: 'console_error', message: e.text.slice(0, 200) });
    }
  });

  // Network failures
  networkErrors.forEach(e => {
    issues.push({ type: 'network_error', message: `${e.status} ${e.url}` });
  });

  // Page-level errors (visible text)
  try {
    const errorTexts = await page.$$eval(
      '[class*="error"], [class*="Error"], .toast-error, [role="alert"]',
      els => els.map(e => e.textContent?.trim().slice(0, 100)).filter(Boolean)
    );
    errorTexts.forEach(t => {
      if (t.length > 5) issues.push({ type: 'ui_error', message: t });
    });
  } catch {}

  return issues;
}

// ─── Parse Ollama action ─────────────────────────────────────────
function parseAction(text) {
  // Expect JSON like: {"action":"click","selector":"button","reason":"..."}
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  // Fallback: parse text instructions
  const lower = text.toLowerCase();
  if (lower.includes('navigate') || lower.includes('goto')) {
    const pathMatch = text.match(/\/[a-z/-]+/);
    if (pathMatch) return { action: 'navigate', path: pathMatch[0], reason: text.slice(0, 80) };
  }
  if (lower.includes('click')) {
    const btnMatch = text.match(/"([^"]+)"|'([^']+)'/);
    const label = btnMatch ? (btnMatch[1] || btnMatch[2]) : 'button';
    return { action: 'click', label, reason: text.slice(0, 80) };
  }
  return { action: 'skip', reason: 'Could not parse action' };
}

// ─── Execute action on page ──────────────────────────────────────
async function executeAction(page, action) {
  try {
    switch (action.action) {
      case 'navigate': {
        const path = action.path || action.url || '/dashboard';
        await page.goto(CONFIG.baseURL + path, { timeout: 15000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        return true;
      }

      case 'click': {
        if (action.selector) {
          await page.click(action.selector, { timeout: 5000 });
        } else if (action.label) {
          await page.click(`text="${action.label}"`, { timeout: 5000 });
        }
        await page.waitForTimeout(1500);
        return true;
      }

      case 'fill': {
        const sel = action.selector || `input[placeholder*="${action.field || ''}"]`;
        await page.fill(sel, action.value || 'test-value', { timeout: 5000 });
        await page.waitForTimeout(500);
        return true;
      }

      case 'skip':
        return true;

      default:
        return false;
    }
  } catch (err) {
    console.log(c.gray(`    Action failed: ${err.message.slice(0, 60)}`));
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log(c.bold(`\n🤖 BETALI AI EXPLORER`));
  console.log(`   App:   ${c.cyan(CONFIG.baseURL)}`);
  console.log(`   Model: ${c.cyan(CONFIG.model)}`);
  console.log(`   Steps: ${c.cyan(CONFIG.maxSteps)}`);
  console.log(`   Start: ${c.cyan(CONFIG.startPath)}\n`);

  // Ensure screenshot dir
  if (!fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }

  // ── Pre-flight: verify all required services are up ───────────
  const checkHttp = (url) => new Promise((resolve) => {
    const mod = url.startsWith('https') ? require('https') : http;
    const req = mod.get(url, (res) => { res.resume(); resolve(res.statusCode < 500); });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });

  const backendOk  = await checkHttp('http://localhost:4000/api/health');
  const frontendOk = await checkHttp('http://localhost:3000');

  if (!backendOk || !frontendOk) {
    console.error(c.red('\n  ❌ Required services are not running:'));
    if (!backendOk)  console.error(c.yellow('     Backend  (port 4000) — run: cd backend && bun run dev'));
    if (!frontendOk) console.error(c.yellow('     Frontend (port 3000) — run: cd frontend && bun run dev'));
    console.error(c.cyan('\n     Tip: run both at once with:  bun run dev:all'));
    console.error(c.cyan('     Or use quality-gate as launcher: bun run quality-gate:e2e'));
    process.exit(1);
  }
  console.log(c.green('  ✅ Backend  is running (port 4000)'));
  console.log(c.green('  ✅ Frontend is running (port 3000)'));

  // Check Ollama is up
  try {
    await askOllama('ping');
    console.log(c.green('  ✅ Ollama is running'));
  } catch {
    console.error(c.red('  ❌ Ollama not running at http://localhost:11434'));
    console.error(c.yellow('     Start it with: ollama serve'));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: CONFIG.headless });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Collect console errors and network failures
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push({ type: 'error', text: msg.text() });
  });
  page.on('response', res => {
    if (res.status() >= 400 && res.status() !== 401) {
      networkErrors.push({ status: res.status(), url: res.url().replace(CONFIG.baseURL, '') });
    }
  });

  // ── Login first ───────────────────────────────────────────────
  console.log(c.bold('  📋 Logging in...'));
  await page.goto(`${CONFIG.baseURL}/login`);
  await page.fill('#email', CONFIG.email);
  await page.fill('#password', CONFIG.password);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(/dashboard/, { timeout: 20000 });
    console.log(c.green('  ✅ Logged in successfully'));
  } catch {
    await page.screenshot({ path: `${CONFIG.screenshotDir}/login-failed.png` });
    console.error(c.red('  ❌ Login failed — check credentials and that app is running'));
    await browser.close();
    process.exit(1);
  }

  // ── Skip onboarding ───────────────────────────────────────────
  await page.addInitScript(() => {
    localStorage.setItem('betali_onboarding_completed', 'true');
    localStorage.setItem('betali_tutorial_skipped', 'true');
  });

  // Navigate to start path
  await page.goto(`${CONFIG.baseURL}${CONFIG.startPath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // ── Exploration loop ──────────────────────────────────────────
  const report = {
    startedAt: new Date().toISOString(),
    config: CONFIG,
    steps: [],
    issues: [],
    summary: { stepsRun: 0, issuesFound: 0, pagesVisited: new Set() },
  };

  let visitHistory = [CONFIG.startPath];

  console.log(c.bold(`\n  🔍 Starting exploration (${CONFIG.maxSteps} steps)...\n`));

  for (let step = 1; step <= CONFIG.maxSteps; step++) {
    console.log(c.bold(`  Step ${step}/${CONFIG.maxSteps}`));

    // Get page state
    let snapshot;
    try {
      snapshot = await getPageSnapshot(page);
    } catch {
      console.log(c.gray('    Could not get snapshot, skipping step'));
      continue;
    }

    report.summary.pagesVisited.add(snapshot.url);

    // Build prompt for Ollama
    const elementsDesc = snapshot.elements.map(el =>
      `  - [${el.tag}] "${el.label}" ${el.href ? `href="${el.href}"` : ''}`
    ).join('\n');

    const historyDesc = visitHistory.slice(-5).join(' → ');

    const prompt = `
You are an autonomous QA agent testing a SaaS inventory management app (Betali).
Your goal: find bugs, broken flows, and UX issues by exploring the app.

CURRENT STATE:
- Page: ${snapshot.url}
- Title: ${snapshot.title}
- Visit history: ${historyDesc}

INTERACTIVE ELEMENTS:
${elementsDesc}

INSTRUCTIONS:
1. Choose ONE action to take. Prioritize testing:
   - Forms and their validation (creating/editing products, orders, warehouse)
   - Navigation to pages not yet visited
   - Actions that modify data (create, update, delete)
   - Edge cases (empty forms, large quantities, special characters in names)
2. Do NOT revisit: ${visitHistory.slice(-3).join(', ')}
3. Prefer deeper flows over navigation if elements look interesting.
4. Output ONLY a JSON object with NO explanation:
{"action":"click|navigate|fill|skip","selector":"css selector or empty","label":"button text if click","path":"/route if navigate","field":"field name if fill","value":"value if fill","reason":"1 sentence why"}
`.trim();

    let aiResponse;
    let action;

    try {
      console.log(c.gray(`    Asking AI (${CONFIG.model})...`));
      aiResponse = await askOllama(prompt);
      action = parseAction(aiResponse);
    } catch (err) {
      console.log(c.yellow(`    Ollama error: ${err.message} — using fallback`));
      action = { action: 'navigate', path: '/dashboard', reason: 'Ollama unavailable, returning home' };
    }

    console.log(c.cyan(`    → ${action.action}: ${action.label || action.path || action.selector || '?'}`));
    console.log(c.gray(`       Reason: ${action.reason?.slice(0, 80) || ''}`));

    // Execute action
    const actionSuccess = await executeAction(page, action);

    // Take screenshot
    const screenshotPath = `${CONFIG.screenshotDir}/step-${String(step).padStart(2,'0')}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Detect issues
    const stepIssues = await detectIssues(page, consoleErrors.splice(0), networkErrors.splice(0));

    if (stepIssues.length > 0) {
      stepIssues.forEach(issue => {
        console.log(c.red(`    🐛 Issue: [${issue.type}] ${issue.message.slice(0, 100)}`));
      });
      report.issues.push(...stepIssues.map(i => ({ ...i, step, page: snapshot.url, screenshot: screenshotPath })));
    }

    // Record step
    const currentUrl = page.url().replace(CONFIG.baseURL, '');
    visitHistory.push(currentUrl);

    report.steps.push({
      step,
      page: snapshot.url,
      action: { ...action, aiResponse: aiResponse?.slice(0, 200) },
      success: actionSuccess,
      issues: stepIssues,
      screenshot: screenshotPath,
    });

    report.summary.stepsRun = step;
  }

  await browser.close();

  // ── Final report ──────────────────────────────────────────────
  report.summary.issuesFound = report.issues.length;
  report.summary.pagesVisited = Array.from(report.summary.pagesVisited);
  report.finishedAt = new Date().toISOString();

  // Save JSON report
  fs.writeFileSync(CONFIG.reportFile, JSON.stringify(report, null, 2));

  // Print summary
  console.log(c.bold(`\n  ════════════════════════════════════`));
  console.log(c.bold(`  AI EXPLORER REPORT`));
  console.log(`  Steps run:     ${report.summary.stepsRun}`);
  console.log(`  Pages visited: ${report.summary.pagesVisited.join(', ') || 'none'}`);
  console.log(`  Issues found:  ${report.summary.issuesFound}`);

  if (report.issues.length > 0) {
    console.log(c.red(c.bold(`\n  🐛 Issues found:`)));
    const byType = {};
    report.issues.forEach(i => {
      byType[i.type] = byType[i.type] || [];
      byType[i.type].push(i.message);
    });
    Object.entries(byType).forEach(([type, msgs]) => {
      console.log(c.yellow(`\n  [${type}]`));
      msgs.slice(0, 5).forEach(m => console.log(`    • ${m.slice(0, 120)}`));
    });
    console.log(c.yellow(`\n  Full report: ${CONFIG.reportFile}`));
    console.log(c.yellow(`  Screenshots: ${CONFIG.screenshotDir}/`));
  } else {
    console.log(c.green(c.bold(`\n  ✅ No issues found! App looks healthy.`)));
  }

  console.log(`\n  Report saved: ${c.cyan(CONFIG.reportFile)}\n`);

  process.exit(report.issues.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(c.red(`\n💥 Explorer crashed: ${err.message}`));
  console.error(err.stack);
  process.exit(2);
});
