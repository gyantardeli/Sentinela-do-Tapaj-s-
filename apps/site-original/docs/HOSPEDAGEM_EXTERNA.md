# Sentinela Tapajós — preparação de hospedagem Cloudflare (staging privado)

**Status: preparação e compilação de staging verificadas em CI; NÃO implantado.** Branch de revisão, **snapshot original V2.3**. Versões posteriores V24 precisam ser comparadas antes de publicação. Nunca importar a raiz V2.2 como se fosse o site original.

## Estado da conta Cloudflare (informado pelo proprietário em 22/10/2026)

- **Zero Trust Team domain:** `https://sentinela-tapajos.cloudflareaccess.com` (identificador público configurado no build isolado).
- **Política de acesso:** `Sentinela Tapajos - Administradores` confirmada diretamente pela API Cloudflare como reutilizável, ação `allow`, 8h, restrita ao e-mail autorizado. **Ainda não foi vinculada a nenhum Access Application ou ao Worker de staging.**
- **Application Audience (AUD):** não informado; será obtido ao criar/vincular a aplicação Access ao Worker. Não existe placeholder aceito como identidade válida.
- **D1 staging:** banco `sentinela-tapajos-staging` conferido diretamente na conta Cloudflare. Em 22/10/2026 foram aplicadas as migrações SQL `0000`–`0003`, criando 9 tabelas de aplicação e 6 índices. O identificador real é mantido fora do repositório público. Dados e tabelas de produção não foram importados.
- **Deploy remoto do Sentinela V2.3:** não executado. Worker existente `sentinela-do-tapajos` identificado na conta e preservado; não confundir com o Worker isolado `sentinela-tapajos-staging` planejado. É obrigatório validar Worker-level Access **All traffic**, D1 de testes, variáveis e teste anônimo de páginas, APIs e arquivos estáticos antes de disponibilizar uma URL.
- **Rotas externas:** `workers_dev:false`, `preview_urls:false`, sem domínio/route pública configurada no código. Proteção adicional: `assets.run_worker_first:true`. Mesmo assim, **é obrigatório ativar Access na plataforma antes de conectar qualquer domínio**.
- **CI:** a compilação e os testes de gateway são executados sem tokens, sem banco remoto e sem `wrangler deploy`.

### Próxima operação no painel da Cloudflare

1. **D1 concluído:** banco `sentinela-tapajos-staging` validado; migrações `0000`–`0003` aplicadas e verificadas (9 tabelas, 6 índices). Não repetir as migrações, pois contêm `CREATE TABLE` sem `IF NOT EXISTS`. Não usar o D1 do ChatGPT Sites.
2. **Workers & Pages**: ainda não publique. Quando existir um Worker de staging, abra a proteção Cloudflare Access desse Worker e escolha **All traffic**, associando a política `Sentinela Tapajos - Administradores`. A opção Worker-level protege URLs de produção e prévia, independentemente de hostname. Documentação oficial: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
3. Anote o **Application Audience (AUD)** exibido na aplicação Access. O AUD identifica a aplicação; não é senha. A aplicação continua bloqueada se `ACCESS_AUD` não tiver sido configurado no ambiente Worker.
4. **Não ative integrações GitHub de auto-deploy** para a pasta do site recuperado. O repositório é público e contém duas aplicações distintas. Mantenha `main` e a PR #3 intocados até validar as diferenças com V24.
5. O UUID está confirmado na conta Cloudflare; **a aplicação Access e o AUD ainda não existem**. Primeiro criar um Worker de staging isolado sem conteúdo público, associar Access `All traffic`, verificar as regras e configurar `ACCESS_AUD`. Só depois montar/deployar o bundle completo do Vinext e executar testes remotos. Nunca usar o Worker preexistente `sentinela-do-tapajos` como alvo da migração automática. Variáveis e tokens de administração do Cloudflare não devem ser publicados no repositório.

## Arquitetura

- **Frontend/API:** Vinext / Cloudflare Workers, com `vite.external.config.ts` isolado da configuração do ChatGPT Sites.
- **Gateway:** `build/external-worker.ts`, valida o JWT `Cf-Access-Jwt-Assertion` por **assinatura RS256**, emissor, audience, expiração e identidade; rejeita requisições não autenticadas, inclusive leituras e escritas. Nunca confia em cabeçalhos `oai-authenticated-*` de visitantes. Os headers internos de compatibilidade são criados somente a partir da identidade autenticada do Access.
- **Banco:** Cloudflare D1 **novo e separado** do banco original, binding `DB`. Nenhum registro de produção foi importado.
- **Exposição:** `workers_dev:false`, `preview_urls:false`, `assets.run_worker_first:true`; usar Cloudflare Access com política **Worker-level All traffic**, inclusive previews, e adicionar domínio customizado após conferir o acesso. A proteção do Worker deve ser ligada no painel Cloudflare antes de direcionar tráfego real.
- **Coletor de notícias/histórico:** a rotina anterior requer bypass interno exclusivo do Sites, portanto **não é operacional externamente** nesta entrega. Não habilitar jobs externos nem expor tokens. Recriar integração com Cloudflare Access service tokens e autorização servidor a servidor numa etapa posterior.

## Passo a passo para ativar um ambiente separado (sem dados de produção)

