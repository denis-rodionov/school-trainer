import { webkit, chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'https://school-trainer-70cb5.web.app';
const RELOADS = parseInt(process.argv[3] || '30', 10);
const STUCK_MS = 25000;
const EMAIL = process.env.REPRO_EMAIL;
const PASSWORD = process.env.REPRO_PASSWORD;
const ENGINE = process.argv.includes('--chromium') ? chromium : webkit;

async function checkStuck(page) {
  const start = Date.now();
  while (Date.now() - start < STUCK_MS) {
    const s = await page.evaluate(() => ({
      spinner: !!document.querySelector('.MuiCircularProgress-root'),
      path: location.pathname,
      text: (document.body?.innerText || '').slice(0, 200),
      ok:
        !document.querySelector('.MuiCircularProgress-root') &&
        ((document.body?.innerText || '').includes('Dashboard') ||
          (document.body?.innerText || '').includes('Schüler') ||
          (document.body?.innerText || '').includes('Üben') ||
          (document.body?.innerText || '').includes('Sign In')),
    }));
    if (s.ok) return { stuck: false, ms: Date.now() - start, state: s };
    await page.waitForTimeout(500);
  }
  const s = await page.evaluate(() => ({
    spinner: !!document.querySelector('.MuiCircularProgress-root'),
    path: location.pathname,
    text: (document.body?.innerText || '').slice(0, 200),
  }));
  return { stuck: true, ms: STUCK_MS, state: s };
}

async function login(page, baseUrl) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|topics)/, { timeout: 45000 });
  console.log('Logged in →', page.url());
}

async function runReloads(page, label, count) {
  const stuck = [];
  for (let i = 0; i < count; i++) {
    const errs = [];
    const h = (m) => {
      if (m.type() === 'error') errs.push(m.text());
    };
    page.on('console', h);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    const r = await checkStuck(page);
    page.off('console', h);
    const cors = errs.filter((e) => e.includes('access control'));
    console.log(
      `${label} reload ${i + 1}: ${r.stuck ? 'STUCK' : 'OK'} (${r.ms}ms)${cors.length ? ' CORS' : ''}`
    );
    if (r.stuck) stuck.push({ i: i + 1, ...r, consoleErrors: errs });
  }
  return stuck;
}

(async () => {
  const engineName = process.argv.includes('--chromium') ? 'chromium' : 'webkit';
  console.log(`Engine: ${engineName}, URL: ${URL}`);

  const browser = await ENGINE.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page, URL);
  const reloadStuck = await runReloads(page, 'single-tab', RELOADS);

  // Multi-tab: open 3 tabs to same site, wait, reload a new tab
  console.log('\n=== Multi-tab stress ===');
  const page2 = await context.newPage();
  const page3 = await context.newPage();
  await page2.goto(`${URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page3.goto(`${URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const multiStuck = [];
  for (let i = 0; i < 10; i++) {
    const p = await context.newPage();
    await p.goto(`${URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    const r = await checkStuck(p);
    console.log(`  new-tab ${i + 1}: ${r.stuck ? 'STUCK' : 'OK'} (${r.ms}ms)`);
    if (r.stuck) multiStuck.push({ tab: i + 1, ...r });
    await p.reload({ waitUntil: 'domcontentloaded' });
    const r2 = await checkStuck(p);
    console.log(`  new-tab-reload ${i + 1}: ${r2.stuck ? 'STUCK' : 'address OK'} (${r2.ms}ms)`);
    if (r2.stuck) multiStuck.push({ tab: `reload-${i + 1}`, ...r2 });
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Single-tab stuck: ${reloadStuck.length}/${RELOADS}`);
  console.log(`Multi-tab stuck: ${multiStuck.length}`);

  if (reloadStuck.length || multiStuck.length) {
    fs.writeFileSync('/tmp/repro-safari-stuck.json', JSON.stringify({ reloadStuck, multiStuck }, null, 2));
    console.log('Details: /tmp/repro-safari-stuck.json');
  }

  await browser.close();
})();
