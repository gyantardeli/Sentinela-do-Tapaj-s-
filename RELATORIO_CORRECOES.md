# RELATÓRIO DE CORREÇÕES — Sentinela Tapajós V2.1

Data: 18/10/2026 | Área: monitor de dados ambientais e notícias | Região: oeste do Pará

## Alterações implementadas

| Inconsistência | Correção e validação |
|---|---|
| Valores na lista regional sem correspondência na visão geral | `environment-view.mjs` monta os indicadores e o panorama do mesmo snapshot e `frontend-adapter.mjs` rejeita payload contraditório. |
| Um município com erro inutilizava o lote inteiro | Parsing parcial por município e preservação do último resultado válido apenas para o município que falhou. |
| Hora da consulta confundida com hora da leitura | Estado por município compara `observadoEm`; dados antigos são rotulados como defasados. |
| Fonte jornalística do Pará inteiro exibida como local | Critérios geográficos exigem municípios/eixos de interesse ou indicação inequívoca do oeste do Pará. |
| Cache de notícia irrelevante persistia até 30 dias | Revalidação de notícias históricas com os critérios corrigidos. |
| Coleta INPE falhava e mostrava zero | Zero só é contado como comprovado quando os arquivos estão íntegros e recentes; coleta parcial produz `null` ou limite inferior. |
| Cobertura 20 fontes confundia RSS, índices e erros | Fontes com consultas antigas não contam como acesso recente; relatório separa RSS, índice parcial, erro e não consultadas. |
| Fonte RSS publicada no site está quebrada | Tentativa validada do `/feed/` antes de recorrer ao índice parcial. |
| Offline confundido com dado atual | Cache é marcado como histórico do aparelho, com horário próprio e aviso visível na integração. |
| Resposta de saúde muito extensa | `/api/health` retorna metadados e estados, sem duplicar toda a série do INPE e da qualidade do ar. |

## Validação

- `npm run check`: 25 testes automatizados concluídos, 25 aprovados.
- API HTTP sem dados: `/api/health`, `/api/environment`, `/api/radar` responderam corretamente com 20 fontes, oito municípios e ausência de zeros inventados.
- Fontes ambientais e RSS foram simuladas para testar o comportamento de falhas; essa validação **não substitui testes reais de rede e conformidade dos provedores**.
- A hospedagem pública e a APK existente **não foram atualizadas**. Requer acesso ao código-fonte, infraestrutura de backend e integração das APIs.

## Instruções

Consulte `MIGRACAO_V2.1.md` e `README.md` para os comandos, contratos, arquitetura e validação antes de publicar.
