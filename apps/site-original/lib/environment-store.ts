import { env } from "cloudflare:workers";
import type { EnvironmentCache, EnvironmentPacket, EnvironmentPart, AirLocation, WeatherLocation } from "./environment-provider";
import { persistEnvironmentHistory } from "./monitoring-store";
import { mergeEnvironmentPart } from "./environment-merge";
import { PLACES } from "./environment";
export async function readEnvironmentCache(maximumAgeSeconds = 32 * 86400): Promise<EnvironmentCache> {
  if (!env.DB) return { air: null, weather: null };
  try {
    const rows = await env.DB.prepare("SELECT key,value FROM radar_settings WHERE key IN (?,?)").bind("environment:air", "environment:weather").all<{ key: string; value: string }>();
    const now = Math.floor(Date.now() / 1000), result: EnvironmentCache = { air: null, weather: null };
    for (const row of rows.results) {
      try { const v = JSON.parse(row.value), attempted = v.attemptedAt ?? v.collectedAt;
        if (!Number.isInteger(v.collectedAt) || attempted > now + 300 || now - attempted > maximumAgeSeconds || !Array.isArray(v.locations)) continue;
        if (row.key === "environment:air") result.air = v; if (row.key === "environment:weather") result.weather = v;
      } catch { /* One damaged setting must not hide the other source. */ }
    } return result;
  } catch { return { air: null, weather: null }; }
}
export async function saveEnvironment(packet: EnvironmentPacket) {
  if (!env.DB) throw new Error("Armazenamento indisponível.");
  // Conditional writes retry against the winning setting; no schema migration.
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await env.DB.prepare("SELECT key,value FROM radar_settings WHERE key IN (?,?)").bind("environment:air", "environment:weather").all<{ key: string; value: string }>();
    const expected = new Map(rows.results.map(r => [r.key, r.value])), next = new Map<string, string>(), statements: D1PreparedStatement[] = [];
    for (const kind of ["air", "weather"] as const) {
      const key = "environment:" + kind, before = expected.get(key); let prior: EnvironmentPart<AirLocation | WeatherLocation> | null = null;
      try { prior = before ? JSON.parse(before) : null; } catch {}
      if (prior && packet.collectedAt < (prior.attemptedAt ?? prior.collectedAt)) continue;
      const failures = packet.municipalityFailures?.[kind] ?? (!packet[kind] ? Object.fromEntries(PLACES.map(p => [p.id, packet.failures[kind] ?? "Fonte sem resposta."])) : {});
      const value = JSON.stringify(mergeEnvironmentPart<AirLocation | WeatherLocation>(prior, packet[kind], packet.collectedAt, failures)); next.set(key, value);
      statements.push(env.DB.prepare("INSERT INTO radar_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE radar_settings.value=?").bind(key, value, packet.collectedAt, before ?? ""));
    }
    if (!statements.length) break;
    await env.DB.batch(statements);
    const after = await env.DB.prepare("SELECT key,value FROM radar_settings WHERE key IN (?,?)").bind("environment:air", "environment:weather").all<{ key: string; value: string }>();
    if ([...next].every(([key, value]) => after.results.some(row => row.key === key && row.value === value))) break;
    if (attempt === 2) throw new Error("A coleta concorreu com outra atualização. A leitura anterior foi preservada; tente novamente.");
  }
  const final = await readEnvironmentCache(), recorded: EnvironmentPacket = { ...packet, failures: { ...packet.failures } };
  for (const kind of ["air", "weather"] as const) {
    const part = final[kind]; if (part?.attemptedAt !== packet.collectedAt || !packet[kind]) continue;
    const failures = part.failures ?? {};
    if (kind === "air") recorded.air = packet.air!.filter(l => !failures[l.placeId]); else recorded.weather = packet.weather!.filter(l => !failures[l.placeId]);
    if (recorded[kind]?.length !== packet[kind]!.length) { if (!recorded[kind]!.length) recorded[kind] = null; recorded.failures[kind] = "Respostas anteriores à leitura armazenada foram rejeitadas por município."; }
  }
  await persistEnvironmentHistory(recorded);
}
export function environmentSummary(cache: EnvironmentCache) {
  const summary = (part: EnvironmentCache["air"] | EnvironmentCache["weather"]) => ({ collectedAt: part?.collectedAt || null, places: part?.locations.length ?? 0, attemptedAt: part?.attemptedAt ?? part?.collectedAt ?? null, failures: part?.failures ?? {}, references: part?.locations.map(l => ({ placeId: l.placeId, collectedAt: l.collectedAt ?? part.collectedAt })) ?? [] });
  return { air: summary(cache.air), weather: summary(cache.weather) };
}
