import { createInterface } from "node:readline";
import { execFileSync } from "node:child_process";
/*__RADAR_MODULES__*/
const cache = {};
function require(name) { if (cache[name]) return cache[name].exports; const module = { exports: {} }; cache[name] = module; if (!definitions[name]) throw new Error("Unknown bundled module."); definitions[name](module, module.exports, require); return module.exports; }
const EXPECTED_ORIGIN = "https://sentinela-tapajos-ar.gyantardeli.chatgpt.site";
const REVISION = "radar-tapajos-v5";
async function main() {
  if (process.stdin.isTTY) { try { execFileSync("stty", ["-echo"], { stdio: ["inherit", "ignore", "ignore"] }); } catch { throw new Error("Cannot hide stdin; use a private pipe."); } }
  console.log("Ready for Site access JSON on stdin (input is hidden).");
  const readline = createInterface({ input: process.stdin, terminal: false });
  const input = await new Promise(resolve => readline.once("line", resolve)); readline.close(); process.stdin.pause();
  const access = JSON.parse(input);
  if (access.url?.replace(/\/$/, "") !== EXPECTED_ORIGIN || typeof access.token !== "string" || !access.token || (access.scope && !["environment", "history"].includes(access.scope)) || (access.historyDays && ![7,30].includes(access.historyDays))) throw new Error("Site access or collector scope is invalid.");
  const collectedAt = Math.floor(Date.now() / 1000), runId = crypto.randomUUID();
  const headers = { "OAI-Sites-Authorization": "Bearer " + access.token, "X-Sentinela-Service-Token": access.token, "Content-Type": "application/json", Accept: "application/json" };
  async function siteJson(path, body) {
    const response = await fetch(EXPECTED_ORIGIN + path, { method: body ? "POST" : "GET", redirect: "error", headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(path + " returned HTTP " + response.status);
    return response.json();
  }
  async function refreshHistory() {
    const { HISTORY_REVISION, utcDay } = require("./monitoring");
    const { collectFireDay, collectAirArchive } = require("./history-collector");
    await siteJson("/api/history/ingest", { revision: HISTORY_REVISION, kind: "bootstrap", collectedAt });
    const before = await siteJson("/api/history/status"), errors = [], written = [], current = [];
    const dates = Array.from({ length: 31 }, (_, i) => utcDay(collectedAt - i * 86400));
    const present = new Set(before.fireDays.map(d => d.dayUtc));
    const wanted = access.historyDays ? dates.slice(0, access.historyDays + 1) : [...new Set([...dates.slice(0,3), ...dates.slice(3).filter(d => !present.has(d)).slice(0,2)])];
    for (let offset = 0; offset < wanted.length; offset += 3) {
      const results = await Promise.allSettled(wanted.slice(offset,offset+3).map(day => collectFireDay(day,collectedAt)));
      for (let i=0;i<results.length;i++) {
        const result=results[i], day=wanted[offset+i];
        if (result.status === "rejected") { errors.push({source:"inpe",day,error:result.reason instanceof Error ? result.reason.message : "Collection failed"}); continue; }
        const saved=await siteJson("/api/history/ingest",result.value);
        if (!saved.success || saved.dayUtc !== day || saved.parts !== 64) throw new Error("INPE daily writer did not confirm " + day);
        written.push(day); if (dates.slice(0,2).includes(day)) current.push(result.value);
        console.log(JSON.stringify({stage:"history_day_saved",dayUtc:day,closed:result.value.closed,parts:saved.parts}));
      }
    }
    // Detailed INPE health belongs to /api/fires/ingest. Archive failures must
    // not overwrite that attempt's diagnostics or replace its 24h snapshot.
    let archive=null;
    const needsAir=access.historyDays || before.air.length !== 8 || before.air.some(l=>l.first_at > collectedAt - 30*86400);
    if (needsAir) {
      try { archive=await collectAirArchive(collectedAt); }
      catch(error) { errors.push({source:"air-archive",error:error instanceof Error ? error.message : "Model archive failed"}); }
      if (archive) { const saved=await siteJson("/api/history/ingest",archive); if(!saved.success)throw new Error("Model archive writer failed."); console.log(JSON.stringify({stage:"model_archive_saved",places:archive.locations.length,samples:archive.locations.reduce((n,l)=>n+l.points.length,0)})); }
    }
    const after=await siteJson("/api/history/status");
    for (const day of written) if(!after.fireDays.some(d=>d.dayUtc === day && d.collectedAt >= collectedAt)) throw new Error("INPE archive readback failed: " + day);
    if(archive) for(const l of archive.locations) if(!after.air.some(a=>a.place_id === l.placeId && a.samples >= l.points.length)) throw new Error("Model archive readback failed.");
    return {verified:after.fireDays.length>0 || after.air.length === 8,partial:errors.length>0,fireDaysStored:after.fireDays.length,fireDaysWritten:written.length,modelPlaces:after.air.length,modelImportedAt:after.modelImportedAt,errors};
  }
  const [environmentResult, radarResult, historyResult,fireResult] = await Promise.allSettled([
    access.scope === "history" ? Promise.resolve(null) : require("./environment-provider").collectEnvironment(collectedAt),
    access.scope ? Promise.resolve(null) : require("./radar-collector").collectAllSources(collectedAt),
    access.scope === "environment" ? Promise.resolve(null) : refreshHistory(),
    access.scope === "history" ? Promise.resolve(null) : require("./fire-snapshot").collectFirePacket(collectedAt),
  ]);
  let inpe={verified:access.scope==="history",skipped:access.scope==="history"};
  if(access.scope!=="history")try{
    if(fireResult.status!=="fulfilled"||!fireResult.value)throw new Error("INPE collection failed before diagnostics.");
    const saved=await siteJson("/api/fires/ingest",fireResult.value),readback=await siteJson("/api/fires");
    if(!saved.success||saved.ultimaTentativa<collectedAt||readback.ultimaTentativa!==saved.ultimaTentativa||readback.ultimaAtualizacao!==saved.ultimaAtualizacao||readback.totalFocosEmCache!==saved.totalFocosEmCache)throw new Error("INPE snapshot readback does not match the saved attempt.");
    inpe={verified:true,partial:readback.parcial,diagnostics:readback};
    console.log(JSON.stringify({stage:"inpe_snapshot_saved",...inpe}));
  }catch(error){inpe={verified:false,error:error instanceof Error?error.message:"INPE writer failed."};}
  let environment = { verified: access.scope === "history", skipped: access.scope === "history", errors: {} };
  if(access.scope !== "history") try {
    if (environmentResult.status !== "fulfilled" || !environmentResult.value) throw new Error("Environmental collection failed.");
    const packet = environmentResult.value;
    const saved = await siteJson("/api/environment/ingest", packet);
    if (!saved.success) throw new Error("Environmental writer did not confirm the collection.");
    if (!packet.air && !packet.weather) { environment.errors = packet.failures; throw new Error("Neither environmental source responded; failures recorded."); }
    const readback = await siteJson("/api/environment");
    for (const source of ["air", "weather"]) if (packet[source] && (readback[source]?.attemptedAt < collectedAt || readback[source]?.places < packet[source].length)) throw new Error("Environmental readback does not match the collection.");
    environment = { verified: true, partial: !packet.air || !packet.weather || packet.air.length !== 8 || packet.weather.length !== 8 || Object.keys(readback.air?.failures ?? {}).length > 0 || Object.keys(readback.weather?.failures ?? {}).length > 0, sources: readback, errors: packet.failures };
    console.log(JSON.stringify({ stage: "environment_saved", ...environment }));
  } catch (error) { environment = { ...environment, error: error instanceof Error ? error.message : "Environmental update failed." }; }
  let radar = null;
  if (!access.scope) {
    if (radarResult.status !== "fulfilled" || !radarResult.value) throw new Error("Radar collection failed.");
    const result = radarResult.value;
    const saved = await siteJson("/api/radar/ingest", { revision: REVISION, runId, collectedAt, ...result });
    if (!saved.success || saved.run?.id !== runId) throw new Error("Site did not confirm the Radar collection.");
    const readback = await siteJson("/api/radar");
    if (readback.run?.id !== runId || readback.sources?.length !== 20) throw new Error("Radar readback does not match the collection.");
    radar = { run: readback.run, storedItems: readback.items.length, sources: readback.sources.map(s => ({ id: s.sourceId, status: s.status, accepted: s.accepted })) };
  }
  const history=historyResult.status === "fulfilled" ? historyResult.value : {verified:false,error:historyResult.reason instanceof Error ? historyResult.reason.message : "History failed"};
  const alertWrite=await siteJson("/api/alerts",{action:"evaluate"});
  const alertReadback=await siteJson("/api/alerts");
  const alerts={verified:alertWrite.success===true && (alertWrite.evaluation.enabled===0 || alertReadback.evaluatedAt>=alertWrite.evaluation.evaluatedAt),enabled:alertWrite.evaluation.enabled,created:alertWrite.evaluation.created,evaluatedAt:alertReadback.evaluatedAt};
  if(!alerts.verified)throw new Error("In-panel alert readback failed.");
  const verified=alerts.verified && inpe.verified && environment.verified && (access.scope === "environment" || history?.verified === true);
  console.log(JSON.stringify({ revision: REVISION, verified, environment,inpe,history,alerts,...(radar ?? {}) }));
  if (!verified) process.exitCode = 1;
}
main().catch(error => { console.error(JSON.stringify({ verified: false, error: error instanceof Error ? error.message : "Collector failed." })); process.exitCode = 1; });
