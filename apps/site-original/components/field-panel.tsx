"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Share2, Trash2, WifiOff } from "lucide-react";
import { stamp, type DashboardData } from "../lib/environment";
import type { InterestArea } from "../lib/areas";
import type { RadarData } from "../lib/radar-core";
import { FIELD_KEY, FIELD_SYNC_KEY, createFieldPacket, readFieldPacket, type FieldPacket } from "../lib/field-packet";
import { fieldHtml } from "../lib/field-html";
import { downloadFile, preparePwa } from "../lib/offline";

async function workerMessage(data: Record<string, unknown>): Promise<boolean> {
  try {
    const registration = await preparePwa(); if (!registration?.active) return false;
    const channel = new MessageChannel();
    return await new Promise(resolve => {
      const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 15000);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.saved === true); };
      registration.active!.postMessage(data, [channel.port2]);
    });
  } catch { return false; }
}
type Props = { dashboard: DashboardData | null; radius: number; hours: number; satellite: string; area: InterestArea | null; refreshing: boolean; onRefresh: () => void };
export default function FieldPanel(props: Props) {
  const [packet, setPacket] = useState<FieldPacket | null>(null), [autoSync, setAutoSync] = useState(false), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [online, setOnline] = useState(true), [preview, setPreview] = useState(false);
  const saving = useRef(false), generation = useRef(0), attempted = useRef("");
  const latest = useRef(props); latest.current = props;
  const scope = `${props.dashboard?.place.id}|${props.radius}|${props.hours}|${props.satellite}|${props.area?.id ?? ""}|${props.area?.updatedAt ?? ""}`;
  useEffect(() => {
    setPacket(readFieldPacket()); try { setAutoSync(localStorage.getItem(FIELD_SYNC_KEY) === "true"); } catch {}
    setReady(true); const update = () => setOnline(navigator.onLine); update();
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); generation.current++; };
  }, []);
  // Changing a scope invalidates an in-flight result before it can replace the saved packet.
  useEffect(() => { generation.current++; attempted.current = ""; }, [scope]);
  const save = useCallback(async (automatic = false) => {
    const p = latest.current;
    if (saving.current || !p.dashboard || p.refreshing || !navigator.onLine) return;
    const ticket = ++generation.current; saving.current = true; setBusy(true); if (!automatic) setMessage("Preparando o pacote de campo…");
    try {
      let radar: RadarData | null = null;
      try { const response = await fetch("/api/radar", { cache: "no-store", signal: AbortSignal.timeout(15000) }); const data = await response.json() as RadarData; if (response.ok && data.storageReady && Array.isArray(data.items) && Array.isArray(data.sources)) radar = data; } catch {}
      const next = createFieldPacket(p.dashboard, p.radius, p.hours, p.satellite, p.area, radar, autoSync);
      if (ticket !== generation.current) return;
      const previous = readFieldPacket();
      if (automatic && previous && next.missing.length) throw new Error("A consulta ficou incompleta. O pacote anterior foi preservado; tente atualizar novamente ou salve manualmente a consulta parcial.");
      // A delayed consultation must not overwrite newer data for the same place and cut.
      if (previous && previous.place.id === next.place.id && previous.scopeLabel === next.scopeLabel && previous.hours === next.hours && previous.satellite === next.satellite && previous.capturedAt > next.capturedAt) throw new Error("A cópia salva é mais recente. Atualize os dados antes de substituir.");
      const html = fieldHtml(next);
      const shell = await workerMessage({ type: "SAVE_FIELD", html, packet: next });
      if (ticket !== generation.current) return;
      let stored = false;
      try { localStorage.setItem(FIELD_KEY, JSON.stringify(next)); stored = true; } catch {}
      if (!stored && !shell) throw new Error("Não foi possível guardar a cópia. Libere espaço ou baixe o pacote para o aplicativo.");
      setPacket(next);
      setMessage(`${shell ? "Pacote e reabertura offline salvos neste navegador." : "Pacote preparado. A reabertura offline do navegador não pôde ser confirmada; baixe o arquivo ou envie ao app."}${next.missing.length ? " Partes indisponíveis: " + next.missing.join(", ") + "." : ""}`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Falha ao salvar. A cópia anterior foi preservada."); }
    finally { saving.current = false; setBusy(false); }
  }, [autoSync]);
  useEffect(() => {
    if (!ready || !autoSync || !online || !props.dashboard || props.refreshing || busy) return;
    const key = `${scope}|${props.dashboard.fetchedAt}`;
    if (attempted.current === key) return;
    attempted.current = key; void save(true);
  }, [ready, autoSync, online, scope, props.dashboard, props.refreshing, save, busy]);
  function toggleSync(value: boolean) { setAutoSync(value); attempted.current = ""; try { localStorage.setItem(FIELD_SYNC_KEY, String(value)); } catch {} }
  const filename = packet ? `sentinela-campo-${packet.place.id}-${packet.capturedAt}.json` : "sentinela-campo.json";
  async function share() {
    if (!packet) return;
    const file = new File([JSON.stringify(packet)], filename, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Pacote Sentinela Tapajós" }); setMessage("Escolha Sentinela Tapajós no compartilhamento para importar o pacote. Se não aparecer, use Baixar pacote e Importar no aplicativo."); }
      catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setMessage("Compartilhamento indisponível. Baixe o pacote e use Importar no aplicativo."); }
    } else { downloadFile(JSON.stringify(packet), "application/json", filename); setMessage("Pacote baixado. No Sentinela Tapajós, toque em Importar pacote e escolha esse arquivo em Downloads."); }
  }
  async function remove() {
    generation.current++; toggleSync(false); setPreview(false);
    const shell = await workerMessage({ type: "CLEAR_FIELD" });
    let local = true; try { localStorage.removeItem(FIELD_KEY); } catch { local = false; }
    if (local) setPacket(null);
    setMessage(shell && local ? "Pacote apagado deste navegador e atualização automática desativada." : "A remoção completa não pôde ser confirmada. Limpe os dados do site nas configurações do navegador.");
  }
  return <div className="field-stack">
    <section className="panel field-card"><div className="panel-head"><div><h2><WifiOff size={22}/>Pacote de campo</h2><p>Focos, indicadores, manchetes e mapa 2D sem imagens externas.</p></div><span className={`tiny-tag ${online ? "green-tag" : "amber-tag"}`}>{online ? "Conexão disponível" : "Sem conexão"}</span></div>
      <p>Prepare a cópia antes do deslocamento. O horário da consulta e os horários das fontes permanecem visíveis. No aplicativo, importe o pacote ou use “Enviar para o app”.</p>
      <label className="field-sync"><input type="checkbox" checked={autoSync} onChange={e => toggleSync(e.target.checked)}/><span>Atualizar a cópia neste navegador quando houver dados novos<small>Enquanto o painel estiver aberto, inclusive ao reconectar. Não atualiza arquivos já importados no APK.</small></span></label>
      <div className="operation-actions"><button className="button primary" disabled={busy || props.refreshing || !props.dashboard || !online} onClick={() => void save()}><Download size={17}/>{busy ? "Salvando…" : "Salvar pacote de campo"}</button><button className="button secondary" disabled={props.refreshing || busy || !online} onClick={props.onRefresh}><RefreshCw size={17} className={props.refreshing ? "spin" : ""}/>Atualizar dados</button></div>
      <p className="operation-status" role="status">{message || (packet ? `Consulta salva: ${stamp(packet.capturedAt, true)} · UTC−3` : "Nenhum pacote de campo salvo neste navegador.")}</p>
    </section>
    {packet && <section className="panel field-card"><span className="eyebrow">CÓPIA DISPONÍVEL</span><h2>{packet.scopeLabel}</h2><p><strong>Consulta ambiental: {stamp(packet.capturedAt, true)} · UTC−3</strong><br/>Salvo em {stamp(packet.savedAt, true)} · UTC−3 · {packet.hours} h antes da consulta.</p><p>{packet.fires.length} detecções registradas · {packet.news.length} grupos de notícias. {packet.missing.length ? "Partes indisponíveis: " + packet.missing.join(", ") + "." : ""}</p><div className="operation-actions"><button className="button primary" onClick={() => void share()}><Share2 size={17}/>Enviar para o app</button><button className="button secondary" onClick={() => downloadFile(JSON.stringify(packet), "application/json", filename)}><Download size={17}/>Baixar pacote</button><button className="button secondary" onClick={() => downloadFile(fieldHtml(packet), "text/html;charset=utf-8", filename.replace(".json", ".html"))}>Baixar leitura HTML</button><button className="button secondary" onClick={() => setPreview(v => !v)}>{preview ? "Fechar leitura" : "Ler cópia salva"}</button><a className="button secondary" href="/offline/campo" target="_blank" rel="noreferrer">Abrir offline no navegador</a></div><p>O pacote guardado fica disponível neste aparelho após sair da conta. Use “Apagar pacote” em aparelhos compartilhados.</p><button className="text-button" disabled={busy} onClick={() => void remove()}><Trash2 size={16}/>Apagar pacote deste navegador</button></section>}
    {packet && preview && <section className="panel field-reader"><iframe title="Leitura local do pacote de campo" srcDoc={fieldHtml(packet)} sandbox="allow-scripts" /></section>}
  </div>;
}
