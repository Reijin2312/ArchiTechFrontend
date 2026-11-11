import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const HEAD = process.env.HEAD_URL ?? 'http://127.0.0.1:4174';
const OUTPUT = 'artifacts/visual-parity';
const routes = [
  '/', '/rules', '/wiki', '/start', '/contacts', '/about',
  '/terms', '/privacy', '/auth/login', '/auth/register', '/chat',
  '/u/ExamplePlayer', '/u/ExamplePlayer/skins', '/settings/profile',
];
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const threshold = Number(process.env.MAX_DIFFERING_PIXEL_FRACTION ?? 0.035);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
await fs.mkdir(OUTPUT, { recursive: true });
const stableCss = [
  '*,*::before,*::after {',
  'animation: none !important;',
  'transition: none !important;',
  'caret-color: transparent !important;',
  'scroll-behavior: auto !important;',
  '}',
  'canvas,video { visibility: hidden !important; }',
].join(' ');

async function screenshot(origin, route, viewport, label, selector = null) {
  const context = await browser.newContext({
    viewport, deviceScaleFactor: 1, reducedMotion: 'reduce',
    colorScheme: 'dark', locale: 'ru-RU',
  });
  const page = await context.newPage();
  await page.route('**/api/**', async request => {
    await request.fulfill({
      status: 401, contentType: 'application/json',
      body: JSON.stringify({ error: 'unauthorized' }),
    });
  });
  await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.addStyleTag({ content: stableCss });
  await page.evaluate(async () => {
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 5000))]);
  });
  await page.waitForTimeout(900);
  const filename = path.join(OUTPUT, label);
  const png = selector
    ? await page.locator(selector).first().screenshot({ animations: 'disabled', timeout: 15000 })
    : await page.screenshot({ animations: 'disabled' });
  await fs.writeFile(filename, png);
  const state = await page.evaluate(() => ({
    title: document.title,
    text: (document.querySelector('h1')?.textContent ?? '').trim().slice(0, 150),
    body: document.body.textContent?.slice(0, 60) ?? '',
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
  }));
  await context.close();
  return { png, state };
}

async function diffImage(a, b) {
  const [first, second] = await Promise.all([
    sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const x = first.data, y = second.data, i = first.info, j = second.info;
  if (i.width !== j.width || i.height !== j.height) {
    throw new Error('Viewport mismatch: ' + i.width + 'x' + i.height + ' / ' + j.width + 'x' + j.height);
  }
  let differing = 0;
  const pixels = i.width * i.height;
  for (let k = 0; k < x.length; k += 4) {
    const delta = Math.max(Math.abs(x[k] - y[k]), Math.abs(x[k + 1] - y[k + 1]), Math.abs(x[k + 2] - y[k + 2]));
    if (delta > 18) differing++;
  }
  return differing / pixels;
}

try {
  for (const viewport of viewports) {
    for (const route of routes) {
      const filename = (route === '/' ? 'home' : route.slice(1).replaceAll('/', '_')) + '-' + viewport.width;
      try {
        const a = await screenshot(BASE, route, viewport, filename + '-before.png');
        const b = await screenshot(HEAD, route, viewport, filename + '-after.png');
        const difference = await diffImage(a.png, b.png);
        const matchingPage = a.state.text === b.state.text;
        const record = {
          route, viewport: viewport.width, differentPixelFraction: Number(difference.toFixed(5)),
          matchingPage, baseline: a.state, refactor: b.state,
        };
        results.push(record);
        console.log(
          (difference > threshold ? 'DIFF ' : 'PASS ') +
          route.padEnd(26) + ' ' + viewport.width + 'px: ' +
          (difference * 100).toFixed(2) + '% changed; matching heading=' + matchingPage
        );
      } catch (error) {
        console.error('ERROR ' + route + ' ' + viewport.width + ': ' + String(error));
        results.push({ route, viewport: viewport.width, error: String(error) });
      }
    }
  }
  // Deep-page coverage: the ranking was refactored from CSS selectors into JSX.
  for (const { name, route, selector } of [
    { name: 'ranking', route: '/', selector: '.at-rank-editorial' },
    { name: 'faq', route: '/', selector: '.at-faq-rows' },
  ]) {
    const filename = 'home-' + name + '-' + viewport.width;
    try {
      const a = await screenshot(BASE, route, viewport, filename + '-before.png', selector);
      const b = await screenshot(HEAD, route, viewport, filename + '-after.png', selector);
      const difference = await diffImage(a.png, b.png);
      const record = {
        route: 'home/' + name, viewport: viewport.width,
        differentPixelFraction: Number(difference.toFixed(5)),
        matchingPage: true, baseline: a.state, refactor: b.state,
      };
      results.push(record);
      console.log((difference > threshold ? 'DIFF ' : 'PASS ') + record.route.padEnd(26) +
        ' ' + viewport.width + 'px: ' + (difference * 100).toFixed(2) + '% changed');
    } catch (error) {
      console.error('ERROR home/' + name + ' ' + viewport.width + ': ' + String(error));
      results.push({ route: 'home/' + name, viewport: viewport.width, error: String(error) });
    }
  }
} finally {
  await browser.close();
}
await fs.writeFile(path.join(OUTPUT, 'report.json'), JSON.stringify(results, null, 2));
const changed = results.filter(x => x.error || !x.matchingPage || x.differentPixelFraction > threshold || x.refactor.horizontalOverflow !== x.baseline.horizontalOverflow);
console.log(
  'Compared ' + results.length + ' route/viewport pairs; ' + changed.length +
  ' need investigation (threshold ' + (threshold * 100).toFixed(1) + '%).'
);
if (changed.length) {
  console.log('Items requiring review:', JSON.stringify(
    changed.map(({ route, viewport, differentPixelFraction, error }) => ({ route, viewport, differentPixelFraction, error })), null, 2));
  process.exitCode = 1;
}
