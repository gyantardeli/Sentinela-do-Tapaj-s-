import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const original = process.env.ORIGINAL_URL || 'https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/';
const target = new URL(original);
if (target.protocol !== 'https:' || target.hostname !== 'sentinela-tapajos-ar.gyantardeli.chatgpt.site') {
  throw Error('Somente o endereço conhecido do site original é permitido.');
}
await mkdir('artifacts/original', { recursive: true });
const record = {
  verifiedAt: new Date().toISOString(),
  target: target.href,
  originalHomepage: { reachable: false },
  doomPage: { reachable: false, gameVerified: false },
  conclusions: [],
  errors: []
};
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }, serviceWorkers: 'block',
    ignoreHTTPSErrors: false
  });
  const page = await context.newPage();
  page.on('pageerror', err => record.errors.push('JS homepage: '+err.message));
  let home;
  try {
    home = await page.goto(target.href, { waitUntil:'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(5000);
    record.originalHomepage = {
      reachable: true,
      status: home?.status() ?? null,
      finalUrl: page.url(),
      title: await page.title(),
      bodyPreview: (await page.locator('body').innerText().catch(()=>'')).slice(0,700),
      brandTexts: await page.locator('h1').allInnerTexts(),
      symbols: await page.locator('#sentinela-symbol, .brand-mark').count(),
      maps: await page.locator('canvas, iframe, [class*="map"], [id*="map"]').count()
    };
    await page.screenshot({path:'artifacts/original/site-home-desktop.png',fullPage:true});
    await page.setViewportSize({ width:390,height:844 });
    await page.screenshot({path:'artifacts/original/site-home-mobile.png',fullPage:true});
    await page.setViewportSize({ width:1280,height:900 });
  } catch (error) {
    record.errors.push('Homepage: ' + error.message);
  }
  if (record.originalHomepage.reachable) {
    const doomPage = await context.newPage();
    doomPage.on('pageerror', err => record.errors.push('JS DOOM: '+err.message));
    try {
      const response = await doomPage.goto(new URL('/doom',target).href, {
        waitUntil: 'domcontentloaded', timeout:35000
      });
      await doomPage.waitForTimeout(2500);
      record.doomPage = {
        reachable: true,
        status: response?.status() ?? null,
        finalUrl: doomPage.url(),
        title: await doomPage.title(),
        startControlPresent: await doomPage.locator('#startDoom').count() > 0,
        gameCanvasPresent: await doomPage.locator('#dos canvas').count()>0,
        bodyPreview: (await doomPage.locator('body').innerText().catch(()=>'')).slice(0,400),
        gameVerified: false
      };
      await doomPage.screenshot({path:'artifacts/original/site-doom-route.png',fullPage:true});
      if (record.doomPage.startControlPresent) {
        await doomPage.locator('#startDoom').click();
        try {
          await doomPage.waitForFunction(() => document.querySelector('#gameStatus')?.textContent?.includes('DOOM iniciado'), null, { timeout:90000 });
          record.doomPage.gameVerified = true;
          record.doomPage.gameCanvasPresent = await doomPage.locator('#dos canvas').count()>0;
          await doomPage.screenshot({path:'artifacts/original/site-doom-playing.png',fullPage:true});
        } catch(error) {
          record.errors.push('DOOM not initialized in original: ' + (await doomPage.locator('#gameStatus').textContent().catch(()=>'')) + ' / '+error.message);
        }
      }
    } catch(error) {
      record.errors.push('DOOM route: ' + error.message);
    } finally { await doomPage.close(); }
  }
  if (!record.originalHomepage.reachable) record.conclusions.push('BLOCKED: o site original não respondeu ao navegador externo.');
  else if (!record.doomPage.gameVerified) record.conclusions.push('NOT_VERIFIED: DOOM não foi executado dentro do site original.');
  else record.conclusions.push('VERIFIED: o DOOM iniciou dentro da URL do site original em Chromium.');
  console.log(JSON.stringify(record,null,2));
} finally {
  await writeFile('artifacts/original/validation.json', JSON.stringify(record,null,2)+'\n');
  await browser.close();
}
if (!record.originalHomepage.reachable) process.exitCode=2;
else if (!record.doomPage.gameVerified) process.exitCode=1;
