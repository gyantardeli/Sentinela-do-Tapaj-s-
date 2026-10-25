import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const BASE="https://sentinela-eggs-preview.gyantardeli.workers.dev";
const ORIGINAL="https://sentinela-tapajos-ar.gyantardeli.chatgpt.site";
const IDS=["guardiao","floresta","diario","criador"];
const report={at:new Date().toISOString(),base:BASE,passed:[],failed:[],warnings:[],environment:{}};
await mkdir("artifacts/eggs-preview",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--enable-unsafe-swiftshader"]});
const context=await browser.newContext({viewport:{width:1200,height:880},serviceWorkers:"block"});
const browserErrors=[];
let page;
async function check(name,task) {
  try{await task();report.passed.push(name);console.log("PASS: "+name);}
  catch(err){report.failed.push({name,error:err.message});console.error("FAIL: "+name+" : "+err.message);}
}
try {
  page=await context.newPage();
  page.on("pageerror",e=>browserErrors.push(e.message));
  await check("central lista exatamente quatro experiências",async()=>{
    const r=await page.goto(BASE+"/__egg/test",{waitUntil:"domcontentloaded",timeout:40000});
    assert.equal(r.status(),200);
    for(const id of IDS) assert.equal(await page.locator('a[href="/?egg='+id+'"]').count(),1,id);
    for(const id of ["terminal","tempo"])assert.equal(await page.locator('a[href="/?egg='+id+'"]').count(),0,id);
    await page.screenshot({path:"artifacts/eggs-preview/central-v2.png",fullPage:true});
  });
  await check("espelho ambiental disponível e protegido",async()=>{
    const r=await page.goto(BASE+"/",{waitUntil:"domcontentloaded",timeout:40000});
    assert.equal(r.status(),200);
    assert.equal(r.headers()["x-sentinela-preview"],"easter-eggs-four-v3");
    await page.waitForTimeout(3000);
    const title=await page.title();
    assert.match(title,/Sentinela Tapajós/i);
    report.environment={title,h1:await page.locator("h1").allInnerTexts(),mapElements:await page.locator('canvas,iframe,[class*="map"],[id*="map"]').count(),scriptInjected:await page.locator('script[src="/__egg/overlay.js"]').count()};
    assert.ok(report.environment.mapElements>0,"faltaram elementos cartográficos");
    assert.equal(report.environment.scriptInjected,1);
    assert.equal(await page.locator(".st-egg-dialog").count(),0);
    await page.screenshot({path:"artifacts/eggs-preview/painel-v2.png",fullPage:true});
    const possibleHarpy=await page.evaluate(()=>{
      const nodes=[...document.querySelectorAll('img,svg,[title],[aria-label],[class*="harp"],[id*="harp"],[class*="brand"],[class*="logo"]')];
      return nodes.map((e,i)=>({i,tag:e.tagName,id:e.id||null,cls:typeof e.className==="string"?e.className.slice(0,140):"",alt:e.getAttribute("alt"),title:e.getAttribute("title"),aria:e.getAttribute("aria-label"),src:e.getAttribute("src"),text:(e.innerText||e.textContent||"").replace(/\\s+/g," ").slice(0,100)})).filter(x=>/harp|sentinela|logo|brand|ST|ave|guard/i.test(JSON.stringify(x))).slice(0,55);
    });
    console.log("POSSIBLE HARPY DOM:",JSON.stringify(possibleHarpy));
    report.environment.possibleHarpy=possibleHarpy;
  });
  for(const id of IDS){
    await check(id+" abre e fecha no painel espelhado",async()=>{
      const r=await page.goto(BASE+"/?egg="+id,{waitUntil:"domcontentloaded",timeout:40000});
      assert.equal(r.status(),200);
      await page.locator(".st-egg-dialog").waitFor({timeout:15000});
      assert.equal(await page.locator("h1").count()>0,true);
      assert.equal(await page.locator(".st-egg-dialog").count(),1);
      await page.screenshot({path:"artifacts/eggs-preview/"+id+"-v2.png",fullPage:false});
      if(id==="guardiao"){
        const scene=page.locator(".st-egg-guardian");
        assert.equal(await scene.count(),1);
        assert.ok(await scene.locator(".st-egg-guardian-face").count());
        const effect=await scene.locator(".st-egg-eyes").evaluate(n=>({
          running:n.getAnimations().length,
          animationNames:n.getAnimations().map(a=>a.constructor.name),
          reduced:matchMedia("(prefers-reduced-motion: reduce)").matches
        }));
        assert.ok(effect.running>0||effect.reduced,"nenhuma animação Web Animations API ativa");
        await page.waitForTimeout(2500);
        const opacity=await scene.locator(".st-egg-eyes").evaluate(n=>getComputedStyle(n).opacity);
        assert.ok(Number(opacity)>0,"olhos não ganharam visibilidade: "+opacity);
        await page.locator("button.st-egg-action").click();
        assert.match(await page.locator('[role="status"]').last().innerText(),/reiniciada/);
        await page.screenshot({path:"artifacts/eggs-preview/guardiao-repetir.png"});
      }
      if(id==="floresta"){
        const synth=page.locator(".st-egg-action").first();
        const video=page.locator(".st-egg-youtube");
        await synth.click();
        assert.match(await page.locator('[role="status"]').last().innerText(),/execução|Falha/i);
        await video.click();
        const frame=page.locator(".st-egg-media-slot iframe");
        assert.equal(await frame.count(),1);
        assert.match(await frame.getAttribute("src"),/youtube-nocookie\.com\/embed\/DNwvIQEXHP4/);
        assert.equal(await page.locator('a[href="https://www.youtube.com/watch?v=DNwvIQEXHP4"]').count(),1);
        await page.screenshot({path:"artifacts/eggs-preview/floresta-youtube.png",fullPage:false});
        await video.click();
        assert.equal(await frame.count(),0);
      }
      if(id==="diario"){
        assert.equal(await page.locator(".st-egg-diary-entry").count(),4);
        assert.equal(await page.locator('.st-egg-diary-entry a[href^="https://"]').count(),4);
        assert.match(await page.locator(".st-egg-diary-index").innerText(),/1875/);
        await page.locator(".st-egg-diary-entry").nth(2).locator("summary").click();
      }
      if(id==="criador"){
        const letter=page.locator(".st-egg-creator-letter");
        const value=await letter.innerText();
        for(const text of [
          "UMA MENSAGEM DO CRIADOR",
          "Registro reservado — Sentinela Tapajós",
          "Há lugares no mundo que não precisam de mais olhos. Precisam de pessoas que realmente enxerguem.",
          "A Amazônia respira, muda, sofre e resiste.",
          "O Sentinela nasceu de uma ideia simples:",
          "Este projeto não foi criado apenas para reunir mapas, satélites e informações.",
          "A tecnologia pode ampliar nossa visão.",
          "Se você encontrou esta mensagem, descobriu algo que não aparece nos mapas:",
          "O verdadeiro Sentinela não é o sistema. É quem está diante dele.",
          "Continue observando.",
          "A floresta ainda tem muito a nos contar.",
          "— O Criador",
          "SENTINELA TAPAJÓS",
          "Vigiar para conhecer. Conhecer para proteger."
        ])assert.ok(value.includes(text),"faltou trecho da carta: "+text);
        assert.equal(await letter.locator(".st-egg-creator-emphasis").count(),1);
      }
      await page.locator(".st-egg-close").click();
      assert.equal(await page.locator(".st-egg-dialog").count(),0);
    });
  }
  await check("atalho 7 toques no símbolo revela Guardião",async()=>{
    await page.goto(BASE+"/",{waitUntil:"domcontentloaded",timeout:40000});
    await page.waitForTimeout(1000);
    const logo=page.locator("#sentinela-symbol,.brand-mark").first();
    assert.ok(await logo.count(),"símbolo ST indisponível");
    for(let n=0;n<7;n++)await logo.dispatchEvent("click");
    await page.locator(".st-egg-dialog").waitFor({timeout:6000});
    assert.match(await page.locator("#st-egg-heading").innerText(),/Despertar do Sentinela/);
  });
  await check("opções antigas não reabrem via query",async()=>{
    await page.goto(BASE+"/?egg=terminal",{waitUntil:"domcontentloaded",timeout:40000});
    await page.waitForTimeout(850);
    assert.equal(await page.locator(".st-egg-dialog").count(),0);
    await page.goto(BASE+"/?egg=tempo",{waitUntil:"domcontentloaded",timeout:40000});
    await page.waitForTimeout(850);
    assert.equal(await page.locator(".st-egg-dialog").count(),0);
  });
  await check("modal Guardião se ajusta ao celular",async()=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(BASE+"/?egg=guardiao",{waitUntil:"domcontentloaded",timeout:40000});
    await page.locator(".st-egg-dialog").waitFor({timeout:12000});
    await page.screenshot({path:"artifacts/eggs-preview/mobile-v2.png",fullPage:false});
    const width=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(width<=470,"layout excede largura: "+width);
    await page.locator(".st-egg-close").click();
  });
  await check("prévia não aceita POST de gravação",async()=>{
    const r=await page.request.post(BASE+"/api/collect",{data:{}});
    assert.equal(r.status(),405);
  });
  await check("publicação original preservada",async()=>{
    const r=await page.request.get(ORIGINAL+"/");
    assert.equal(r.status(),200);
    assert.ok(!(await r.text()).includes("/__egg/overlay.js"));
  });
  report.warnings=browserErrors.slice(0,24);
}finally{
  await writeFile("artifacts/eggs-preview/report.json",JSON.stringify(report,null,2));
  await browser.close();
  console.log(JSON.stringify(report,null,2));
}
if(report.failed.length)process.exitCode=1;
