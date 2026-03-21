/**
 * scripts/screenshot.mjs
 *
 * Takes a screenshot of every page in RevTray, saves them to /screenshots,
 * then stitches them all into one composite grid image: _all-pages.png
 *
 * Usage:
 *   node scripts/screenshot.mjs
 *
 * Requirements:
 *   npm install -D @playwright/test sharp
 *   npx playwright install chromium
 *
 * Env vars (PowerShell):
 *   $env:SCREENSHOT_EMAIL="you@email.com"
 *   $env:SCREENSHOT_PASSWORD="yourpassword"
 *   $env:SCREENSHOT_URL="http://localhost:3000"
 *   npm run screenshot
 */

import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Config ─────────────────────────────────────────────────────────────────

const BASE_URL  = process.env.SCREENSHOT_URL      || 'http://localhost:3000';
const EMAIL     = process.env.SCREENSHOT_EMAIL    || '';
const PASSWORD  = process.env.SCREENSHOT_PASSWORD || '';
const OUT_DIR   = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'screenshots');
const VIEWPORT  = { width: 1440, height: 900 };
const COLS      = 2; // screenshots per row in the composite

const PAGES = [
  { name: '01-login',                  path: '/auth/login' },
  { name: '02-register',               path: '/auth/register' },
  { name: '03-dashboard-home',         path: '/dashboard',                           auth: true },
  { name: '04-campaigns',              path: '/dashboard/campaigns',                 auth: true },
  { name: '05-campaign-new',           path: '/dashboard/campaigns/new',             auth: true },
  { name: '06-contacts',               path: '/dashboard/contacts',                  auth: true },
  { name: '07-segments',               path: '/dashboard/segments',                  auth: true },
  { name: '08-automation',             path: '/dashboard/automation',                auth: true },
  { name: '09-templates',              path: '/dashboard/templates',                 auth: true },
  { name: '10-analytics',              path: '/dashboard/analytics',                 auth: true },
  { name: '11-revenue',                path: '/dashboard/revenue',                   auth: true },
  { name: '12-deliverability',         path: '/dashboard/deliverability',            auth: true },
  { name: '13-settings-general',       path: '/dashboard/settings?tab=general',      auth: true },
  { name: '14-settings-billing',       path: '/dashboard/settings?tab=billing',      auth: true },
  { name: '15-settings-integrations',  path: '/dashboard/settings?tab=integrations', auth: true },
  { name: '16-settings-api',           path: '/dashboard/settings?tab=api',          auth: true },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) { process.stdout.write(`  ${msg}\n`); }

async function waitForPage(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(400);
}

// ── Composite builder ────────────────────────────────────────────────────────

async function buildComposite(files) {
  log('Building composite image...');

  const THUMB_W = 720;
  const GAP     = 12;
  const LABEL_H = 28;

  // Resize all screenshots to thumbnail width
  const thumbs = await Promise.all(
    files.map(async ({ name, file }) => {
      const buf   = await readFile(file);
      const img   = sharp(buf);
      const meta  = await img.metadata();
      const ratio = THUMB_W / meta.width;
      const thumbH = Math.round(meta.height * ratio);
      const resized = await img.resize(THUMB_W, thumbH).png().toBuffer();
      return { name, buf: resized, w: THUMB_W, h: thumbH };
    })
  );

  const maxThumbH = Math.max(...thumbs.map(t => t.h));
  const rows      = Math.ceil(thumbs.length / COLS);
  const cellW     = THUMB_W + GAP;
  const cellH     = maxThumbH + LABEL_H + GAP;
  const totalW    = COLS * cellW + GAP;
  const totalH    = rows * cellH + GAP;

  const composites = [];

  for (let i = 0; i < thumbs.length; i++) {
    const thumb = thumbs[i];
    const col   = i % COLS;
    const row   = Math.floor(i / COLS);
    const left  = GAP + col * cellW;
    const top   = GAP + row * cellH;

    composites.push({ input: thumb.buf, left, top });

    // Label underneath each screenshot
    const labelSvg = Buffer.from(
      `<svg width="${THUMB_W}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${THUMB_W}" height="${LABEL_H}" fill="#F7F8FA"/>
        <text x="8" y="19" font-family="sans-serif" font-size="12" fill="#5A6472">${thumb.name}</text>
      </svg>`
    );
    const labelBuf = await sharp(labelSvg).png().toBuffer();
    composites.push({ input: labelBuf, left, top: top + thumb.h });
  }

  const outFile = path.join(OUT_DIR, '_all-pages.png');

  await sharp({
    create: {
      width:      totalW,
      height:     totalH,
      channels:   3,
      background: { r: 247, g: 248, b: 250 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 8 })
    .toFile(outFile);

  const rows2 = Math.ceil(files.length / COLS);
  log(`Composite saved → screenshots/_all-pages.png  (${COLS} cols × ${rows2} rows)\n`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page    = await context.newPage();

  // ── Login ──────────────────────────────────────────────────────────────────

  let loggedIn = false;

  if (EMAIL && PASSWORD) {
    log(`Logging in as ${EMAIL}...`);
    await page.goto(`${BASE_URL}/auth/login`);
    await waitForPage(page);

    const emailToggle = page.getByText('Sign in with email instead');
    if (await emailToggle.isVisible().catch(() => false)) {
      await emailToggle.click();
      await page.waitForTimeout(200);
    }

    const emailInput    = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(EMAIL);
      await passwordInput.fill(PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(`${BASE_URL}/dashboard**`, { timeout: 10_000 }).catch(() => {});
      loggedIn = true;
      log('Logged in.\n');
    }
  } else {
    log('No credentials set — skipping login.\n');
  }

  // ── Screenshot loop ────────────────────────────────────────────────────────

  const captured = [];

  for (const route of PAGES) {
    if (route.auth && !loggedIn) {
      log(`SKIP (not logged in): ${route.name}`);
      continue;
    }
    try {
      process.stdout.write(`  Capturing ${route.name}...`);
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });
      await waitForPage(page);
      const file = path.join(OUT_DIR, `${route.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      captured.push({ name: route.name, file });
      process.stdout.write(` ✓\n`);
    } catch (err) {
      process.stdout.write(` ✗  ${err.message}\n`);
    }
  }

  await browser.close();

  // ── Stitch composite ───────────────────────────────────────────────────────

  if (captured.length > 0) {
    await buildComposite(captured);
  }

  console.log('────────────────────────────────────────────────────────');
  console.log(`  Done!  Upload screenshots/_all-pages.png to Claude.`);
  console.log('────────────────────────────────────────────────────────\n');
}

run().catch((err) => {
  console.error('\nFatal:', err.message);
  if (err.message.includes('sharp')) {
    console.error('  Run: npm install -D sharp');
  }
  process.exit(1);
});
