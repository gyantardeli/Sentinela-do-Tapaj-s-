"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useSnapshot<T>(url: string, refreshKey = 0) {
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
    } catch (e) { if (ticket === generation.current) setError(e instanceof Error ? e.message : "Falha de leitura."); }
    finally { if (ticket === generation.current) setLoading(false); }
  }, [url, refreshKey]);
  useEffect(() => { void load(); const timer = setInterval(() => { if (!document.hidden) void load(); }, 300000); return () => { generation.current++; clearInterval(timer); }; }, [load]);
  return { data: snapshot?.url === url ? snapshot.data : null, loading, error, load };
}
