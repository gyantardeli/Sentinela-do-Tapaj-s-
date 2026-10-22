export const PLACES = [
  { id: "itaituba", name: "Itaituba", lat: -4.2761, lon: -55.9836 },
  { id: "jacareacanga", name: "Jacareacanga", lat: -6.2222, lon: -57.7644 },
  { id: "novo-progresso", name: "Novo Progresso", lat: -7.1436, lon: -55.3783 },
  { id: "ruropolis", name: "Rurópolis", lat: -4.0967, lon: -54.9097 },
  { id: "placas", name: "Placas", lat: -3.8694, lon: -54.2172 },
  { id: "aveiro", name: "Aveiro", lat: -3.6094, lon: -55.3319 },
  { id: "trairao", name: "Trairão", lat: -4.5736, lon: -55.9422 },
  { id: "santarem", name: "Santarém", lat: -2.4385, lon: -54.6996 },
] as const;
export type Place = { id: string; name: string; lat: number; lon: number };
export type Fire = { id: string; lat: number; lon: number; time: number; satellite: string; frp: number | null; source: string; municipality?: string | null; state?: string | null; biome?: string | null; droughtDays?: number | null; precipitation?: number | null; risk?: number | null };
export type Sensor = { id: string; name: string; lat: number; lon: number; pm25: number; time: number; manual?: boolean; kind?: "sensor" | "model" };
export type AirPoint = { time: number; pm25: number | null; pm10: number | null; aqi: number | null };
export type Weather = { time: number; temperature: number | null; humidity: number | null; speed: number | null; direction: number | null; rain: number | null };
export type SourceState = { id: string; name: string; status: "ok" | "partial" | "unavailable" | "manual" | "embedded" | "external" | "widget"; detail: string; url: string; dataTime: number | null; checkedAt: number; stale?: boolean; collectedAt?: number | null };
export type DashboardData = { fetchedAt: number; place: Place; air: AirPoint[]; weather: Weather | null; fires: Fire[]; sensors: Sensor[]; sources: SourceState[]; regional: { id: string; pm25: number | null; aqi: number | null; time: number | null }[]; fireCoverage: { start: number; end: number; complete: boolean } | null };
export const TZ = "America/Santarem";
export function distance(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180, dlat = (b.lat - a.lat) * r, dlon = (b.lon - a.lon) * r;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180, dl = (b.lon - a.lon) * r;
  return (Math.atan2(Math.sin(dl) * Math.cos(b.lat * r), Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos(dl)) / r + 360) % 360;
}
export function upwind(place: Place, fire: Fire, weather: Weather | null) {
  if (weather?.direction == null || weather.speed == null || weather.speed < 2) return false;
  return Math.abs(((bearing(place, fire) - weather.direction + 540) % 360) - 180) <= 30;
}
export function compass(deg: number) { return ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round(deg / 45) % 8]; }
export function display(value: number | null | undefined, digits = 1) { return value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits }); }
export function stamp(time: number | null | undefined, full = false) {
  if (!time || !Number.isFinite(time)) return "Sem horário";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", ...(full ? { year: "numeric" } : {}), hour: "2-digit", minute: "2-digit" }).format(new Date(time * 1000));
}
export function aqBand(aqi: number | null | undefined) {
  if (aqi == null) return { label: "Sem índice", color: "#77817f", soft: "#f0f2f1" };
  if (aqi <= 50) return { label: "Boa", color: "#1e8062", soft: "#e9f5ee" };
  if (aqi <= 100) return { label: "Moderada", color: "#9b7315", soft: "#fff6db" };
  if (aqi <= 150) return { label: "Sensíveis: atenção", color: "#c36425", soft: "#fff0e5" };
  if (aqi <= 200) return { label: "Insalubre", color: "#c44242", soft: "#fceced" };
  if (aqi <= 300) return { label: "Muito insalubre", color: "#8750a6", soft: "#f3ecf8" };
  return { label: "Perigosa", color: "#80304b", soft: "#faeaf0" };
}
export function nearestAir(points: AirPoint[], at: number) { return points.reduce<AirPoint | null>((best, p) => Math.abs(p.time - at) < Math.abs((best?.time ?? Infinity) - at) ? p : best, null); }
export function filterFires(fires: Fire[], place: Place, radius: number, hours: number, now: number) { return fires.filter(f => f.time >= now - hours * 3600 && f.time <= now + 300 && distance(place, f) <= radius); }
export function parseCsv(text: string): Record<string, string>[] {
  const value=text.replace(/^\uFEFF/, "").trim(); if(!value)return [];
  const sep=value.split(/\r?\n/,1)[0].includes(";")?";":","; const rows:string[][]=[];
  let row:string[]=[],cell="",quoted=false;
  for(let i=0;i<value.length;i++){const c=value[i];if(c==='"'){if(quoted&&value[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===sep&&!quoted){row.push(cell.trim());cell="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&value[i+1]==="\n")i++;row.push(cell.trim());if(row.some(s=>s.length))rows.push(row);row=[];cell="";}else cell+=c;}
  if(quoted)throw new Error("CSV inválido: aspas sem fechamento.");row.push(cell.trim());if(row.some(s=>s.length))rows.push(row);
  const fields=(rows.shift()??[]).map(f=>f.toLowerCase());if(new Set(fields).size!==fields.length||fields.some(f=>!f||f==="__proto__"||f==="constructor"))throw new Error("Cabeçalho CSV inválido.");
  return rows.map(values=>{if(values.length!==fields.length)throw new Error("Linha CSV incompleta.");return Object.fromEntries(fields.map((field,i)=>[field,values[i]]));});
}
export function fireRowTime(row: Record<string, unknown>) {
  let date=String(row.data_hora_gmt??row.datahora_gmt??row.datahora??row.data_hora??row.data??row.datetime??"").trim();
  if(row.acq_date){const hhmm=String(row.acq_time??"0000").padStart(4,"0");date=row.acq_date+"T"+hhmm.slice(0,2)+":"+hhmm.slice(2)+":00Z";}
  if(date&&!/[zZ]$|[+-]\d\d:?\d\d$/.test(date))date=date.replace(" ","T")+"Z";
  return Date.parse(date)/1000;
}
export function parseFireRows(rows: Record<string, unknown>[], source: string): Fire[] {
  const number = (v: unknown, max = Infinity) => { if (v == null || String(v).trim() === "") return null; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };
  const text = (v: unknown) => typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;
  const result: Fire[] = [];
  for (const row of rows) {
    if ((row.lat ?? row.latitude) === "" || (row.lon ?? row.longitude) === "") continue;
    const lat = Number(row.lat ?? row.latitude), lon = Number(row.lon ?? row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -11 || lat > 1 || lon < -62 || lon > -50) continue;
    const time = fireRowTime(row);
    if (!Number.isFinite(time)) continue;
    const satellite = String(row.satelite ?? row.satellite ?? row.instrument ?? "Não informado");
    const frp = number(row.frp);
    result.push({ id: [lat.toFixed(5), lon.toFixed(5), time, satellite].join("|"), lat, lon, time, satellite, frp, source,
      municipality: text(row.municipio), state: text(row.estado), biome: text(row.bioma),
      droughtDays: number(row.numero_dias_sem_chuva ?? row.diasemchuva), precipitation: number(row.precipitacao), risk: number(row.risco_fogo ?? row.riscofogo, 1),
    });
  }
  return result;
}
export function deduplicateFires(fires: Fire[]) {
  const unique = new Map<string, Fire>();
  for (const fire of fires) {
    const prior = unique.get(fire.id);
    if (!prior) unique.set(fire.id, { ...fire });
    else {
      const fields = ["frp", "municipality", "state", "biome", "droughtDays", "precipitation", "risk"] as const;
      for (const key of fields) if (prior[key] == null && fire[key] != null) (prior as Record<string, unknown>)[key] = fire[key];
    }
  }
  return [...unique.values()];
}
export function filterSatellite(fires: Fire[], satellite: string) { return satellite === "all" ? fires : fires.filter(f => f.satellite === satellite); }
