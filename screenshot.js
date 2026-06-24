const { chromium } = require('/root/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/snap/bin/chromium',
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  const dir = '/root/.hermes/kanban/workspaces/t_ca75121d/screenshots';
  require('fs').mkdirSync(dir, { recursive: true });

  // 01: HomeRedirect
  try {
    await page.goto('http://localhost:3001/?userId=demo-user', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/01_home_redirect.png`, fullPage: true });
    console.log('01: HomeRedirect OK');
  } catch(e) { console.log('01: FAILED -', e.message); }

  // 02: Tank 60/40
  try {
    await page.goto('http://localhost:3001/tanks/6a3a6b81-d7cd-4c18-8595-2e06bd63655e', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${dir}/02_tank_layout.png`, fullPage: true });
    console.log('02: Tank layout OK');
  } catch(e) { console.log('02: FAILED -', e.message); }

  // 03: Profile achievements
  try {
    await page.goto('http://localhost:3001/profile', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/03_profile.png`, fullPage: true });
    console.log('03: Profile OK');
  } catch(e) { console.log('03: FAILED -', e.message); }

  // 04: Stats
  try {
    await page.goto('http://localhost:3001/stats', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/04_stats.png`, fullPage: true });
    console.log('04: Stats OK');
  } catch(e) { console.log('04: FAILED -', e.message); }

  // 05: Tanks list
  try {
    await page.goto('http://localhost:3001/tanks', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/05_tanks_list.png`, fullPage: true });
    console.log('05: Tanks list OK');
  } catch(e) { console.log('05: FAILED -', e.message); }

  // 06: Species page
  try {
    await page.goto('http://localhost:3001/species', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/06_species.png`, fullPage: true });
    console.log('06: Species OK');
  } catch(e) { console.log('06: FAILED -', e.message); }

  await browser.close();
  console.log('Done');
})();
