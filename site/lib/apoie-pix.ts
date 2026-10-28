/**
 * Configuração de apoio voluntário ao criador do Sentinela Tapajós.
 * NÃO adiciona compra, assinatura, cobrança, geração de QR ou armazenamento.
 * Todas as configurações ficam desativadas por padrão.
 * O banco deve ser consultado fora do aplicativo para confirmar titularidade.
 */
export interface ApoiePixState {
  enabled: boolean;
  businessName: string | null;
  cnpjKey: string | null;
}

type Env = Record<string, string | undefined>;

export function validCnpj(input: unknown): boolean {
  const value = String(input ?? '').replace(/[.\-/\s]/g, '');
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  for (const length of [12, 13] as const) {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, i) => acc + Number(value[i]) * weight, 0);
    const remainder = sum % 11;
    const expected = remainder < 2 ? 0 : 11 - remainder;
    if (expected !== Number(value[length])) return false;
  }
  return true;
}

export function getApoiePixConfig(env: Env = {}): ApoiePixState {
  // Dois bloqueios independentes: só com habilitação explícita E conferência bancária.
  const permission = env.SENTINELA_PIX_ENABLED === 'true';
  const bankVerified = env.SENTINELA_PIX_VERIFIED === 'true';
  const key = String(env.SENTINELA_PIX_CNPJ || '').trim().replace(/[.\-/\s]/g, '');
  const businessName = String(env.SENTINELA_PIX_BUSINESS_NAME || '').trim();
  const enabled = permission && bankVerified && validCnpj(key) &&
    businessName.length >= 2 && businessName.length <= 100;
  return {
    enabled,
    businessName: enabled ? businessName : null,
    cnpjKey: enabled ? key : null,
  };
}
