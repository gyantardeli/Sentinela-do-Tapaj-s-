export const ONLINE_QUERY_ERROR = "Não foi possível consultar os dados online. Verifique a conexão e tente novamente. Nenhuma cópia do aparelho foi utilizada.";

/** Retire only the known legacy worker and its automatic shell cache. */
export async function disableLegacyOffline() {
  if (typeof window === "undefined") return;
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.filter(reg => [reg.active, reg.waiting, reg.installing].some(worker => {
        if (!worker) return false;
        try {
          const url = new URL(worker.scriptURL);
          return url.origin === location.origin && url.pathname === "/sw.js";
        } catch { return false; }
      })).map(reg => reg.unregister()));
    } catch { /* A cleanup failure must not prevent online queries. */ }
  }
  if ("caches" in window) {
    try { await caches.delete("sentinela-shell-v1"); }
    catch { /* Keep manually saved data and unrelated caches intact. */ }
  }
}
