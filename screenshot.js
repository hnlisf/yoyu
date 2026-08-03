/**
 * ============================================================================
 * 文件名：screenshot.js（E2E 截图工具，PR 9 清理后）
 * ============================================================================
 * 作用：跑端到端截图——可在 CI / 本地手跑都用
 *
 * PR 9 修复：把 Hermes 硬编码路径（/root/.hermes/...、/snap/bin/chromium）
 *   改成 process.env + 默认本地（./screenshots/）
 *
 * 用法：
 *   SCREENSHOT_DIR=./shots npx playwright screenshot.js
 *   PLAYWRIGHT_BROWSERS_PATH=/usr/lib/playwright node screenshot.js
 *
 * 要求：先 `npm i -D playwright` 然后 `npx playwright install chromium`
 * ============================================================================
 */

const { chromium } = require('playwright');  // PR 9: 用本地 playwright（不再依赖 Hermes 私有 node_modules）
const path = require('node:path');
const fs = require('node:fs');

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || './screenshots';
const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3001';
const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;  // 默认用 playwright 自带

(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,  // undefined 时用 playwright 默认
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  // 6 个关键页面截图
  const targets = [
    { name: '01_home_redirect', url: `${BASE_URL}/?userId=demo-user` },
    { name: '02_tank_layout', url: `${BASE_URL}/tanks/6a3a6b81-...` },
    { name: '03_profile', url: `${BASE_URL}/profile` },
    { name: '04_stats', url: `${BASE_URL}/stats` },
    { name: '05_tanks_list', url: `${BASE_URL}/tanks` },
    { name: '06_species', url: `${BASE_URL}/species` },
  ];

  for (const t of targets) {
    try {
      await page.goto(t.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);
      const file = path.join(SCREENSHOT_DIR, `${t.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${t.name} → ${file}`);
    } catch (e) {
      console.log(`✗ ${t.name} FAILED: ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\n✅ Done. Screenshots in ${SCREENSHOT_DIR}/`);
})();