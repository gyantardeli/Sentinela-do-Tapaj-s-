'use client';

import { useState } from 'react';

type Props = { cnpj: string };

export function ApoiePixCopy({ cnpj }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(cnpj);
      setCopied(true);
      setError(false);
    } catch {
      setError(true);
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copyKey} aria-live="polite"
      style={{ background: '#236344', color: 'white', border: 0, borderRadius: 10, padding: '12px 16px', font: 'inherit', cursor: 'pointer' }}>
      {error ? 'Selecione e copie a chave acima' : copied ? 'Chave copiada ✓' : 'Copiar chave Pix empresarial'}
    </button>
  );
}
