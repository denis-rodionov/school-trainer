import { webkit } from 'playwright';

const URL = 'https://school-trainer-70cb5.web.app';
const EMAIL = process.env.REPRO_EMAIL;
const PASSWORD = process.env.REPRO_PASSWORD;

(async () => {
  const browser = await webkit.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });

  for (let attempt = 1; attempt <= 8; attempt++) {
    await page.reload({ waitUntil: 'domcontentloaded' });

    for (const waitSec of [5, 15, 30, 45]) {
      await page.waitForTimeout(5000);
      const snap = await page.evaluate(() => {
        const spinners = document.querySelectorAll('.MuiCircularProgress-root').length;
        const text = document.body?.innerText || '';
        return {
          spinners,
          hasLayout: text.includes('ABMELDEN') || text.includes('Abmelden'),
          hasDashboardTitle: /Dashboard|Schüler-Dashboard|Üben|Assignments/i.test(text),
          hasAuthError: text.includes('Connection') || text.includes('Verbindung'),
          path: location.pathname,
          text: text.slice(0, 400),
        };
      });
      console.log(`Attempt ${attempt} @ ${waitSec}s: spinners=${snap.spinners} layout=${snap.hasLayout} dashboard=${snap.hasDashboardTitle} err=${snap.hasAuthError}`);
      if (snap.spinners === 0 || snap.hasDashboardTitle || snap.hasAuthError) break;
    }
  }

  await browser.close();
})();
