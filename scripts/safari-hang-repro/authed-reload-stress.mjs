import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'https://school-trainer-70cb5.firebaseapp.com';
const RELOADS = parseInt(process.argv[3] || '50', 10);
const STUCK_MS = 25000;
const EMAIL = process.env.REPRO_EMAIL;
const PASSWORD = process.env.REPRO_PASSWORD;
const HEADED = process.argv.includes('--headed');
const STATE_FILE = '/tmp/school-trainer-auth-state.json';

async function checkPageState(page) {
  const start = Date.now();
  while (Date.now() - start < STUCK_MS) {
    const state = await page.evaluate(() => {
      const spinner = document.querySelector('.MuiCircularProgress-root');
      const bodyText = document.body?.innerText || '';
      const interactive =
        bodyText.includes('Dashboard') ||
        bodyText.includes('Assignments') ||
        bodyText.includes('Recent') ||
        bodyText.includes('Sign In') ||
        bodyText.includes('Email Address');
      return {
        hasSpinner: !!spinner,
        interactive: interactive && !spinner,
        path: location.pathname,
        bodySnippet: bodyText.slice(0, 300),
      };
    });
    if (state.interactive) {
      return { stuck: false, ms: Date.now() - start, state };
    }
    await page.waitForTimeout(500);
  }
  const state = await page.evaluate(() => ({
    hasSpinner: !!document.querySelector('.MuiCircularProgress-root'),
    path: location.pathname,
    bodySnippet: (document.body?.innerText || '').slice(0, 300),
  }));
  return { stuck: true, ms: STUCK_MS, state };
}

async function collectDiagnostics(page) {
  const pending = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter(
        (e) =>
          e.name.includes('auth/iframe') ||
          e.name.includes('firestore') ||
          e.name.includes('Listen') ||
          e.name.includes('identitytoolkit')
      )
      .map((e) => ({ url: e.name.slice(0, 140), ms: Math.round(e.duration) }))
  );
  return { pending };
}

async function login(page) {
  console.log('Logging in at', `${URL}/login`);
  await page.goto(`${URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(/\/(dashboard|topics|worksheet)/, { timeout: 45000 });
  } catch {
    // may redirect via /
    await page.waitForTimeout(3000);
    const path = new URL(page.url()).pathname;
    if (path === '/login') {
      const err = await page.evaluate(() => document.body?.innerText?.match(/Firebase:.*\)/)?.[0] || 'unknown');
      throw new Error(`Login failed: ${err}`);
    }
  }
  console.log('Logged in →', page.url());
  await page.context().storageState({ path: STATE_FILE });
}

(async () => {
  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 100 : 0 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allConsoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') allConsoleErrors.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('auth') || req.url().includes('firestore')) {
      allConsoleErrors.push(`REQ_FAIL: ${req.url().slice(0, 100)} — ${req.failure()?.errorText}`);
    }
  });

  await login(page);

  const results = { stuck: [], ok: [], navStuck: [] };

  console.log(`\n=== ${RELOADS} reload stress test ===`);
  for (let i = 0; i < RELOADS; i++) {
    const reloadErrors = [];
    const handler = (msg) => {
      if (msg.type() === 'error') reloadErrors.push(msg.text());
    };
    page.on('console', handler);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    const result = await checkPageState(page);
    page.off('console', handler);

    const diag = await collectDiagnostics(page);
    const entry = { reload: i + 1, ...result, consoleErrors: reloadErrors, ...diag };

    if (result.stuck) {
      results.stuck.push(entry);
      console.log(`RELOAD ${i + 1}: STUCK path=${result.state.path}`);
      console.log(`  snippet: ${result.state.bodySnippet?.replace(/\n/g, ' ').slice(0, 120)}`);
      if (reloadErrors.length) console.log(`  errors: ${reloadErrors.slice(0, 2).join(' | ')}`);
    } else {
      results.ok.push(entry);
      const cors = reloadErrors.filter((e) => e.includes('access control'));
      console.log(
        `RELOAD ${i + 1}: OK (${result.ms}ms) path=${result.state.path}${cors.length ? ' [CORS]' : ''}`
      );
    }
  }

  // Dashboard ↔ worksheet navigation
  console.log('\n=== Navigation stress (dashboard ↔ worksheet) ===');
  await page.goto(`${URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await checkPageState(page);

  const worksheetLinks = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/worksheet/"], button')]
      .map((el) => el.getAttribute('href') || el.textContent?.trim())
      .filter(Boolean)
  );
  console.log('Interactive elements sample:', worksheetLinks.slice(0, 8));

  for (let i = 0; i < 10; i++) {
    const href = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/worksheet/"]');
      return link?.getAttribute('href') || null;
    });
    if (href) {
      await page.goto(`${URL}${href}`, { waitUntil: 'domcontentloaded' });
      let r = await checkPageState(page);
      console.log(`  worksheet nav ${i + 1}: ${r.stuck ? 'STUCK' : 'OK'} (${r.ms}ms)`);
      if (r.stuck) results.navStuck.push({ dir: 'to-worksheet', ...r });
      await page.goto(`${URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      r = await checkPageState(page);
      console.log(`  dashboard nav ${i + 1}: ${r.stuck ? 'STUCK' : 'OK'} (${r.ms}ms)`);
      if (r.stuck) results.navStuck.push({ dir: 'to-dashboard', ...r });
    } else {
      console.log('  No worksheet link found — skipping nav loop');
      break;
    }
  }

  // Tab background simulation via Page.setWebLifecycleState (CDP)
  console.log('\n=== Tab background + reload ===');
  const cdp = await page.context().newCDPSession(page);
  for (let i = 0; i < 5; i++) {
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
    await page.waitForTimeout(2000);
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const r = await checkPageState(page);
    console.log(`  bg-reload ${i + 1}: ${r.stuck ? 'STUCK' : 'OK'} (${r.ms}ms) path=${r.state.path}`);
    if (r.stuck) results.stuck.push({ reload: `bg-${i + 1}`, ...r });
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Reload OK: ${results.ok.length}, STUCK: ${results.stuck.length}`);
  console.log(`Nav STUCK: ${results.navStuck.length}`);
  console.log(
    `CORS in OK reloads: ${results.ok.filter((r) => r.consoleErrors?.some((e) => e.includes('access control'))).length}/${results.ok.length}`
  );

  if (results.stuck.length) {
    console.log('\n--- STUCK DETAILS ---');
    for (const s of results.stuck) {
      console.log(JSON.stringify(s, null, 2));
    }
  }

  fs.writeFileSync('/tmp/repro-hang-results.json', JSON.stringify(results, null, 2));
  console.log('\nFull results: /tmp/repro-hang-results.json');

  if (HEADED) await page.waitForTimeout(5000);
  await browser.close();
})();
