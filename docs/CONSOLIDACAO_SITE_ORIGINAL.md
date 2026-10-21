# Consolidação do código original do Sentinela Tapajós

**Em revisão — importação do código original recuperado, não uma publicação.**

## Origens auditadas (21/10/2026)

| Conjunto | Estado |
| --- | --- |
| Raiz do repositório | Coletor e painel Node/PWA V2.2; preservados |
| ChatGPT Sites | Aplicação distinta Next.js/Vinext/Workers com D1; código recuperado do backup V2.3 / Prioridade 1 |
| Backup recuperado | `Previa_Sentinela_V2.3_Prioridade1.zip`, da Biblioteca do proprietário |
| Modificações posteriores | Site original teve atualizações v22–v24 após esse snapshot; **não foram recuperadas integralmente** |
| Dados D1/credenciais | **Não incluídos**; necessitam migração segura e separada |
| Publicação externa | **Não executada** |

## Pacote de código recuperado

O arquivo `Sentinela_Tapajos_Codigo_Original_V23_Consolidacao.zip` preparado para importação contém **244 arquivos-fonte originais** sob `apps/site-original/`, junto de documentação, manifesto de hashes SHA-256 e configuração sanitizada.

SHA-256 do arquivo ZIP: `2a1c0144f9068cde3485f4cfd96eaab46e4eb2dcdf8833b79af076ce8fb2df5b`.

### Importação

1. Obtenha o ZIP gerado na conversa do projeto. Este documento **não indica que o conteúdo binário foi enviado ao GitHub**.
2. No clone do repositório, mantenha o código Node/PWA V2.2 na raiz.
3. Execute `python scripts/importar_original_zip.py /caminho/para/Sentinela_Tapajos_Codigo_Original_V23_Consolidacao.zip` a partir da raiz do repositório.
4. Confirme `git status` e revise cada alteração. Arquivos esperados: `apps/site-original/**`, `CONSOLIDACAO_GITHUB.md` e `MANIFESTO_SHA256.json`.
5. Faça commit **na ramificação de revisão**; não implante antes de validar autenticação, D1, persistência e testes.

## Componentes recuperados

- `components/fire-terrain-map.tsx`, `components/fire-replay-panel.tsx`: mapa 3D e reprodução de focos.
- `components/areas-panel.tsx`, `lib/area-store.ts`: áreas de interesse.
- `components/alerts-panel.tsx`, `lib/alerts-store.ts`: alertas e persistência.
- `components/history-panel.tsx`, `lib/history-collector.ts`: histórico.
- `components/weather-panel.tsx`, `lib/weather-providers.ts`: previsão e provedores.
- `app/api/`, `db/`, `drizzle/`: API e esquema D1.
- `public/sw.js`, `public/manifest.webmanifest`: PWA e cache offline.

## Riscos que impedem publicação imediata

- O Sites fornece autenticação e cabeçalhos `oai-authenticated-*` confiáveis *apenas* no perímetro do serviço. Em hospedagem externa, **não confiar em cabeçalhos HTTP enviados por visitantes**; substituir por autenticação validada no servidor e proteger rotas de gravação.
- Os dados atuais do D1 **não estão no backup de código**. Uma implantação nova sem migração pode iniciar vazia.
- A aplicação original executa em Workers/D1, enquanto a raiz V2.2 usa Node com arquivo local. Não misturar runtimes, jobs ou bancos sem plano de migração.
- Arquivos TTF proprietários/distribuídos separadamente foram excluídos; boletins PDF necessitam fontes licenciadas localmente ou adaptação.
- Testes completos, build e conexão real com fontes externas **não foram concluídos nesta extração**. O empacotamento e sintaxe dos módulos `.mjs` foram conferidos.

O GitHub desta ramificação contém documentação e um importador seguro. O envio dos 244 arquivos-fonte ao GitHub só estará concluído quando o ZIP for efetivamente importado e os arquivos aparecerem na árvore do PR.
