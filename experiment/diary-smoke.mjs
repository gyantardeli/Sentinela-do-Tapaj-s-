import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const base="https://sentinela-eggs-preview.gyantardeli.workers.dev";
const page=await browser.newPage({viewport:{width:1200,height:880}});
try{
  for(const path of ["/?egg=guardiao","/?tab=diario"]){
    await page.goto(base+path,{waitUntil:"domcontentloaded"});
    await page.waitForTimeout(1900);
    const a=await page.evaluate(()=>{
      const name=new URLSearchParams(location.search).get("tab")||new URLSearchParams(location.search).get("egg");
      const root=document.querySelector("#st-eggs-root");
      const panel=document.querySelector("#st-diary-tab-panel");
      const dia=document.querySelector(".st-egg-dialog");
      const btn=document.querySelector(".st-diary-tab-return");
      const body=[...document.body.children].map(n=>({tag:n.tagName,id:n.id,cls:n.className,children:n.children.length,z:getComputedStyle(n).zIndex,pos:getComputedStyle(n).position})).slice(0,12);
      function rect(n){if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}
      function topEl(n){if(!n)return null;const r=n.getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {tag:e?.tagName,id:e?.id,cls:typeof e?.className==="string"?e?.className:"",desc:e?.outerHTML.slice(0,150)};}
      const cssLinks=[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>({href:l.href,loaded:!!l.sheet,disabled:l.disabled,media:l.media}));
      const overlayScript=document.querySelector('script[src*="/__egg/overlay.js"]')?.outerHTML;
      const cssResources=performance.getEntriesByType("resource").filter(x=>x.name.includes("/__egg/")).map(x=>({name:x.name,transferSize:x.transferSize}));
      return {name,body,root:!!root,rootIsConnected:root?.isConnected,cssLinks,overlayScript,cssResources,dialog:!!dia,dialogCss:dia?{z:getComputedStyle(dia).zIndex,display:getComputedStyle(dia).display,rect:rect(dia)}:null,panel:!!panel,panelCss:panel?{z:getComputedStyle(panel).zIndex,position:getComputedStyle(panel).position,display:getComputedStyle(panel).display,rect:rect(panel)}:null,button:!!btn,buttonRect:rect(btn),buttonTop:topEl(btn),iframe:!!document.querySelector(".st-diary-tab-frame")};
    });
    console.log("DIAG",JSON.stringify(a));
    if(path.includes("diario")){
      await page.screenshot({path:"/tmp/tab-diag.png"});
      try{await page.locator(".st-diary-tab-return").click({timeout:4000});console.log("RETURN CLICK OK");}
      catch(e){console.log("RETURN CLICK FAIL",e.message.slice(0,1200));}
    }
  }
}finally{await browser.close();}
