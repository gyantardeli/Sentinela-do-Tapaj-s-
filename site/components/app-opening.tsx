"use client";

import { useEffect, useRef, useState } from "react";

/** A short, dismissible opening for the installed app; independent of data requests. */
export default function AppOpening() {
  const [visible, setVisible] = useState(false);
  const enter = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches
      || window.matchMedia("(display-mode: fullscreen)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!installed || window.location.hash) return;
    try {
      if (sessionStorage.getItem("sentinela-opening-v2")) return;
      sessionStorage.setItem("sentinela-opening-v2", "shown");
    } catch { /* A restricted browser can still show the opening. */ }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const before = document.activeElement as HTMLElement | null;
    const button = enter.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    button?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      if (document.activeElement === button) before?.focus({ preventScroll: true });
    };
  }, [visible]);

  if (!visible) return null;
  return <div className="app-opening" role="dialog" aria-modal="true" aria-labelledby="app-opening-title" onKeyDown={event => {
    if (event.key === "Escape") setVisible(false);
    if (event.key === "Tab") { event.preventDefault(); enter.current?.focus(); }
  }}>
    <img className="app-opening-art" src="/branding/tapajos-guardian-opening-v2.webp" alt="Harpia guardiã envolvendo um rio e a floresta amazônica com suas asas." width="900" height="900" fetchPriority="high" />
    <div className="app-opening-title"><h2 id="app-opening-title">Sentinela Tapajós</h2><p>Monitoramento Ambiental</p></div>
    <button ref={enter} type="button" className="app-opening-enter" onClick={() => setVisible(false)}>Entrar no painel <span aria-hidden="true">→</span></button>
  </div>;
}
