import { areaCenter, areaDescription, areaExtent, type InterestArea } from "./areas";
import type { Place } from "./environment";
import { replayBoundary, type ReplayDetection } from "./fire-replay";

type ExportOptions = {
  fires: ReplayDetection[]; cursor: number; start: number; end: number;
  place: Place; radius: number; area?: InterestArea | null;
  satellite: string; eventId: string; recentOnly: boolean; sourceStatus: string;
};
const xml = (value: unknown) => String(value ?? "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const iso = (time: number) => new Date(time * 1000).toISOString();
const coordinates = (points: number[][]) => points.map(p => `${p[0].toFixed(7)},${p[1].toFixed(7)},0`).join(" ");
function data(values: Record<string, unknown>) {
  return "<ExtendedData>" + Object.entries(values).map(([name, value]) => `<Data name="${xml(name)}"><value>${xml(value)}</value></Data>`).join("") + "</ExtendedData>";
}

/** Standalone data export: no imagery, credentials, server callbacks or future observations. */
export function replayKml(options: ExportOptions) {
  const { place, area, radius, cursor, start, end } = options;
  if (![start, end, cursor].every(Number.isFinite) || start > cursor || cursor > end) throw new Error("Horário inválido para exportação.");
  const fires = options.fires.filter(f => Number.isFinite(f.time) && f.time >= start && f.time <= cursor
    && Number.isFinite(f.lat) && Number.isFinite(f.lon) && f.lat >= -90 && f.lat <= 90 && f.lon >= -180 && f.lon <= 180
    && (options.satellite === "all" || f.satellite === options.satellite)
    && (options.eventId === "all" || f.eventId === options.eventId)
    && (!options.recentOnly || f.time >= cursor - 3600));
  const center = area ? areaCenter(area) : place;
  const extent = area ? areaExtent(area) : radius;
  const name = area?.name ?? place.name;
  const scope = area ? areaDescription(area) : `Raio de ${radius} km`;
  const boundary = replayBoundary(place, radius, area);
  const scopeGeometry = area?.kind === "corridor"
    ? "<MultiGeometry>" + boundary.features.map(f => `<LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><coordinates>${coordinates(f.geometry.coordinates)}</coordinates></LineString>`).join("") + "</MultiGeometry>"
    : `<Polygon><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><outerBoundaryIs><LinearRing><coordinates>${coordinates(boundary.features[0].geometry.coordinates)}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  const groups = new Map<string, ReplayDetection[]>();
  for (const fire of fires) { const group = groups.get(fire.eventId) ?? []; group.push(fire); groups.set(fire.eventId, group); }
  const description = [
    `Sentinela Tapajós · ${name} · ${scope}.`, `${fires.length} detecções exibidas até ${iso(cursor)}.`,
    `Janela consultada: ${iso(start)} a ${iso(end)}. Todos os horários do arquivo estão em UTC.`,
    `Satélite: ${options.satellite === "all" ? "todos" : options.satellite}; grupo: ${options.eventId}; somente última hora: ${options.recentOnly ? "sim" : "não"}.`,
    `Situação da fonte: ${options.sourceStatus}. Lacunas não indicam ausência ou extinção de fogo.`,
    "Uma detecção é uma observação de satélite; várias podem representar o mesmo incêndio. Grupos são associações estimadas desta consulta, sem confirmação de campo.",
    "O contorno representa o recorte de análise. No corredor, linhas e círculos mostram faixas auxiliares. Não representa perímetro queimado nem previsão de propagação.",
    "Exportação estática. Importe o KML no Google Earth; uma nova coleta requer nova exportação. A busca textual da lista não altera os pontos do mapa exportados.",
  ].join("\n");
  const point = (fire: ReplayDetection) => {
    const recent = fire.time >= cursor - 3600;
    return `<Placemark id="${xml(fire.detectionId)}"><name>${xml(fire.detectionId)}</name><description>${xml([
      `Observação: ${iso(fire.time)} (UTC)`, `Satélite: ${fire.satellite}`, `Coordenadas WGS84: ${fire.lat}, ${fire.lon}`,
      `FRP: ${fire.frp == null ? "não informada" : fire.frp + " MW"} · potência radiativa, não temperatura`,
      `Município: ${fire.municipality ?? "não informado"}`, `Fonte: ${fire.source}`, `Grupo estimado: ${fire.eventId}`,
    ].join("\n"))}</description><TimeStamp><when>${iso(fire.time)}</when></TimeStamp><styleUrl>#${recent ? "recent" : "previous"}</styleUrl>${data({
      id_deteccao: fire.detectionId, grupo_estimado_recorte: fire.eventId, observacao_UTC: iso(fire.time),
      satelite: fire.satellite, frp_MW: fire.frp, municipio: fire.municipality, fonte: fire.source, chave_original: fire.id,
    })}<Point><altitudeMode>clampToGround</altitudeMode><coordinates>${coordinates([[fire.lon, fire.lat]])}</coordinates></Point></Placemark>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(`Sentinela Tapajós · ${name}`)}</name><open>1</open><description>${xml(description)}</description>
<LookAt><longitude>${center.lon}</longitude><latitude>${center.lat}</latitude><altitude>0</altitude><heading>0</heading><tilt>45</tilt><range>${Math.max(5000, extent * 2600)}</range><altitudeMode>clampToGround</altitudeMode></LookAt>
${[ ["recent", "ff305ef0"], ["previous", "ff6382a0"] ].map(([id, color]) => `<Style id="${id}"><IconStyle><color>${color}</color><scale>0.8</scale><Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle><LabelStyle><scale>0</scale></LabelStyle></Style>`).join("")}
<Style id="scope"><LineStyle><color>ff5e7226</color><width>2.5</width></LineStyle><PolyStyle><fill>0</fill><outline>1</outline></PolyStyle></Style>
${data({ quadro_UTC: iso(cursor), inicio_janela_UTC: iso(start), fim_janela_UTC: iso(end), quantidade_deteccoes: fires.length, situacao_fonte: options.sourceStatus })}
<Folder><name>Recorte de análise</name><Placemark id="analysis-scope"><name>${xml(name + " · " + scope)}</name><description>${xml("Área usada nos filtros. Não é perímetro de incêndio.")}</description><styleUrl>#scope</styleUrl>${data({ tipo: area?.kind ?? "circle", raio_ou_faixa_km: area?.radiusKm ?? radius })}${scopeGeometry}</Placemark></Folder>
<Folder><name>Detecções observadas · ${fires.length}</name>${[...groups].map(([id, members]) => `<Folder><name>${xml(id + " · " + members.length + " detecções · grupo estimado")}</name>${members.map(point).join("")}</Folder>`).join("")}</Folder>
</Document></kml>`;
}