1. Crie sua conta [Cloudflare](https://dash.cloudflare.com) e configure **Cloudflare One / Access** com uma política de acesso limitada aos operadores autorizados. Exija MFA. Crie aplicação Access para proteger o Worker **All traffic** (inclusive previews). Registre o Team domain `https://NOME-DO-TIME.cloudflareaccess.com` e o **Application Audience (AUD)**; não copie credenciais para GitHub.
2. Crie um banco D1 vazio **separado**: `npx wrangler d1 create sentinela-tapajos-staging`. Guarde o UUID gerado. Não aponte ao D1 de produção do ChatGPT Sites.
3. No clone do repositório, mude para a branch de revisão e entre em `apps/site-original/`. Instale dependências segundo o gerenciador fixado no `package.json` e o lockfile, em Node >=22.13.
4. Execute `node scripts/check-external.mjs` e `node --test test/external-access.test.mjs`. Depois rode `npm run check:v23` e ajuste falhas de portabilidade. **Build externo em CI passou em 22/10/2026**, usando as dependências do lockfile e sem credenciais Cloudflare. Isso não substitui os testes integrados com D1 real nem validação operacional.
5. Para prévia de compilação, informe ID e nome do banco localmente (não no repositório):

   ```sh
   export SENTINELA_D1_ID="<UUID-NOVO-STAGING>"
   export SENTINELA_D1_NAME="sentinela-tapajos-staging"
   export SENTINELA_EXTERNAL_DEPLOY="1"
   pnpm exec vite build --config vite.external.config.ts
   ```

   O `vite.external.config.ts` compila em entrada distinta; `vite.config.ts` do Sites permanece inalterado. Se o build não gerar uma configuração `dist/server/wrangler.json` adequada, **não publique** e revise a compatibilidade Vinext/Cloudflare Vite plugin. Não use `wrangler deploy` sem inspeção.
6. Revise cada migração em `drizzle/0000...0003...sql` antes de aplicá-la ao D1 de staging. Elas são do Drizzle original e podem depender da estrutura de produção; use `wrangler d1 execute ... --remote --file` individualmente conforme o esquema e os dados presentes. Faça backup antes de qualquer migração; não execute migrações automaticamente em CI.
7. Configure as variáveis de ambiente do Worker `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD` (a aplicação falha com **503** se ausentes). O gateway retorna **401** se o JWT Access faltar ou for inválido. Valide login, logout via Cloudflare Access, filtros e autenticação de **todas** as APIs. Confira que uploads/escritas de visitante anônimo devolvem 401 e que `oai-authenticated-*` falsificados não liberam acesso.
8. **Antes de expor qualquer URL:** ative Access para o Worker inteiro na Cloudflare e limite a política a operadores autorizados. Só depois configure domínio dedicado `staging.seu-dominio.com`. Confirme que usuários não autorizados não acessam endpoints, assets de campo e previews. Verifique a versão de `wrangler` e a compatibilidade do build gerado antes de fazer deploy manual.

## Validação GitHub Actions

- Execução: [Validar preparação de hospedagem externa — GitHub Actions](https://github.com/gyantardeli/Sentinela-do-Tapaj-s-/actions/runs/39785388429).
- Teste de gateway/JWT (4 cenários), verificação estática (9 rotas de gravação), instalação de dependências e **build externo isolado: aprovados**.
- Nenhum deploy, criação remota de banco D1 ou teste de migração foi executado pela Action. A compilação não comprova compatibilidade com a versão do site publicada posteriormente ao snapshot V2.3.

## Pontos críticos antes da produção

- **Dados:** Backup V2.3 não contém o conteúdo D1; sem importação, histórico, áreas e alertas podem iniciar vazios. Migrar estado do banco somente com exportação autorizada e plano de rollback, sem copiar identificadores individuais do SIWC como se fossem identidades do Access.
- **Autenticação e privacidade:** o gateway usa IDs `cloudflare:<sub>`; isso **não equivale** aos antigos IDs do ChatGPT Sites. Validar políticas para todos os usuários e não assumir multiusuário isolado: parte dos dados de áreas/alertas é global.
- **Verificar JWT:** o Worker valida assinatura e claims antes de qualquer função da aplicação. Bloqueio via Access também deve cobrir rotas diretas e URLs de preview. Se a lista de chaves da Cloudflare estiver indisponível, o servidor nega acesso.
- **Licenças:** mapas externos, base satélite, AccuWeather, Clima & Radar, SELVA e Windy exigem conferência de políticas e chaves antes de ingestão automatizada. Boletins PDF precisam de fontes licenciadas.
- **Roteiro de aceitação:** testar 2D/3D, replay de calor, INPE parcial, filtros municipais, panorama, previsão, offline/PWA, KML/PDF, áreas, alertas, histórico, API de saúde e monitor de coleta; conferir horários e proveniência. Nenhum “zero” deve ser inventado quando a fonte falhar.
- **Não fazer merge na `main`/não publicar** até concluir o build remoto, proteção do Worker, migração segura do D1, integração do coletor, inspeção de assets e comparação com V24.

Documentação: [Cloudflare Access JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Cloudflare Workers Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [vinext](https://vinext.dev/docs/deploying/cloudflare), [D1](https://developers.cloudflare.com/d1/wrangler-commands/).
