# Integração DOOM no SITE ORIGINAL — Sentinela Tapajós

> **Destino real:** `sites-project://appgprj_6ad394eb7be48191a994993ead538987`
> **Projeto publicado conhecido:** https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/
> **Código de referência HOMOLOGADO (Chromium headless):** https://github.com/gyantardeli/Sentinela-do-Tapaj-s-/pull/5
> **IMPORTANTE:** a implementação independente V2.2 deste GitHub **não** é o código completo do Site original; **não substitua a interface original por ela**.

## Objetivo

Acrescentar o DOOM shareware de 1993 como easter egg ao **Site original existente** (sem criar segundo site, sem remover dados ou recriar o app). O painel ambiental deve permanecer online, sem Modo Campo ou funcionalidades offline, como decidido no projeto. O jogo será um módulo opcional online e não poderá interferir em atualização dos mapas, fontes, coleta, D1, histórico, alertas ou áreas de interesse.

## Integração no ChatGPT Work / ChatGPT Sites

1. Abrir para edição **o projeto Sites original** pelo identificador indicado acima; conferir o título Sentinela Tapajós e fazer backup/revisão das páginas existentes.
2. Inspecionar a estrutura do frontend original e adaptar os três arquivos `public/doom.html`, `public/doom.css` e `public/doom.js` da branch `feature/doom-easter-egg`. Se o site original for React/SPA, converter a página em uma view/rota isolada com carregamento client-side; se o roteador não permitir `/doom`, usar um diálogo/modal em tela cheia igualmente isolado. **Não sobrescrever** o `index.html`, o `app.js` ou o `app.css` do site original com arquivos da V2.2 independente.
3. Ligar a abertura à marca/ícone do Sentinela, por **cinco ativações com intervalo máximo de 4,5 segundos**, de forma acessível por mouse, toque e teclado. Se o símbolo original não for um botão, acrescentar semântica acessível sem alterar sua aparência; evitar listeners globais de clique. Consultar `public/doom-unlock.js` apenas como referência.
4. Carregar os arquivos externos `js-dos.css` e `js-dos.js` **somente após a ação explícita Iniciar DOOM**, para não penalizar o painel. A configuração verificada usa o bundle shareware `https://v8.js-dos.com/bundles/doom.jsdos`, runtime `https://v8.js-dos.com/latest/emulators/`, `autoSave: false`, `fsChanges: {local:false}` e `setNoCloud(true)`. Não incorporar conteúdos comerciais, WAD completo nem recursos de modo offline.
5. Garantir parada `await player.stop()` ao clicar Encerrar, sair do diálogo ou desmontar o componente. Evitar scripts repetidos a cada abertura; tratar falhas do CDN com texto e retorno ao painel. Em SPA, limpar o player no `useEffect` cleanup (ou equivalente) e prevenir atualização de estado após unmount.
6. Revisar CSP/requisições externas do js-dos em ambiente de teste. Autorizar somente domínios comprovadamente utilizados e somente os tipos necessários. Não liberar `*` indiscriminadamente. Não transmitir dados ambientais/credenciais ao módulo DOOM.
7. Gerar prévia protegida sem publicar; realizar homologação browser desktop, mobile viewport e dispositivo Android, verificando mapa 3D, fontes, alertas, timeline, coletas/histórico no servidor, sensores e API D1 após encerrar o jogo.
8. Somente após homologação **da integração na implementação original**, publicar na URL existente, preservar o build do APK para atualização posterior e registrar versão, data e possibilidade de rollback.

## Critérios de aceite

- Cinco ativações do símbolo Sentinela abrem o DOOM secreto; nenhuma aba adicional aparece no uso normal.
- Iniciar carrega js-dos e executa o shareware; teclado e controles em touch são utilizáveis.
- Encerrar desocupa recursos e restaura o painel original com mapa 3D/abas intactos.
- As APIs, o coletor programado, dados no D1 e alertas não são modificados.
- Nenhuma coleta ou dado é persistido no navegador pelo módulo; não surge service worker, cache de modo campo ou pacote offline do Sentinela.
- Em perda de conexão/CDN, o jogo mostra erro e o monitor ambiental continua recuperável.
- Prévia em Work/Sites e teste em navegador de verdade, com captura e checagem do console, antes de publicar.

## Evidência de homologação da implementação do GitHub

A branch disponibiliza `.github/workflows/doom-browser.yml` e `test-browser/doom-browser.mjs`. A suíte usa Chromium com Playwright, acessa a rota secreta, espera o evento `ci-ready`, confirma canvas, envia teclas, muda dimensões, encerra o player e retorna ao painel. **Esta validação não comprova a integração no site original nem suporte Android físico**.

## Estado de publicação

**Não sincronizado ao Site original pelo GitHub.** Esta nota e o PR documentam o código e o procedimento para execução no próprio editor ChatGPT Work/Sites. Mantenha o PR em rascunho até validação do frontend original e do controle de mudanças.
