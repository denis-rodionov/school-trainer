import { webkit } from 'playwright';

const URL = 'https://school-trainer-70cb5.web.app';
const EMAIL = process.env.REPRO_EMAIL;
const PASSWORD = process.env.REPRO_PASSWORD;

(async () => {
  const browser = await webkit.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  const requests = new Map();

  page.on('console', (m) => consoleLogs.push({ type: m.type(), text: m.text() }));
  page.on('request', (req) => {
    requests.set(req.url(), { state: 'pending', type: req.resourceType() });
  });
  page.on('response', (resp) => {
    const u = resp.url();
    if (requests.has(u)) requests.set(u, { state: 'done', status: resp.status(), type: requests.get(u).type });
  });
  page.on('requestfailed', (req) => {
    requests.set(req.url(), { state: 'failed', error: req.failure()?.errorText, type: req.resourceType() });
  });

  await page.goto(`${URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
  console.log('Logged in OK');

  // Reload until stuck or 10 attempts
  for (let attempt = 1; attempt <= 15; attempt++) {
    consoleLogs.length = 0;
    requests.clear();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const state = await page.evaluate(() => ({
      spinner: !!document.querySelector('.MuiCircularProgress-root'),
      path: location.pathname,
      text: (document.body?.innerText || '').slice(0, 150),
    }));

    const pending = [...requests.entries()]
      .filter(([, v]) => v.state === 'pending')
      .map(([url, v]) => ({ url: url.slice(0, 130), type: v.type }));

    const authRelated = [...requests.entries()]
      .filter(([url]) => url.includes('auth') || url.includes('firestore') || url.includes('identitytoolkit'))
      .map(([url, v]) => ({ url: url.slice(0, 130), ...v }));

    const corsErrors = consoleLogs.filter((l) => l.text.includes('access control'));

    console.log(`\n--- Attempt ${attempt}: ${state.spinner ? 'STUCK' : 'OK'} path=${state.path} ---`);
    console.log('Body:', state.text.replace(/\n/g, ' ').slice(0, 100));
    console.log('Pending requests:', pending.length ? pending : '(none tracked)');
    console.log('Auth/Firestore requests:', authRelated.slice(0, 8));
    if (corsErrors.length) console.log('CORS errors:', corsErrors.map((e) => e.text.slice(0, 120)));

    if (state.spinner) {
      console.log('\n=== STUCK — capturing 15s more ===');
      await page.waitForTimeout(15000);
      const still = await page.evaluate(() => !!document.querySelector('.MuiCircularProgress-root'));
      console.log('Still stuck after 15s more:', still);
      break;
    }
  }

  await browser.close();
})();
