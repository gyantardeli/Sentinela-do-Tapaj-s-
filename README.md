# Sentinela Tapajós — Projeto integrado V2.2

Versão web instalável, com acesso **somente online**, que **integra** o coletor resiliente V2.1 com um painel funcional de visualização e diagnóstico. O frontend é uma implementação nova baseada na estrutura funcional documentada do projeto. **Não modifica o site antigo automaticamente.**

## Projeto publicado e integração com ChatGPT Sites

- **Site original:** [Sentinela Tapajós — Queimadas e qualidade do ar](https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/)
- **Repositório de desenvolvimento:** [gyantardeli/Sentinela-do-Tapaj-s-](https://github.com/gyantardeli/Sentinela-do-Tapaj-s-)
- **Situação:** associação documentada; **não existe sincronização automática ou implantação deste GitHub no Site original**.
- **Código neste repositório:** implementação independente V2.2. Não equivale ao código completo da publicação original (faltam Mapa 3D, áreas de interesse e alertas).
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

## Simplificação do funcionamento — 24/10/2026

O repositório deixa de oferecer modo offline: as consultas do painel dependem do servidor e não são recuperadas de `localStorage` ou `CacheStorage`. O service worker legado é desativado, com limpeza dos caches locais gerados pela aplicação. O histórico do coletor no servidor, com estados de atualização e registros anteriores, **não é excluído**.

O "Modo Campo" não integra o frontend desta implementação V2.2; deve ser retirado separadamente do Site original no momento da integração, pois seu código não está neste repositório. **Nenhuma publicação no Site original ou APK ocorre a partir desta alteração.**

## O que está integrado

- **Visão geral:** filtros de município, raio, período e satélite; cartões de focos INPE, PM2,5 estimado, vento modelado e status de medição física; dados ausentes não equivalem a zero.
- **Mapas:** iframe externo Windy, quando houver conexão, e representação esquemática dos focos INPE carregados (sem carta-base, portanto não é mapa topográfico nem satélite).
- **Panorama regional:** oito municípios e mesma referência do indicador principal, sem dividir a origem do cache.
- **Notícias:** mostra até quatro matérias válidas, separa RSS direto de índice parcial e informa indisponibilidade do servidor sem recorrer a dados locais.
- **Diagnóstico:** 20 fontes detalhadas, status das três camadas, erros e frescor em `/fontes`.
- **Instalação no dispositivo:** mantém o manifesto e os ícones; exige internet para abrir e consultar informações. O service worker antigo é desativado e os caches locais do Sentinela são eliminados. O histórico persistido no servidor permanece disponível.
- **Backend:** três endpoints de leitura e comando POST protegido por `COLLECT_TOKEN`, rotina horária em processo ativo e estado JSON persistente.

## Contratos API

- `GET /api/environment?municipio=itaituba&raioKm=100&horas=24&satelite=todos`
- `GET /api/radar?limit=100`
- `GET /api/health`
- `POST /api/collect` (Bearer token, não configurado por padrão)

## Testes e limitações

`npm run check` executa os testes do coletor, das regras de consistência e de integração HTTP. Os testes unitários usam provedores simulados e os testes HTTP usam servidor com coleta desabilitada. **Não há validação de conectividade real das 20 fontes nesta entrega.** A automação de screenshot/browser foi impedida pelas restrições de acesso local do navegador de testes; layout deve ser inspecionado no ambiente de implantação.

O projeto não possui o código-fonte do Site publicado. A versão hospedada em `sentinela-tapajos-ar.gyantardeli.chatgpt.site` continua intacta e não deve ser anunciada como atualizada. Faltam os módulos antigos não reproduzidos na nova Visão geral (por exemplo Mapa 3D e Áreas de Interesse); para preservá-los, integra-se o coletor no código original assim que o acesso for disponibilizado.

## Arquivos

- `server.mjs` — servidor web e API.
- `collector.mjs` — consultas e tratamento de falhas.
- `environment-view.mjs` — contrato unificado do painel e panorama.
- `frontend-adapter.mjs` — consulta online e validação do contrato de dados, sem fallback local.
- `registry.mjs` — municípios e 20 fontes.
- `public/index.html`, `public/app.js`, `public/app.css` — painel integrado.
- `public/fontes.html` — monitor detalhado.
- `public/sw.js` — rotina de desativação de service worker legado; `public/manifest.webmanifest` — manifesto de instalação.
- `deploy/GUIA_PUBLICACAO.md` — implantação/atualização da URL.
- `test/` — testes automatizados.

## Easter egg DOOM (branch experimental)

A rota `GET /doom` apresenta a edição **shareware** (demonstrativa) do DOOM de 1993 por meio do js-dos v8. Para descobri-la, ative cinco vezes o símbolo **ST** no painel dentro de um intervalo aproximado de 4,5 segundos entre ativações. É possível abrir a rota diretamente para homologação.

- Dependências de terceiros são carregadas **somente após clicar em Iniciar DOOM**: `https://v8.js-dos.com/latest/js-dos.js`, `js-dos.css` e `https://v8.js-dos.com/bundles/doom.jsdos`. Caso o serviço externo fique indisponível, o jogo não abre, mas o painel permanece funcional.
- Sem copiar binários `.WAD` ou executáveis comerciais ao repositório. A edição shareware não representa o jogo completo; DOOM é propriedade intelectual da id Software.
- O módulo não usa os endpoints ambientais, não registra service worker nem ativa funcionamento offline. O jogador é iniciado explicitamente; autosave e armazenamento local do js-dos foram desativados na configuração do emulador.
- Compatibilidade com **Android/WebView/APK** ainda exige homologação em dispositivo real. Os controles móveis usam teclado virtual configurado, sujeitos à execução do pacote remoto.
- Esta alteração é apenas na branch experimental do **repositório independente V2.2**. Não publica nem modifica o site original em ChatGPT Sites/Work e não produz APK por si só.

Teste rápido: `npm run check`, depois `ENABLE_AUTO_COLLECT=0 npm start`, acessar `http://127.0.0.1:8787/doom` e clicar em **Iniciar DOOM**. Testar teclado, áudio, uso de memória, retorno ao painel e controles de celular antes de aprovação e publicação.
