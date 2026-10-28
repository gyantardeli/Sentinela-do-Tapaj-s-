import { PLACES, nearestAir } from "../../../lib/environment";
import { loadEnvironmentSnapshot } from "../../../lib/environment-snapshot";
import { municipalState } from "../../../lib/environment-merge";
import { groupArticles } from "../../../lib/radar-core";
import { RADAR_LOCALITIES } from "../../../lib/radar-sources";
import { readRadar } from "../../../lib/radar-store";
import type { RegionalSummary } from "../../../lib/regional-summary";
export async function GET() {
  try {
    const [environment, radar] = await Promise.all([loadEnvironmentSnapshot(), readRadar()]), now = environment.resolvedAt;
    const recent = radar.items.filter(i => i.publishedAt >= now - 72 * 3600 && i.publishedAt <= now);
    const data: RegionalSummary = { now, airCollectedAt: environment.air?.collectedAt ?? null, weatherCollectedAt: environment.weather?.collectedAt ?? null, newsCollectedAt: radar.run?.completedAt ?? null, places: PLACES.map(place => {
      const local = recent.filter(i => i.places.some(id => RADAR_LOCALITIES.find(l => l.id === id)?.municipality === place.id));
      const context = !local.length, group = groupArticles(context ? recent.filter(i => !i.places.length) : local, place.id === "ruropolis" || place.id === "placas" ? "ruropolis-placas" : place.id, now)[0];
      const airState=municipalState(environment.air,place.id,now), weatherState=municipalState(environment.weather,place.id,now);
      return { id: place.id, air: nearestAir(airState.location?.points??[],now), weather: weatherState.location?.value??null, airCollectedAt:airState.collectedAt,weatherCollectedAt:weatherState.collectedAt,airStale:airState.stale,weatherStale:weatherState.stale, news: group ? { title: group.lead.title, url: group.lead.url, publishedAt: group.lead.publishedAt, sourceId: group.lead.sourceId, context, score: group.score, label: group.label } : null };
    }) };
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "Não foi possível ler o resumo municipal." }, { status: 503 }); }
}
