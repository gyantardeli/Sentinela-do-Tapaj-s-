/**
 * Regra conservadora: ausência de dados não equivale a zero.
 * Todos os indicadores históricos exigem dias encerrados com cobertura completa.
 */
export type IntelligenceDay = {
  closed?: boolean;
  fireCoverage: "full" | "partial" | "missing";
  fireCount: number | null;
  pm25: number | null;
  pmSamples: number;
  expectedHours: number;
};
export function hasCompleteFire(day: IntelligenceDay): boolean {
  return day.closed !== false && day.fireCoverage === "full" && day.fireCount !== null;
}
export function hasCompleteAir(day: IntelligenceDay): boolean {
  return day.closed !== false && day.pm25 !== null && day.expectedHours === 24 && day.pmSamples === 24;
}
export function fireTotalForCoveredDays(days: IntelligenceDay[]): number | null {
  const covered = days.filter(hasCompleteFire);
  return covered.length ? covered.reduce((n, day) => n + (day.fireCount ?? 0), 0) : null;
}
export function meanPm25ForCoveredDays(days: IntelligenceDay[]): number | null {
  const covered = days.filter(hasCompleteAir);
  return covered.length ? covered.reduce((n, day) => n + (day.pm25 ?? 0), 0) / covered.length : null;
}
/** readHealth() já devolve responseRate em pontos percentuais, de 0 a 100. */
export function responsePercent(rate: number | null): number | null {
  return rate !== null && Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : null;
}
