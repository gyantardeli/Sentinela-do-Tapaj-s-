"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");
  useEffect(() => {
    fetch("/api/access", { cache: "no-store", credentials: "same-origin" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: unknown) => setState(typeof data === "object" && data !== null && "canManage" in data && data.canManage === true ? "allowed" : "denied"))
      .catch(() => setState("denied"));
  }, []);
  return (
    <main style={{ maxWidth: 660, margin: "6rem auto", padding: "1.5rem", color: "#edf9ef" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 16 }}>Sentinela Tapajós · Administração</h1>
      {state === "checking" && <p>Validando sessão de acesso...</p>}
      {state === "allowed" && <p>Sessão administrativa verificada. As alterações permitidas podem ser realizadas no painel enquanto a sessão estiver válida.</p>}
      {state === "denied" && <p>Acesso negado. A sessão não pôde ser validada para o administrador autorizado. Retorne ao painel e tente entrar novamente.</p>}
      <a href="/" style={{ display: "inline-block", marginTop: 22, color: "#9ff5bc", textDecoration: "underline" }}>Voltar para o painel</a>
    </main>
  );
}
