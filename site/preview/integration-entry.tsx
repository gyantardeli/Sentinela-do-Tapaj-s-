import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import "../app/dashboard-refresh.css";
import "../app/fire-replay.css";
import "../app/branding.css";
import "../app/history-map.css";
import "../app/weather-map.css";
import "../app/purpleair.css";
import "../app/air-quality-map.css";
import "../app/forest-theme.css";
import Home from "../app/page";
import Support from "../app/apoie/page";

// This downloadable review contains no snapshots or access to production APIs.
const originalFetch = window.fetch.bind(window);
window.fetch = async (input:RequestInfo|URL,init?:RequestInit) => {
  const raw=typeof input==="string"?input:input instanceof URL?input.href:input.url;
  const url=new URL(raw,"https://preview.invalid");
  if(url.pathname.startsWith("/api/")) return Response.json({error:"Prévia de interface sem consulta ao servidor; nenhum dado ambiental foi incluído."},{status:503});
  return originalFetch(input,init);
};
function Preview() {
  const [support,setSupport]=useState(false);
  useEffect(()=>{
    const click=(event:MouseEvent)=>{
      const anchor=event.target instanceof Element?event.target.closest("a"):null;
      if(anchor?.getAttribute("href")==="/apoie") {event.preventDefault();setSupport(true);window.scrollTo(0,0);}
      else if(anchor?.getAttribute("href")==="/") {event.preventDefault();setSupport(false);window.scrollTo(0,0);}
    };
    document.addEventListener("click",click);
    return()=>document.removeEventListener("click",click);
  },[]);
  return <><div className="integration-preview-banner"><strong>PRÉVIA NÃO PUBLICADA · 25/10/2026</strong><span>Abas anteriores restauradas · sem dados ambientais ao vivo · mapas e vídeos externos exigem internet · Pix desativado.</span></div>{support?<Support/>:<Home previewTime={1792944000}/>}</>;
}
createRoot(document.getElementById("root")!).render(<Preview/>);
