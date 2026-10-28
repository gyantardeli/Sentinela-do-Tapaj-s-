# Prioridade 1 — candidata no Site original

Projeto: `appgprj_6ad394eb7be48191a994993ead538987`. Base: versão salva 20, commit `ed5c99c0a5659289c24316bc44ccafbdb5669deb`. Esta candidata é somente salva, sem implantação ou segundo Site.

Especificação lida: [SITE_ORIGINAL_INTEGRACAO_PRIORIDADE1.md em fa1250a](https://github.com/gyantardeli/Sentinela-do-Tapaj-s-/blob/fa1250aa55669d45de464adff6ba5d08eacd7ed7/SITE_ORIGINAL_INTEGRACAO_PRIORIDADE1.md). Código de referência: `collector.mjs` e diagnóstico de `server.mjs` em `b000690b9c354c6ccc7badef90a1c2972f765fa0`. O servidor Node, seu temporizador e seu frontend independente não foram copiados.

## Diferenças resolvidas

| Contrato | Versão 20 | Candidata Prioridade 1 |
| --- | --- | --- |
| Focos detalhados | Cache em memória, perdido em novo Worker | Snapshot D1 durável, lido também pelo dashboard após reinício. |
| Dia parcial | União de pontos válidos de até 24 h | Mantida; dados e atributos anteriores enriquecem duplicatas. |
| Dois diários válidos e vazios | Cobertura temporal parcial impedia limpar o cache | `dailyComplete` distingue recebimento de arquivos da cobertura temporal. Substitui os pontos por vazio válido e mantém ressalva sobre atraso. |
| Dois diários indisponíveis | Arquivo de 10 min poderia atualizar a leitura | Último snapshot preservado, mesmo que um arquivo suplementar responda; horário da atualização anterior mantido. |
| Diagnóstico INPE | Texto resumido e histórico agregado | Arquivos, causas, horários, pontos recuperados e total em cache; detalhe no monitor existente, sem modificar seu componente. |
| Coleta sem frontend | Runner agendado arquivava contagens diárias | Mesmo runner também grava e relê o snapshot detalhado, incluindo tentativas que falharam. |

## Inventário e armazenamento

- Backend original Vinext/Cloudflare Workers; vínculo `DB` existente, sem migração ou mudança de esquema. As nove tabelas atuais permanecem intactas.
- `/api/environment`, ingestão ambiental, radar, histórico, áreas, alertas e watchdog mantêm contratos. `environment-v1`, `regional-history-v1` e `radar-tapajos-v5` preservados.
- Novos `/api/fires` (resumo) e `/api/fires/ingest` (writer autenticado pelo controle de acesso existente); protocolo `inpe-snapshot-v1`.
- Somente novas chaves `environment:inpe` e `environment:inpe:chunk:*` em `radar_settings`. Blocos limitados a aproximadamente 180 kB; ponteiro, blocos e saúde mudam numa transação D1. Sem apagar configurações ou históricos antigos.
- Compare-and-swap no valor do ponteiro, nova leitura em concorrência e carimbo de tentativa monotônico. Repetições e execuções antigas não regravam o snapshot. Leitura concorrente repete se o ponteiro mudou.
- CSVs oficiais de hoje e ontem em UTC, mais os seis suplementos já usados pelo original. Falhas 404/429/timeout/HTML/CSV inválido são diagnosticadas. Pontos fora de 24 h ou futuros não retornam como leitura atual.
- Nenhum GET grava D1. A coleta de um visitante antes do primeiro snapshot permanece uma consulta sem persistência. Após a primeira rotina, o dashboard usa o snapshot durável.
- Limites explícitos: ingestão até 8 MB e 30.000 pontos por pacote; snapshot até 90 blocos. Excesso é rejeitado, preservando o anterior e sem truncar silenciosamente contagens.

## Preservação e backup

Código anterior e configuração rastreada: `Backup_Sentinela_antes_Prioridade1.zip`, commit ed5c99c, SHA-256 `4d59f5d27982e4bd38756e2c5469f2c3396c98d742b8bdeeb67402b8515d348a`.

Mapa 3D, componentes, CSS, página, áreas, alertas, autenticação, service worker, formatos offline, esquema, migrações e identidade do Site foram comparados com a versão 20 e não foram alterados nesta etapa. A regressão V2.3 também compara a estrutura visual com a versão original restaurada, c91ccf2.

O backup não é um dump de produção: a API disponível trunca valores grandes, impossibilitando uma cópia integral restaurável do banco. Não houve exportação de cópias dos aparelhos. A configuração de variáveis em produção foi consultada apenas em leitura; não havia entradas configuradas. Credenciais de acesso transitórias não foram salvas ou expostas. Não foram executados writers, migrações ou mudanças de permissões em produção.

## Testes e evidências

- GitHub V2.2 b000690: 35 testes aprovados.
- V2.3: 20 grupos de regressão aprovados.
- Prioridade 1: 14 grupos adicionais. CSV inválido, 404/429, falha total/parcial, vazio válido, 24 h, deduplicação/atributos, replay, concorrência, rollback, blocos grandes, corpo excessivo, APIs somente leitura, reinício com SQLite em disco.
- Runner completo executado sem importar página nem abrir navegador. Duas execuções: fontes respondendo e INPE falhando com 429; ar, vento e radar continuam gravados, INPE mantém seu horário anterior. Nova instância lê os dados persistidos.
- Seis suítes originais aprovadas: monitoramento/histórico, operações/alertas, áreas/PWA, reprodução 3D, KML e campo/offline. TypeScript aprovado; compilação via workflow Sites realizada antes de salvar.
- Integração real separada em 19/10/2026, 19:16 UTC: INPE com 3.066 detecções na região ampliada do original, dois diários e seis suplementos válidos; Open-Meteo respondeu para 8/8 municípios em ar e meteorologia. Pacotes passaram pela validação e persistência local; novo contexto de backend recuperou os mesmos dados. Nenhuma escrita de teste foi enviada à produção. Estes resultados não garantem disponibilidade futura das fontes.

Reproduzir:

```sh
npm run check:v23
npm run check:priority1-live
```

Mocks e consultas reais têm arquivos de evidência separados; resultados são incluídos no pacote de revisão.

## Agendamento e limites de aceite

Há duas automações HORÁRIAS habilitadas no próprio Site, preservadas: coleta central e monitor independente. A coleta existente manda obter a revisão vigente de `/api/radar/instructions`, verificar o SHA-256 do runner e executá-lo fora do Worker, gravando e relendo os dados. Não depende de página aberta, setInterval ou processo web contínuo. O prompt e os agendamentos não foram modificados nem duplicados.

A consulta de produção de 19:16 UTC encontrou execução do radar com 20 fontes consultadas, 19 acessíveis naquela execução, e oito municípios armazenados para ar e tempo. O cadastro das automações registra execuções recentes. Isto confirma registros do serviço existente; não prova a execução hospedada do novo writer. Como a candidata não foi publicada, sua primeira execução real na hospedagem e leitura posterior só poderão ser validadas após autorização e implantação. O teste sem frontend desta candidata usa o runner real com serviços e D1 simulados localmente.

Não há infraestrutura disponível de prévia navegável neste ambiente (`current_preview_url` ausente e control-browser indisponível). A candidata é salva como versão do mesmo projeto, com build e código para revisão; inspeção visual e teste Android desta versão permanecem pendentes. A URL de produção segue na versão publicada anterior. Nenhuma publicação foi autorizada.
