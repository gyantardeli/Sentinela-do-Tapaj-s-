"use client";
export default function ExplorerDiary({ onBack }: { onBack: () => void }) {
  return <section className="explorer-diary" aria-label="Diário do Explorador">
    <div className="diary-toolbar">
      <p>8 capítulos · 24 referências de capítulo</p>
      <div><a href="/diario/index.html" target="_blank" rel="noopener noreferrer">Tela inteira ↗</a>
      <button type="button" onClick={onBack}>← Voltar à visão geral</button></div>
    </div>
    <iframe title="Diário do Explorador — oito páginas interativas" src="/diario/index.html" referrerPolicy="no-referrer" />
  </section>;
}
