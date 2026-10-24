import { PLACES } from "./environment";
import { airRequestUrl, weatherRequestUrl, parseMunicipalResponse, describeSourceError, type EnvironmentCache, type AirLocation, type WeatherLocation } from "./environment-provider";
import { mergeEnvironmentPart, municipalState } from "./environment-merge";
import { sourceJson, type SourceFetcher } from "./source-http";
export async function resolveEnvironment(stored: EnvironmentCache, now: number, fetcher: SourceFetcher = fetch): Promise<EnvironmentCache & { resolvedAt: number }> {
  const result = { ...stored, resolvedAt: now };
  await Promise.all((["air", "weather"] as const).map(async kind => {
    if (PLACES.every(p => municipalState<AirLocation | WeatherLocation>(stored[kind], p.id, now).status === "ok")) return;
    try {
      const parsed = parseMunicipalResponse(await sourceJson(kind === "air" ? airRequestUrl() : weatherRequestUrl(), { fetcher, maxBytes: 2_000_000 }), kind, now);
      if (kind === "air") result.air = mergeEnvironmentPart(stored.air, parsed.air, now, parsed.failures); else result.weather = mergeEnvironmentPart(stored.weather, parsed.weather, now, parsed.failures);
    } catch (error) {
      const failures = Object.fromEntries(PLACES.map(p => [p.id, describeSourceError(error)]));
      if (kind === "air") result.air = mergeEnvironmentPart(stored.air, null, now, failures); else result.weather = mergeEnvironmentPart(stored.weather, null, now, failures);
    }
  })); return result;
}
