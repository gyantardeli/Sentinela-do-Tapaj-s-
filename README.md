# Sentinela Tapajós — Projeto integrado V2.2

Versão web/PWA que **integra** o coletor resiliente V2.1 com um painel funcional de visualização e diagnóstico. O frontend é uma implementação nova baseada na estrutura funcional documentada do projeto. **Não modifica o site antigo automaticamente.**

## Projeto original recuperado na branch de consolidação

O código do ChatGPT Sites recuperado do snapshot **V2.3 / Prioridade 1** está separado em [`apps/site-original/`](apps/site-original/). A pasta raiz continua sendo o painel independente **Node/PWA V2.2**. A importação dos 248 itens foi verificada byte a byte em 22/10/2026. O estado posterior **V24**, dados do banco D1 e credenciais não foram migrados. Consulte [`docs/CONSOLIDACAO_SITE_ORIGINAL.md`](docs/CONSOLIDACAO_SITE_ORIGINAL.md) e a [PR #3](https://github.com/gyantardeli/Sentinela-do-Tapaj-s-/pull/3).

## Projeto publicado e integração com ChatGPT Sites

- **Site original:** [Sentinela Tapajós — Queimadas e qualidade do ar](https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/)
- **Repositório de desenvolvimento:** [gyantardeli/Sentinela-do-Tapaj-s-](https://github.com/gyantardeli/Sentinela-do-Tapaj-s-)
- **Situação:** associação documentada; **não existe sincronização automática ou implantação deste GitHub no Site original**.
- **Código na raiz:** implementação independente V2.2. Seus módulos não são equivalentes ao original. **Snapshot V2.3 do site recuperado em `apps/site-original/` somente nesta branch de revisão**, preservando mapa 3D, áreas, alertas e histórico daquele snapshot.
- **Próxima integração:** abrir o Site existente no ChatGPT Sites/Work, referenciar este repositório e integrar seletivamente coletor e APIs; revisar prévia e banco antes de publicar na mesma URL. Não substituir o frontend original pela V2.2 inteira sem auditoria.

Para passos operacionais, consulte [VINCULAR_CHATGPT_SITES.md](VINCULAR_CHATGPT_SITES.md).

## Correções da Prioridade 1 — outubro de 2026

- Quando o CSV diário do INPE falha **parcialmente**, o coletor combina as novas
  detecções com registros válidos do cache, limitados às últimas 24 horas, por
  coordenadas + horário + satélite. A situação permanece `parcial`; não representa
  uma contagem completa.
- Quando ambos os arquivos diários são recuperados, o INPE substitui o cache,
  inclusive se o conjunto tiver zero detecções.
- A rota `GET /api/health` mostra `camadas.inpe.diagnostico.arquivos`,
  `errosParciais`, `falhasUltimaTentativa`, `recuperadosCache` e o foco mais
  recente. Também disponibiliza `mensagem` e `tipoErro` por camada.
- O teste `test/autocoleta.test.mjs` inicia um servidor em processo separado
  com respostas simuladas, confirma gravação em disco **sem navegador** e
  reinicia o servidor para verificar a recuperação do estado.

**Validação:** `npm run check` (mock de rede, sem garantir disponibilidade
atual dos serviços externos). Em produção, confirme separadamente a publicação
do servidor, o volume persistente `DATA_DIR` e os horários reais das fontes.

**Site original:** nenhuma alteração neste repositório publica automaticamente
na URL anterior do ChatGPT Sites nem atualiza o APK; a implantação é uma etapa
independente.

## Executar

Requer Node.js 20+. Não necessita instalar pacotes.

```bash
npm run check
ENABLE_AUTO_COLLECT=0 node server.mjs
# Acesse http://127.0.0.1:8787
```

Para coletar informações públicas (servidor conectado): `ENABLE_AUTO_COLLECT=1 node server.mjs`.
Para implantação estável com Docker e volume persistente, consulte `deploy/GUIA_PUBLICACAO.md`.

## O que está integrado

- **Visão geral:** filtros de município, raio, período e satélite; cartões de focos INPE, PM2,5 estimado, vento modelado e status de medição física; dados ausentes não equivalem a zero.
- **Mapas:** iframe externo Windy, quando houver conexão, e representação esquemática dos focos INPE carregados (sem carta-base, portanto não é mapa topográfico nem satélite).
- **Panorama regional:** oito municípios e mesma referência do indicador principal, sem dividir a origem do cache.
- **Notícias:** mostra até quatro matérias válidas, separa RSS direto de índice parcial, destaca se o cache de notícias está offline.
- **Diagnóstico:** 20 fontes detalhadas, status das três camadas, erros e frescor em `/fontes`.
- **Offline/PWA:** a interface é armazenada pelo service worker e leituras pelo adaptador com identificação do snapshot.
- **Backend:** três endpoints de leitura e comando POST protegido por `COLLECT_TOKEN`, rotina horária em processo ativo e estado JSON persistente.

## Contratos API

- `GET /api/environment?municipio=itaituba&raioKm=100&horas=24&satelite=todos`
- `GET /api/radar?limit=100`
- `GET /api/health`
- `POST /api/collect` (Bearer token, não configurado por padrão)

## Testes e limitações

`npm run check` executa os testes do coletor, das regras de consistência e de integração HTTP. Os testes unitários usam provedores simulados e os testes HTTP usam servidor com coleta desabilitada. **Não há validação de conectividade real das 20 fontes nesta entrega.** A automação de screenshot/browser foi impedida pelas restrições de acesso local do navegador de testes; layout deve ser inspecionado no ambiente de implantação.

A raiz V2.2 não contém os módulos originais; o snapshot V2.3 foi importado separadamente em `apps/site-original/` nesta branch. A versão hospedada em `sentinela-tapajos-ar.gyantardeli.chatgpt.site` continua intacta e não deve ser anunciada como atualizada. Faltam os módulos antigos não reproduzidos na nova Visão geral (por exemplo Mapa 3D e Áreas de Interesse); para preservá-los, integra-se o coletor no código original assim que o acesso for disponibilizado.

## Arquivos

- `server.mjs` — servidor web e API.
- `collector.mjs` — consultas e tratamento de falhas.
- `environment-view.mjs` — contrato unificado do painel e panorama.
- `frontend-adapter.mjs` — validação e fallback offline.
- `registry.mjs` — municípios e 20 fontes.
- `public/index.html`, `public/app.js`, `public/app.css` — painel integrado.
- `public/fontes.html` — monitor detalhado.
- `public/sw.js`, `public/manifest.webmanifest` — PWA.
- `deploy/GUIA_PUBLICACAO.md` — implantação/atualização da URL.
- `test/` — testes automatizados.
