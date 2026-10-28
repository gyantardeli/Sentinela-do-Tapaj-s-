# Sentinela Tapajós — candidata V2.3

Integração seletiva ao projeto original, incluindo a Prioridade 1 de SITE_ORIGINAL_INTEGRACAO_PRIORIDADE1.md (GitHub fa1250a). **Preparada para revisão; publicação não autorizada.**

Base original: `c91ccf256c8c9c0460b6ef66e9475a66739bde44`, versão salva 18, projeto `appgprj_6ad394eb7be48191a994993ead538987`.
Fonte: [GitHub V2.2, commit b000690](https://github.com/gyantardeli/Sentinela-do-Tapaj-s-/tree/b000690b9c354c6ccc7badef90a1c2972f765fa0), incluindo a correção do INPE posterior ao commit inicial 444d27f.

## Análise das diferenças

| Parte | Original / GitHub V2.2 | Adaptação V2.3 |
| --- | --- | --- |
| Execução | Original Vinext/Workers/D1; V2.2 Node contínuo e JSON no disco | Mantidos runtime, banco, autenticação e automações originais. Não importados servidor Node, Docker, temporizador em processo ou arquivo de estado do GitHub. |
| Interface | Original contém 3D, áreas, alertas e histórico; V2.2 tem painel independente e incompleto | Mantida a estrutura visual, navegação, estilos, imagens e componentes originais. Nenhum painel da V2.2 foi copiado. |
| HTTP | V2.2 limita corpos e repetições | Transporte comum com timeout, limite durante streaming, classificação de falhas e respeito a Retry-After. Notícias usam uma tentativa por endpoint para conter as requisições do Worker. |
| Ar e meteorologia | Um município inválido podia invalidar o lote original | Validação e recuperação por município. Zero legítimo preservado; falhas não apagam os outros sete resultados. |
| Cache | Horário global e substituição de lotes | Dados e horário de coleta por município; rejeição de modelo antigo e gravação condicional contra perda por concorrência. Registros antigos e protocolo environment-v1 continuam aceitos. |
| Cartões e panorama | Caminhos distintos de consulta | APIs compartilham a resolução ambiental. Município selecionado usa a mesma leitura dos cartões no panorama. |
| INPE | Original combina dois diários e seis arquivos de 10 min; V2.2 só diários | Mantidas atualizações de 10 min e atributos usados em 3D/KML. CSV e UTC mais rigorosos; futuro rejeitado. Parcialidade não vira zero confirmado nos indicadores. |
| INPE parcial | V2.2 b000690 preserva detecções válidas anteriores | União por ID, janela de 24h e horários originais. Coleta completa substitui a anterior, inclusive com zero. Erros de arquivo expõem a causa, como HTTP 404. |
| Persistência de focos | V2.2 depende de arquivo JSON persistente; original mantém arquivo diário agregado em D1 | Histórico D1 original mantido. A Prioridade 1 acrescenta snapshot detalhado durável nas chaves environment:inpe e environment:inpe:chunk:* de radar_settings. Ponteiro, blocos e diagnóstico gravados atomicamente com proteção contra concorrência e ciclos antigos; reinício conserva os pontos. Pacotes offline já salvos continuam preservados. |
| Notícias | Vinte fontes com IDs próprios no original | IDs e histórico mantidos; RSS quebrado tenta /feed/ antes do índice. Índice continua parcial e exige veículo compatível. |
| Saúde | V2.2 devolve diagnóstico compacto | Adicionada /api/health, sem séries inteiras, preservando todos os endpoints antigos. Sucessos antigos não contam como acesso recente. |
| Alertas e offline | Regras, eventos e formatos já existentes | Armazenamento e chaves preservados. O sucesso de uma cidade não renova alerta de outra. Resposta vazia ou de outro município não apaga a última cópia útil do aparelho. |

## Backup e dados

Antes de editar foi gerado `Backup_Sentinela_Original_c91ccf2.zip`, com todo o código rastreado do original, configuração de hospedagem, esquema e migrações.

**Este é um backup do código, não um dump completo do banco.** A inspeção de produção disponível é somente leitura e trunca valores grandes; não foi anunciada como cópia restaurável dos dados. Preferências e cópias em aparelhos não foram exportadas.

Não foram efetuadas gravações D1 em produção, migrações, alterações de permissões, alterações de automações ou implantação. Esquema e migrações foram comparados com o original e permanecem idênticos. Os testes de escrita usam SQLite isolado em memória e em arquivos temporários, incluindo recuperação após reinício. A rotina existente pode continuar atualizando os dados de produção por conta própria.

## Verificação

- V2.2 atual do GitHub: 35 testes aprovados.
- V2.3: 20 grupos de regressão novos, cobrindo HTTP 429/503, tamanho real, timeout, falhas municipais, zero legítimo, concorrência, respostas antigas, coerência das APIs, cache do navegador e união INPE parcial/completa.
- Prioridade 1: 14 grupos adicionais, incluindo snapshots duráveis, substituição por vazio válido, falhas por arquivo, concorrência, rollback e coletor completo sem frontend, inclusive com INPE indisponível.
- Seis suítes existentes: monitoramento/histórico; alertas/boletins; áreas/monitor/PWA; reprodução 3D; KML; pacote/leitor de campo.
- Comparação da árvore visual dos elementos da página e do panorama com a base original; estilos, arquivos 3D, geometria/armazenamento de áreas, armazenamento de alertas, autenticação, manifest e migrações preservados.
- TypeScript executado; compilação de produção obrigatória no empacotamento da candidata.
- Consulta real das fontes é separada dos testes e registrada em `sources-live-v23.json`. Uma falha real é reportada como tal; testes simulados não garantem disponibilidade contínua dos vinte veículos.

Teste visual em navegador e teste desta candidata no Android permanecem pendentes. O APK anterior não foi alterado.

## Revisão

A versão é salva no mesmo projeto sem implantação; o endereço de produção permanece na versão anterior. Não há link hospedado de prévia navegável neste ambiente. O código da candidata e o relatório permitem revisão. A validação funcional disponível cobre as APIs e o coletor em banco de teste; a inspeção visual continua pendente.

Uma publicação futura depende da autorização explícita do proprietário e de nova conferência das alterações concorrentes e do banco. O GitHub continua como referência, sem publicação automática configurada e sem alteração da sua branch main.

```sh
npm run check:v23
npm run check:sources
npm run check:priority1-live
```
