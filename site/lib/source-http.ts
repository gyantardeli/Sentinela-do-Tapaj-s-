// V2.2 transport adapted to Workers: bounded streaming, no Buffer or disk.
export type SourceFetcher = (url: string, init?: RequestInit) => Promise<Response>;
export type SourceCooldowns = Map<string, { until: number; status: number }>;
const defaults: SourceCooldowns = new Map();
export class SourceFailure extends Error {
  constructor(public code: number | string, message: string, public retryAfter: number | null = null) { super(message); this.name = "SourceFailure"; }
}
export function sourceErrorKind(error: unknown) {
  const e = error as { code?: number | string; name?: string } | null;
  if (e?.code === 429) return "limite_de_requisicoes";
  if (e?.code === 401 || e?.code === 403) return "acesso_negado";
  if (e?.code === 404) return "endereco_invalido";
  if (e?.code === "OVERSIZE") return "arquivo_excessivo";
  if (typeof e?.code === "number" && e.code >= 500) return "erro_servidor";
  if (/Timeout|Abort/.test(e?.name ?? "")) return "tempo_esgotado";
  if (["API_INVALID", "CSV_INVALID", "XML_INVALID"].includes(String(e?.code)) || error instanceof SyntaxError) return "resposta_invalida";
  return "falha_de_rede_ou_formato";
}
function retrySeconds(value: string | null, now: number) {
  if (!value) return null;
  const seconds = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(86400, Math.ceil(seconds)) : null;
}
export async function sourceText(url: string, options: { fetcher?: SourceFetcher; timeoutMs?: number; maxBytes?: number; attempts?: number; method?: string; accept?: string; cooldowns?: SourceCooldowns; now?: () => number; wait?: (ms: number) => Promise<void> } = {}): Promise<string> {
  const { fetcher = fetch, timeoutMs = 8500, maxBytes = 2_500_000, attempts = 2, method = "GET", accept = "application/json,text/csv,application/rss+xml,application/atom+xml,application/xml,text/xml,text/html;q=0.7", now = Date.now, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = options;
  const cooldowns = options.cooldowns ?? (fetcher === globalThis.fetch ? defaults : new Map()), host = new URL(url).origin;
  const held = cooldowns.get(host);
  if (held && held.until > now()) throw new SourceFailure(held.status, `HTTP ${held.status} · fonte em intervalo de espera.`, Math.ceil((held.until - now()) / 1000));
  if (cooldowns.size > 40) for (const [key, entry] of cooldowns) if (entry.until <= now()) cooldowns.delete(key);
  const tries = Math.max(1, Math.min(2, attempts));
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const response = await fetcher(url, { method, signal: AbortSignal.timeout(timeoutMs), headers: { Accept: accept, "User-Agent": "SentinelaTapajos/2.3 environmental-collector" } });
      if (!response.ok) {
        const retry = retrySeconds(response.headers?.get("retry-after") ?? null, now());
        await response.body?.cancel().catch(() => {});
        if (response.status === 429 || (response.status === 503 && retry != null)) cooldowns.set(host, { until: now() + (retry ?? 60) * 1000, status: response.status });
        throw new SourceFailure(response.status, "HTTP " + response.status, retry);
      }
      if (Number(response.headers?.get("content-length") ?? 0) > maxBytes) { await response.body?.cancel().catch(() => {}); throw new SourceFailure("OVERSIZE", "Arquivo excede o limite de tamanho."); }
      if (!response.body?.getReader) {
        const text = await response.text();
        if (new TextEncoder().encode(text).byteLength > maxBytes) throw new SourceFailure("OVERSIZE", "Arquivo excede o limite de tamanho.");
        return text;
      }
      const reader = response.body.getReader(), decoder = new TextDecoder(); let bytes = 0, text = "";
      try {
        for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > maxBytes) throw new SourceFailure("OVERSIZE", "Arquivo excede o limite de tamanho."); text += decoder.decode(value, { stream: true }); }
        return text + decoder.decode();
      } catch (error) { await reader.cancel().catch(() => {}); throw error; } finally { reader.releaseLock(); }
    } catch (error) {
      const e = error as SourceFailure;
      if (e.code === "OVERSIZE" || (typeof e.code === "number" && e.code >= 400 && e.code < 500) || e.retryAfter != null || attempt + 1 >= tries || method !== "GET") throw error;
      await wait(400 * (attempt + 1));
    }
  }
  throw new SourceFailure("NETWORK", "Fonte indisponível.");
}
export async function sourceJson(url: string, options: Parameters<typeof sourceText>[1] = {}): Promise<unknown> {
  const text = await sourceText(url, { ...options, accept: "application/json" });
  try { return JSON.parse(text); } catch { throw new SourceFailure("API_INVALID", "Resposta JSON inválida."); }
}
