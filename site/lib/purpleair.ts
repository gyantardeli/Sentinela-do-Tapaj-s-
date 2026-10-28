// These are US EPA AQI index ranges, not PM2.5 concentrations or Brazilian IQAr.
// Reference: https://www.airnow.gov/aqi/aqi-basics/
export const PURPLEAIR_REGION_URL = "https://map.purpleair.com/air-quality-standards-us-epa-aqi?opt=%2F1%2Flp%2Fa10%2Fp604800%2FcC0#6.18/-4.981/-56.179";

export const PURPLEAIR_AQI_BANDS = [
  { min: 0, max: 50, range: "0–50", label: "Boa", color: "#00a94f", soft: "#eaf7ee", detail: "Qualidade do ar considerada satisfatória nessa escala." },
  { min: 51, max: 100, range: "51–100", label: "Moderada", color: "#e6ba00", soft: "#fff9de", detail: "Qualidade aceitável; pessoas mais sensíveis à poluição podem ser afetadas." },
  { min: 101, max: 150, range: "101–150", label: "Ruim para grupos sensíveis", color: "#ef851c", soft: "#fff1e4", detail: "Faixa de maior atenção para pessoas sensíveis à poluição." },
  { min: 151, max: 200, range: "151–200", label: "Ruim", color: "#dc3344", soft: "#fdecee", detail: "A preocupação com os efeitos da poluição passa a incluir toda a população." },
  { min: 201, max: 300, range: "201–300", label: "Muito ruim", color: "#874499", soft: "#f3eaf8", detail: "Nível elevado de preocupação com os efeitos da poluição para todos." },
  { min: 301, max: 500, range: "301–500", label: "Perigosa", color: "#7e263e", soft: "#faeaef", detail: "Faixa de maior preocupação com os efeitos da poluição para toda a população." },
] as const;

export function interpretPurpleAirAqi(input: string) {
  if (!input.trim()) return { state: "empty" as const };
  const value = Number(input);
  if (!Number.isInteger(value) || value < 0 || value > 500) return { state: "invalid" as const };
  const band = PURPLEAIR_AQI_BANDS.find(b => value >= b.min && value <= b.max)!;
  return { state: "value" as const, value, band };
}
