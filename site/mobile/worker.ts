import { env } from "cloudflare:workers";
import { PLACES, nearestAir, type DashboardData, type SourceState } from "../lib/environment";
import { readEnvironmentCache } from "../lib/environment-store";
import { readFireSnapshot } from "../lib/fire-store";
import { readRadar } from "../lib/radar-store";
import { fireDiagnostics } from "../lib/fire-snapshot";
import { createFieldPacket } from "../lib/field-packet";
import { historyStatus, readHistory, saveHistoryPacket, validateHistoryPacket } from "../lib/monitoring-store";
import { collectFireDay } from "../lib/history-collector";
import { utcDay } from "../lib/monitoring";

export const MOBILE_REVISION = "sentinela-mobile-v1";
const HEADERS = { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Access-Control-Allow-Origin": "*" };
function json(value: unknown, status = 200, seconds = 60) {
  return new Response(JSON.stringify(value), { status, headers: { ...HEADERS, "Cache-Control": status === 200 ? `public, max-age=${seconds}` : "no-store" } });
}
export async function mobileSnapshot(placeId: string, now = Math.floor(Date.now() / 1000)) {
  const place = PLACES.find(p => p.id === placeId);
  if (!place) throw new Error("Município não atendido nesta beta.");
  const [cache, fire, radar] = await Promise.all([readEnvironmentCache(), readFireSnapshot(), readRadar()]);
  const air = cache.air?.locations.find(l => l.placeId === place.id);
  const weather = cache.weather?.locations.find(l => l.placeId === place.id);
  const latestAir = nearestAir(air?.points ?? [], now);
  const diagnostic = fireDiagnostics(fire, now);
  const source = (kind: "air" | "weather", time: number | null): SourceState => {
    const part = cache[kind], location = part?.locations.find(l => l.placeId === place.id);
    const collectedAt = location?.collectedAt ?? part?.collectedAt ?? null;
    const stale = !collectedAt || now - collectedAt > 7200 || !time || Math.abs(now - time) > 7200;
    const failed = !!part?.failures?.[place.id];
    return { id: kind, name: kind === "air" ? "CAMS / Open-Meteo · estimativa regional" : "Open-Meteo · meteorologia", status: !location ? "unavailable" : stale || failed ? "partial" : "ok", stale, detail: stale ? "Última leitura disponível; atualização pendente." : failed ? "Última tentativa falhou; leitura anterior preservada." : "Coleta automática armazenada.", url: "https://open-meteo.com/", dataTime: time, collectedAt, checkedAt: part?.attemptedAt ?? collectedAt ?? now };
  };
  const sources: SourceState[] = [source("air", latestAir?.time ?? null), source("weather", weather?.value.time ?? null), { id: "inpe", name: "INPE · detecções por satélite", status: !fire?.collection ? "unavailable" : diagnostic.parcial ? "partial" : "ok", stale: diagnostic.stale, detail: "Detecções de calor não representam contagem de incêndios confirmados.", url: "https://terrabrasilis.dpi.inpe.br/queimadas/", dataTime: diagnostic.observedAt, collectedAt: fire?.collection?.checkedAt ?? null, checkedAt: fire?.attemptedAt ?? now }];
  const dashboard: DashboardData = { fetchedAt: now, place, air: air?.points ?? [], weather: weather?.value ?? null, fires: fire?.collection?.fires ?? [], sensors: [], sources, regional: [], fireCoverage: fire?.collection?.coverage ?? null };
  const packet = createFieldPacket(dashboard, 100, 24, "all", null, radar, false, now);
  for (const s of sources) if (s.status !== "ok") packet.missing.push(s.name + (s.stale ? " · leitura desatualizada" : " · cobertura parcial/indisponível"));
  const [history, archives] = await Promise.all([readHistory(place.id, 100, "all", 7, radar, now), historyStatus()]);
  return { schema: MOBILE_REVISION, generatedAt: now, placeId: place.id, packet, sourceHealth: sources.map(s => ({ id: s.id, name: s.name, status: s.status, stale: !!s.stale, collectedAt: s.collectedAt, dataTime: s.dataTime })), forecast: !sources[0].stale ? (air?.points ?? []).filter(p => p.time >= now && p.time <= now + 72 * 3600).slice(0, 73) : [], forecastCollectedAt: air?.collectedAt ?? cache.air?.collectedAt ?? null, history: history.daily, archives: { days: archives.fireDays.length, lastDay: archives.fireDays.at(-1)?.dayUtc ?? null }, coverage: { region: "Tapajós", radiusKm: 100, hours: 24, air: "CAMS global · estimativa regional (~45 km), não sensor local", aqi: "US EPA AQI", timezone: "America/Santarem" }, app: { version: "1.4.0-beta.1", siteVersion: 28 } };
}

// Only this scheduled handler writes data. All public HTTP routes are reads.
export async function refreshFireArchives(now = Math.floor(Date.now() / 1000), fetcher: typeof fetch = fetch, initialDays = 8) {
  const state = await historyStatus(), have = new Set(state.fireDays.map(d => d.dayUtc));
  const dates = Array.from({ length: 31 }, (_, i) => utcDay(now - i * 86400));
  const wanted = [...new Set([...dates.slice(0, 2), ...dates.slice(2).filter(d => !have.has(d)).slice(0, Math.max(1, initialDays - 2))])];
  const written: string[] = [], failures: { day: string; reason: string }[] = [];
  // Sequential fetches bound memory; each input is capped by sourceText.
  for (const day of wanted) {
    try {
      const packet = validateHistoryPacket(await collectFireDay(day, now, fetcher), now);
      await saveHistoryPacket(packet);
      written.push(day);
    } catch (error) { failures.push({ day, reason: error instanceof Error ? error.message.slice(0, 200) : "Falha no arquivo diário." }); }
  }
  const after = await historyStatus();
  for (const day of written) if (!after.fireDays.some(d => d.dayUtc === day && d.collectedAt >= now)) throw new Error("Gravação do histórico sem confirmação de leitura.");
  const result = { checkedAt: now, status: failures.length ? "partial" : "ok", written, totalDays: after.fireDays.length, failures };
  await env.DB!.prepare("INSERT INTO radar_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE excluded.updated_at>=radar_settings.updated_at").bind("mobile:history-run", JSON.stringify(result), now).run();
  console.log(JSON.stringify({ component: "mobile-history", ...result }));
  return result;
}

export default {
  async fetch(request: Request) {
    const u = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Somente leitura." }, 405);
    try {
      let response: Response;
      if (u.pathname === "/v1/places") response = json({ schema: MOBILE_REVISION, region: "Tapajós", places: PLACES }, 200, 86400);
      else if (u.pathname === "/v1/snapshot") {
        const place = u.searchParams.get("place") ?? "itaituba";
        if (![...u.searchParams.keys()].every(k => k === "place") || !PLACES.some(p => p.id === place)) return json({ error: "Município ou filtro inválido." }, 400);
        response = json(await mobileSnapshot(place));
      } else if (u.pathname === "/health") {
        const archives = await historyStatus();
        const row = await env.DB!.prepare("SELECT value FROM radar_settings WHERE key=?").bind("mobile:history-run").first<{ value: string }>();
        const run = row ? JSON.parse(row.value) : null;
        response = json({ schema: MOBILE_REVISION, region: "Tapajós", places: PLACES.length, archiveDays: archives.fireDays.length, historyRun: run ? { checkedAt: run.checkedAt, status: run.status, written: run.written, totalDays: run.totalDays, failures: run.failures.length } : null }, 200, 30);
      } else return json({ error: "Recurso inexistente." }, 404);
      return request.method === "HEAD" ? new Response(null, response) : response;
    } catch (error) {
      console.error(JSON.stringify({ component: "mobile-api", event: "read-failed", detail: error instanceof Error ? error.message : "Falha de leitura." }));
      return json({ error: "Atualização indisponível. Preserve a última cópia local." }, 503);
    }
  },
  async scheduled() { await refreshFireArchives(); },
};
