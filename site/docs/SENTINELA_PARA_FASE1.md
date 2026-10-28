# Sentinela Pará — Fase 1: catálogo territorial (homologação)

**Situação:** código em revisão, sem publicação, sem migração do D1 e sem alterar coletores.

## Problema identificado

- `lib/environment.ts` usa `PLACES` com oito sedes fixas do Tapajós.
- `app/api/dashboard/route.ts` só aceita IDs dessa lista.
- `lib/areas.ts` e `lib/environment.ts` validam coordenadas dentro de limites regionais, inadequados para todo o Pará.
- Cadastro geográfico **não significa cobertura** de sensores, qualidade do ar, focos de calor ou previsão.

## Primeiro incremento

- Nova rota de leitura `GET /api/territory/municipalities?uf=PA`.
- Fonte: API oficial de Localidades/IBGE, UF 15 (Pará).
- Exige o conjunto completo de **144 municípios**, códigos IBGE com sete dígitos e IDs únicos.
- Ordem alfabética em português; marca cada município com `monitoring: not_verified` e `monitoringCoverage: not_evaluated`.
- Em falha, timeout, dados incompletos ou duplicados, retorna HTTP 503 e **não inventa nem reutiliza um catálogo parcial**.
- Nenhum coletor, agendamento, alerta, D1, R2 ou painel público foi modificado.

## Limitação conhecida

Nesta primeira versão, a rota consulta o IBGE no momento da primeira solicitação e depende da disponibilidade desse serviço e do cache HTTP da hospedagem. Antes de ativar o seletor em produção, criar catálogo versionado como referência local, sincronização controlada e monitoramento independente da fonte. A resposta da rota não contém dados ambientais.

## Validação

```sh
cd site
node --experimental-strip-types scripts/check-para-catalog.mjs
npm run typecheck
```

O teste `check-para-catalog.mjs` usa dados simulados apenas para validar o formato. **Não prova disponibilidade da API externa**. Em homologação, testar a resposta real do IBGE, contar 144 municípios e verificar UTF-8/acentos, falhas e cache.

## Próximas alterações propostas (não incluídas nesta fase)

1. Snapshot versionado do IBGE (144 municípios com metadados e data), conferência periódica e armazenamento controlado.
2. Seletor geográfico com estados/municípios, preservando Itaituba como seleção inicial e as abas existentes.
3. Relacionar IDs antigos de `PLACES` aos códigos IBGE sem romper histórico ou alertas; nunca substituir IDs de forma destrutiva.
4. Agregar detecções por polígono municipal (malha oficial IBGE) e distinguir medição, estimativa e ausência de dados.
5. Ampliar cobertura territorial somente após testar fontes, quotas e coleta independente; primeiro cidades-piloto, depois 144 municípios.
6. Atualizar `AREA_BOUNDS` e os limites de ingestão por recorte territorial, **após** revisar testes e proveniência dos dados.

Fonte do recorte: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/15819-amazonia-legal.html
API: https://servicodados.ibge.gov.br/api/v1/localidades/estados/15/municipios
