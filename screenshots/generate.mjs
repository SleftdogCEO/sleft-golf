import { chromium } from 'playwright';

const BASE_URL = 'https://sleftgolf.vercel.app';
const EMAIL = 'applereview@sleftgolf.com';
const PASSWORD = 'SleftGolf2026!';
const OUTPUT_DIR = '/Users/grantdenmark1/claude/fairway-social/screenshots';
const PROJECT_REF = 'ujlafipkcptwjtsnydcy';

// iPhone 6.5" display: 428x926 @ 3x = 1284x2778
const VIEWPORT = { width: 428, height: 926 };
const DPR = 3;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Login via API
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/feed`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const sessionData = await page.evaluate(async (creds) => {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    });
    return resp.json();
  }, { email: EMAIL, password: PASSWORD });

  console.log('Logged in as:', sessionData.session?.user?.email || 'FAILED');

  // Set auth cookie + localStorage
  const sessionStr = JSON.stringify(sessionData.session);
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const CHUNK_SIZE = 3500;
  const chunks = [];
  for (let i = 0; i < sessionStr.length; i += CHUNK_SIZE) {
    chunks.push(sessionStr.slice(i, i + CHUNK_SIZE));
  }
  if (chunks.length === 1) {
    await context.addCookies([{ name: cookieName, value: chunks[0], domain: 'sleftgolf.vercel.app', path: '/', secure: true, sameSite: 'Lax' }]);
  } else {
    for (let i = 0; i < chunks.length; i++) {
      await context.addCookies([{ name: `${cookieName}.${i}`, value: chunks[i], domain: 'sleftgolf.vercel.app', path: '/', secure: true, sameSite: 'Lax' }]);
    }
  }
  await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: cookieName, session: sessionData.session });

  // Take screenshots
  const screens = [
    { path: '/feed', name: 'feed' },
    { path: '/calendar', name: 'board' },
    { path: '/propose', name: 'caddie' },
  ];

  for (let i = 0; i < screens.length; i++) {
    const { path, name } = screens[i];
    const num = String(i + 1).padStart(2, '0');
    console.log(`Screenshot ${num}: ${name}`);
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUTPUT_DIR}/appstore-${num}-${name}.png`, fullPage: false });
  }

  // Screenshot 4: Feed scrolled (Hot Courses + posts)
  console.log('Screenshot 04: hot-courses');
  await page.goto(`${BASE_URL}/feed`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/appstore-04-hot-courses.png`, fullPage: false });

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
