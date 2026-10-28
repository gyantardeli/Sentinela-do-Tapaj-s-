"use client";
import { useState } from "react";
import { CloudFog } from "lucide-react";
import { display, stamp, type AirPoint } from "../lib/environment";
export default function AirChart({ points, now, loading = false, message, onReviewSource }: { points: AirPoint[]; now: number; loading?: boolean; message?: string; onReviewSource?: () => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = points.filter(p => p.time >= now - 12 * 3600 && p.time <= now + 36 * 3600);
  if (!data.some(p => p.pm25 != null)) return <div className="empty-chart data-empty" role="status"><CloudFog size={28} /><strong>{loading ? "Consultando a série de PM2,5…" : "Série de PM2,5 indisponível"}</strong><p>{loading ? "Aguardando a resposta da fonte de qualidade do ar." : message ?? "A fonte não forneceu a série nesta consulta. O gráfico aparecerá quando os dados estiverem disponíveis."}</p>{!loading && onReviewSource && <button className="button secondary compact" onClick={onReviewSource}>Ver situação da fonte</button>}</div>;
  const W = 780, H = 210, pad = { l: 42, r: 16, t: 20, b: 34 }, width = W - pad.l - pad.r, height = H - pad.t - pad.b;
  const start = data[0].time, end = data[data.length - 1].time;
  const max = Math.max(20, Math.ceil(Math.max(...data.map(p => p.pm25 ?? 0)) / 10) * 10);
  const x = (t: number) => pad.l + (t - start) / Math.max(1, end - start) * width;
  const y = (v: number) => pad.t + height - v / max * height;
  let draw = false;
  const path = data.map(p => { if (p.pm25 == null) { draw = false; return ""; } const d = `${draw ? "L" : "M"}${x(p.time)},${y(p.pm25)}`; draw = true; return d; }).join(" ");
  const active = hover == null ? null : data[hover];
  return <div className="chart"><div className="chart-readout">{active ? `${stamp(active.time)} · ${display(active.pm25)} µg/m³` : "Passe sobre a curva para ver os valores"}</div><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="PM2,5 calculado pelo modelo, das últimas 12 horas às próximas 36 horas" onPointerMove={e => { const box = e.currentTarget.getBoundingClientRect(); const at = (e.clientX - box.left) / box.width * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round((at - pad.l) / width * (data.length - 1))))); }} onPointerLeave={() => setHover(null)}>
    {[0, .25, .5, .75, 1].map(v => <g key={v}><line x1={pad.l} x2={W - pad.r} y1={y(v * max)} y2={y(v * max)} stroke="#e9eeeb" /><text x={pad.l - 12} y={y(v * max) + 4} textAnchor="end">{display(v * max, 0)}</text></g>)}
    <rect x={x(Math.max(start, now))} y={pad.t} width={Math.max(0, W - pad.r - x(now))} height={height} fill="#edf5f1" opacity=".7" />
    <path d={path} fill="none" stroke="#34836a" strokeWidth="2.8" strokeLinejoin="round" />
    <line x1={x(now)} x2={x(now)} y1={pad.t} y2={H - pad.b} stroke="#81998d" strokeDasharray="4 4" /><text x={x(now) + 6} y={pad.t + 10} className="now-label">AGORA</text>
    {data.filter((_, i) => i % 8 === 0).map(p => <text key={p.time} x={x(p.time)} y={H - 9} textAnchor="middle">{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Santarem", day: "2-digit", hour: "2-digit" }).format(p.time * 1000)}</text>)}
    {active && <g><line x1={x(active.time)} x2={x(active.time)} y1={pad.t} y2={H - pad.b} stroke="#698a7a" />{active.pm25 != null && <circle cx={x(active.time)} cy={y(active.pm25)} r="5" fill="#276b54" stroke="#fff" strokeWidth="2" />}</g>}
  </svg><div className="chart-legend"><span><i className="line-key" />CAMS / Open-Meteo · modelo</span><span><i className="forecast-key" />Próximas 36 h</span><span>µg/m³ · UTC−3</span></div></div>;
}
