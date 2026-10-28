"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ONLINE_QUERY_ERROR } from "../lib/online-only";

export function useSnapshot<T>(url: string, refreshKey = 0, enabled = true) {
  const [snapshot, setSnapshot] = useState<{ url: string; data: T } | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++generation.current; setLoading(true); setError("");
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
      const value = await response.json() as Record<string, unknown> | null;
      if (!response.ok || !value || typeof value !== "object" || value.error) throw new Error(typeof value?.error === "string" ? value.error : "Não foi possível ler os dados.");
      if (ticket === generation.current) setSnapshot({ url, data: value as T });
    } catch { if (ticket === generation.current) { setSnapshot(null); setError(ONLINE_QUERY_ERROR); } }
    finally { if (ticket === generation.current) setLoading(false); }
  }, [url, refreshKey]);
  useEffect(() => { if (!enabled) { setLoading(false); return; } void load(); const timer = setInterval(() => { if (!document.hidden) void load(); }, 300000); return () => { generation.current++; clearInterval(timer); }; }, [load, enabled]);
  useEffect(() => {
    const reconnect = () => { if (enabled) void load(); };
    const disconnect = () => { generation.current++; setSnapshot(null); setLoading(false); setError(ONLINE_QUERY_ERROR); };
    window.addEventListener("online", reconnect); window.addEventListener("offline", disconnect);
    return () => { window.removeEventListener("online", reconnect); window.removeEventListener("offline", disconnect); };
  }, [load, enabled]);
  return { data: snapshot?.url === url ? snapshot.data : null, loading, error, load };
}
