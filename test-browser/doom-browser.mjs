// Smoke test em Chromium real (headless) com CDN do js-dos online.
// Executar em GitHub Actions, onde é possível instalar Playwright e acessar a internet.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 18947;
const root = new URL('../', import.meta.url).pathname;
const dataDir = await mkdtemp(join(tmpdir(), 'sentinela-browser-doom-'));
await mkdir('artifacts', { recursive: true });
const server = spawn(process.execPath, ['server.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, ENABLE_AUTO_COLLECT: '0' },
  stdio: ['ignore','pipe','pipe']
});
let browser;
try {
  let available = false;
  for (let i = 0; i < 75; i++) {
    try { const result = await fetch('http://127.0.0.1:' + port + '/doom'); if (result.ok) { available = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  if (!available) throw new Error('Servidor local não iniciou');
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--enable-webgl', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  const failures=[];
  page.on('pageerror', e => failures.push('pageerror: ' + e.message));
  page.on('requestfailed', request => failures.push('network: ' + request.url() + ' :: ' + request.failure()?.errorText));
  page.on('console', msg => { if (msg.type()==='error') failures.push('console: ' + msg.text()); });
  await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded' });
  const tap = page.locator('#sentinela-symbol');
  for (let i=0;i<5;i++) await tap.click();
  await page.waitForURL('**/doom');
  if ((await page.title()) !== 'DOOM · Sentinela Tapajós') throw Error('Título incorreto');
  const status = page.locator('#gameStatus');
  if (!(await status.innerText()).includes('só será carregado')) throw Error('Módulo carregou sem consentimento');
  await page.locator('#startDoom').click();
  try {
    await page.waitForFunction(() => document.querySelector('#gameStatus')?.textContent?.includes('DOOM iniciado'), null, { timeout: 100000 });
  } catch (error) {
    const state = await status.innerText();
    throw Error('DOOM não iniciou em Chromium: '+state+' | '+ failures.slice(-12).join(' | ')+' | '+error.message);
  }
  await page.waitForTimeout(2500);
  const canvas = await page.locator('#dos canvas').count();
  if (!canvas) throw Error('Nenhum canvas foi criado após ci-ready');
  await page.screenshot({ path: 'artifacts/doom-desktop.png', fullPage: true });
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Control');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'artifacts/doom-layout-mobile.png', fullPage: true });
  await page.locator('#stopDoom').click();
  if (!(await status.innerText()).includes('Jogo encerrado')) throw Error('Encerramento do emulador falhou');
  await page.locator('a.back').click();
  await page.waitForURL('http://127.0.0.1:' + port + '/');
  if (!(await page.locator('#sentinela-symbol').count())) throw Error('Painel não foi restaurado');
  console.log('PASS: Chromium executou DOOM até ci-ready, recebeu comandos, alternou viewport, encerrou emulador e retornou ao painel.');
  if (failures.length) console.log('AVISOS browser:', failures.slice(-20).join(' | '));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await rm(dataDir, { recursive: true, force: true });
}
