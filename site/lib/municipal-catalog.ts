/** Catálogo geográfico: não representa disponibilidade de monitoramento ambiental. */
export const PARA_UF_CODE = "15";
export const PARA_MUNICIPALITY_COUNT = 144;
export const PARA_IBGE_ENDPOINT = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/15/municipios";

export type ParaMunicipality = {
  ibgeCode: string;
  name: string;
  state: "PA";
  monitoring: "not_verified";
};

/** Valida a resposta oficial completa; rejeita resultados parciais e duplicados. */
export function normalizeParaCatalog(input: unknown): ParaMunicipality[] {
  if (!Array.isArray(input) || input.length !== PARA_MUNICIPALITY_COUNT) {
    throw new Error("Catálogo IBGE incompleto: esperados 144 municípios do Pará.");
  }
  const seen = new Set<string>();
  const municipalities = input.map((row: unknown): ParaMunicipality => {
    if (!row || typeof row !== "object") throw new Error("Município inválido no catálogo do IBGE.");
    const value = row as Record<string, unknown>;
    const ibgeCode = String(value.id ?? "");
    const name = value.nome;
    if (!/^15\d{5}$/.test(ibgeCode) || typeof name !== "string" || !name.trim() || name.length > 120 || seen.has(ibgeCode)) {
      throw new Error("Código IBGE, nome ou unicidade inválidos no catálogo do Pará.");
    }
    seen.add(ibgeCode);
    return { ibgeCode, name: name.trim(), state: "PA", monitoring: "not_verified" };
  });
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
  return municipalities.sort((a, b) => collator.compare(a.name, b.name));
}
