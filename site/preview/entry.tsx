import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "../app/dashboard-refresh.css";
import "../app/fire-replay.css";
import "../app/branding.css";
import "../app/history-map.css";
import "../app/weather-map.css";
import "../app/purpleair.css";
import "../app/air-quality-map.css";
import "../app/simplified.css";

declare global { interface Window { SENTINELA_TEST_DATA: { capturedAt:number; responses:Record<string,unknown>; commonFires:unknown[] }; } }
const data = window.SENTINELA_TEST_DATA;
const originalFetch = window.fetch.bind(window);
function key(url:string) {const u=new URL(url,"https://preview.invalid");u.searchParams.sort();return u.pathname+u.search;}
const responses = new Map(Object.entries(data.responses).map(([k,v])=>[key(k),v]));
window.fetch = async (input:RequestInfo|URL,init?:RequestInit) => {
  const raw=typeof input==="string"?input:input instanceof URL?input.href:input.url;
  const u=new URL(raw,"https://preview.invalid");
  if(raw.startsWith("/api/")||u.pathname.startsWith("/api/")) {
    if((init?.method??(input instanceof Request?input.method:"GET")).toUpperCase()!=="GET") return Response.json({error:"Ações no servidor desabilitadas nesta cópia de teste."},{status:403});
    const snapshot=responses.get(key(raw));
    if(snapshot&&typeof snapshot==="object"&&!(snapshot as {error?:string}).error) {
      const value=structuredClone(snapshot) as Record<string,unknown>;
      if(u.pathname==="/api/dashboard"&&value.firesRef===true) {value.fires=data.commonFires;delete value.firesRef;}
      return Response.json(value);
    }
    return Response.json({error:"Esta consulta não foi capturada no arquivo de teste. Nenhum dado foi inventado. Os demais controles permanecem disponíveis."},{status:503});
  }
  return originalFetch(input,init);
};
const when=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Fortaleza",dateStyle:"short",timeStyle:"short"}).format(data.capturedAt*1000);
document.title="Sentinela Tapajós · Teste do mapa único";
createRoot(document.getElementById("root")!).render(<><div className="test-preview-banner"><strong>VERSÃO DE TESTE · NÃO PUBLICADA</strong><span>Cópia capturada em {when} · UTC−3. Os indicadores usam essa referência, sem atualização ao vivo. Mapas externos precisam de internet.</span></div><Home previewTime={data.capturedAt}/></>);
