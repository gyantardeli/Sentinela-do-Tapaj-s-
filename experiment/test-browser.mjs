import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const BASE="https://sentinela-eggs-preview.gyantardeli.workers.dev";
const ORIGINAL="https://sentinela-tapajos-ar.gyantardeli.chatgpt.site";
const report={at:new Date().toISOString(),base:BASE,passed:[],failed:[],warnings:[],environment:{}};
await mkdir("artifacts/eggs-preview",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--enable-unsafe-swiftshader"]});
let browserErrors=[];
const context=await browser.newContext({viewport:{width:1200,height:880},serviceWorkers:"block"});
try{
 const page=await context.newPage();
 page.on("pageerror",e=>browserErrors.push(e.message));
 const check=async(name,fn)=>{
   try{await fn();report.passed.push(name);console.log("PASS: "+name);}
   catch(e){report.failed.push({name,error:e.message});console.error("FAIL: "+name+" : "+e.message);}
 };
 await check("launcher lista cinco experiências",async()=>{
   const r=await page.goto(BASE+"/__egg/test",{waitUntil:"domcontentloaded",timeout:40000});
   assert.equal(r.status(),200);
   for(const k of ["guardiao","floresta","terminal","tempo","criador"])assert.equal(await page.locator('a[href="/?egg='+k+'"]').count(),1);
   await page.screenshot({path:"artifacts/eggs-preview/launcher.png",fullPage:true});
 });
 await check("espelho ambiental mantém origem e renderiza",async()=>{
   const r=await page.goto(BASE+"/",{waitUntil:"domcontentloaded",timeout:40000});
   assert.equal(r.status(),200);
   assert.equal(r.headers()["x-sentinela-preview"],"easter-eggs-five");
   await page.waitForTimeout(4000);
   const title=await page.title();
   assert.match(title,/Sentinela Tapajós/i);
   report.environment={title,h1:await page.locator("h1").allInnerTexts(),maps:await page.locator('canvas,iframe,[class*="map"],[id*="map"]').count(),scriptInjected:await page.locator('script[src="/__egg/overlay.js"]').count(),modalAbsent:await page.locator(".st-egg-dialog").count()===0};
   assert.ok(report.environment.maps>0,"nenhum componente cartográfico");
   assert.equal(report.environment.scriptInjected,1);
   await page.screenshot({path:"artifacts/eggs-preview/environment-desktop.png",fullPage:true});
 });
 for (const type of ["guardiao","floresta","terminal","tempo","criador"]) {
   await check(type+" abre como modal sem sair do painel",async()=>{
     const r=await page.goto(BASE+"/?egg="+type,{waitUntil:"domcontentloaded",timeout:40000});
     assert.equal(r.status(),200);
     await page.locator(".st-egg-dialog").waitFor({timeout:12000});
     assert.equal(await page.locator(".st-egg-dialog").count(),1);
     assert.equal(await page.locator("h1").count()>0,true);
     assert.equal(await page.locator(".st-egg-close").count(),1);
     await page.screenshot({path:"artifacts/eggs-preview/"+type+"-desktop.png",fullPage:false});
     if(type==="floresta"){
       const play=page.locator(".st-egg-action");
       await play.click();
       await page.waitForTimeout(700);
       assert.match(await page.locator('[role="status"]').last().innerText(),/execução|possível/i);
       if((await play.innerText()).includes("Parar"))await play.click();
     }
     if(type==="terminal"){
       await page.locator(".st-egg-console-form input").fill("AJUDA");
       await page.locator(".st-egg-console-form button").click();
       assert.match(await page.locator(".st-egg-console").innerText(),/FLORESTA/);
     }
     if(type==="tempo"){
       const slider=page.locator('.st-egg-year-control input').first();
       await slider.fill("1995");
       assert.match(await page.locator('.st-egg-actions a').first().getAttribute("href"),/activeYear=1995/);
     }
     await page.locator(".st-egg-close").click();
     assert.equal(await page.locator(".st-egg-dialog").count(),0);
   });
 }
 await check("terminal abre digitando SENTINELA",async()=>{
   await page.goto(BASE+"/",{waitUntil:"domcontentloaded",timeout:40000});
   await page.keyboard.type("SENTINELA",{delay:65});
   await page.locator(".st-egg-dialog").waitFor({timeout:15000});
   assert.match(await page.locator("#st-egg-heading").innerText(),/Terminal Secreto/);
 });
 await check("layout mobile e retorno",async()=>{
   await page.setViewportSize({width:390,height:844});
   await page.goto(BASE+"/?egg=guardiao",{waitUntil:"domcontentloaded",timeout:40000});
   await page.locator(".st-egg-dialog").waitFor();
   await page.screenshot({path:"artifacts/eggs-preview/mobile.png"});
   const width=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert.ok(width<470,"layout excede viewport em excesso: "+width);
   await page.locator(".st-egg-close").click();
   assert.equal(await page.locator(".st-egg-dialog").count(),0);
 });
 await check("prévia rejeita mutação POST",async()=>{
   const res=await page.request.post(BASE+"/api/collect",{data:{}});
   assert.equal(res.status(),405);
 });
 await check("site original permanece separado",async()=>{
   const r=await page.request.get(ORIGINAL+"/");
   assert.equal(r.status(),200);
   assert.ok(!(await r.text()).includes("/__egg/overlay.js"));
 });
 report.warnings=browserErrors.slice(0,18);
}finally{
 await writeFile("artifacts/eggs-preview/report.json",JSON.stringify(report,null,2));
 await browser.close();
 console.log(JSON.stringify(report,null,2));
}
if(report.failed.length)process.exitCode=1;