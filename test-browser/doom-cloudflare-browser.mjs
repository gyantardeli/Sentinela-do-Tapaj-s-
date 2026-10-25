import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const ORIGIN = 'https://sentinela-doom-playtest.gyantardeli.workers.dev';
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];
try {
  await mkdir('artifacts/playtest', {recursive:true});
  const page=await browser.newPage({viewport:{width:1280,height:860},serviceWorkers:'block'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
  const response=await page.goto(ORIGIN+'/', {waitUntil:'domcontentloaded',timeout:35000});
  if (response?.status()!==200) throw Error('Home status '+response?.status());
  if (!(await page.title()).includes('Sentinela Tapajós'))throw Error('Título da prévia inválido');
  const st=page.locator('#sentinela-symbol');
  if (!(await st.count()))throw Error('Atalho ST não encontrado');
  for(let i=0;i<5;i++)await st.click();
  await page.waitForURL(ORIGIN+'/doom', {timeout:10000});
  if (!(await page.locator('#startDoom').count()))throw Error('Botão iniciar ausente');
  const init=await page.locator('#gameStatus').innerText();
  if (!init.includes('só será carregado'))throw Error('A edição iniciou sem interação');
  await page.locator('#startDoom').click();
  await page.waitForFunction(() => document.querySelector('#gameStatus')?.textContent?.includes('DOOM iniciado'),null,{timeout:105000});
  if (!(await page.locator('#dos canvas').count()))throw Error('Canvas não aparece');
  await page.screenshot({path:'artifacts/playtest/doom-desktop.png',fullPage:true});
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Control');
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(1300);
  await page.screenshot({path:'artifacts/playtest/doom-mobile.png',fullPage:true});
  await page.locator('#stopDoom').click();
  await page.waitForFunction(()=>document.querySelector('#gameStatus')?.textContent?.includes('Jogo encerrado'),null,{timeout:20000});
  await page.locator('.back').click();
  await page.waitForURL(ORIGIN+'/',{timeout:10000});
  console.log('PASS: prévia da Cloudflare abriu, desbloqueio ST, inicialização shareware, canvas, teclado, viewport mobile, parada e retorno.');
  if(errors.length)console.log('WARN: '+errors.slice(-10).join(' | '));
} catch (err) {
  console.error('FAIL: '+err.message);
  console.error('Browser errors: '+errors.slice(-15).join(' | '));
  throw err;
} finally {await browser.close();}
