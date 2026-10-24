export const INPE_PORTAL = "https://data.inpe.br/queimadas/portal/";
export const INPE_BDQ = "https://data.inpe.br/queimadas/bdqueimadas/";
export const INPE_WMS = "https://data.inpe.br/queimadas/geoserver/ows";
export const INPE_RISK = "dados-meteorologicos:FireRisk";
export type InpeRisk = { available: boolean; date: string | null; checkedAt: number; title: string; layer: string; url: string };
export function parseRiskMetadata(xml: string): string | null {
  const start = xml.indexOf("<Name>" + INPE_RISK + "</Name>");
  if (start < 0) return null;
  const end = xml.indexOf("</Layer>", start);
  if (end < 0) return null;
  const layer = xml.slice(start, end);
  const dimension = layer.match(/<Dimension\b[^>]*\bname="time"[^>]*>/i)?.[0];
  const date = dimension?.match(/\bdefault="([^"]+)"/i)?.[1] ?? null;
  return date && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(date) && Number.isFinite(Date.parse(date)) ? date : null;
}
export function riskMapUrl(left: number, top: number, zoom: number, date: string, height = 520) {
  const world = 40075016.68557849, half = world / 2, size = 256 * 2 ** zoom;
  const bbox = [left / size * world - half, half - (top + height) / size * world, (left + 1000) / size * world - half, half - top / size * world].map(x => x.toFixed(3)).join(",");
  return INPE_WMS + "?" + new URLSearchParams({ SERVICE: "WMS", VERSION: "1.1.1", REQUEST: "GetMap", LAYERS: INPE_RISK, STYLES: "", FORMAT: "image/png", TRANSPARENT: "true", SRS: "EPSG:3857", BBOX: bbox, WIDTH: "1000", HEIGHT: String(height), TIME: date });
}
