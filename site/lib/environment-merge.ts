import { PLACES, nearestAir } from "./environment";
import type { AirLocation, WeatherLocation, EnvironmentPart } from "./environment-provider";
export function locationTime(location: AirLocation | WeatherLocation, collectedAt: number) { return "points" in location ? nearestAir(location.points, location.collectedAt ?? collectedAt)?.time ?? 0 : location.value.time; }
export function mergeEnvironmentPart<T extends AirLocation | WeatherLocation>(prior: EnvironmentPart<T> | null, fresh: T[] | null, collectedAt: number, failures: Record<string, string> = {}): EnvironmentPart<T> {
  if (prior && collectedAt < (prior.attemptedAt ?? prior.collectedAt)) return prior;
  const locations = new Map((prior?.locations ?? []).map(l => [l.placeId, l])), errors = { ...failures }; let latest = prior?.collectedAt ?? 0;
  for (const item of fresh ?? []) {
    const old = locations.get(item.placeId);
    if (old && (collectedAt < (old.collectedAt ?? prior!.collectedAt) || locationTime(item, collectedAt) < locationTime(old, prior!.collectedAt))) { errors[item.placeId] = "Resposta do modelo anterior à leitura já armazenada."; continue; }
    locations.set(item.placeId, { ...item, collectedAt }); latest = Math.max(latest, collectedAt); delete errors[item.placeId];
  }
  return { collectedAt: latest, attemptedAt: collectedAt, locations: PLACES.flatMap(p => locations.has(p.id) ? [locations.get(p.id)!] : []), failures: errors };
}
export function municipalState<T extends AirLocation | WeatherLocation>(part: EnvironmentPart<T> | null, id: string, now: number) {
  const location = part?.locations.find(l => l.placeId === id) ?? null, collectedAt = location?.collectedAt ?? part?.collectedAt ?? null, observedAt = location ? locationTime(location, now) : null;
  const stale = !observedAt || Math.abs(now - observedAt) > 7200 || !collectedAt || now - collectedAt > 4500 || collectedAt > now + 300, error = part?.failures?.[id] ?? null;
  return { location, collectedAt, observedAt, stale, error, status: !location ? "unavailable" as const : stale || error ? "partial" as const : "ok" as const };
}
