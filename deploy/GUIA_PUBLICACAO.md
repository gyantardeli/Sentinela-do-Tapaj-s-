# Publicação do Sentinela Tapajós Integrado V2.2

**Estado:** serviço funcional em ambiente local; a URL `sentinela-tapajos-ar.gyantardeli.chatgpt.site` **não foi alterada**. A atualização daquele projeto exige acesso ao código-fonte/repositório ou ao editor que publicou o Site. Arquivos textuais exportados da Library não são o código-fonte da hospedagem.

## Opção 1: executar localmente no notebook

1. Instale Node.js 20 ou superior.
2. Extraia o ZIP e entre na pasta.
3. Execute `npm run check` para os testes (sem necessidade de npm install).
4. Para validação visual sem consultas externas: `ENABLE_AUTO_COLLECT=0 node server.mjs`.
5. Para coleta automática com acesso à internet: `ENABLE_AUTO_COLLECT=1 node server.mjs`.
6. Abra `http://127.0.0.1:8787/`. O monitor detalhado está em `/fontes`.

Os cartões mostram “—” antes da primeira coleta bem-sucedida; não são preenchidos com números exemplificativos.

## Opção 2: hospedagem com Docker

1. Use servidor com disco persistente, acesso HTTPS de saída e domínio sob seu controle.
2. Crie arquivo `.env` ao lado de `compose.yaml` com `COLLECT_TOKEN=<gerar-valor-longo-aleatorio>`.
3. Execute `docker compose up -d --build`.
4. Verifique `docker compose logs -f sentinela`.
5. Configure proxy HTTPS no servidor, por exemplo com `deploy/Caddyfile.example` após substituir o domínio.
6. Teste `/`, `/fontes`, `/api/health`, `/api/environment?municipio=itaituba`, `/api/radar`.
7. Confira datas de observação e existência de focos reais, sem assumir disponibilidade de fontes pela simples abertura da página.

O container executa coleta a cada hora enquanto estiver ativo. Para coletar uma vez, execute `docker compose exec sentinela node server.mjs --once` — **não** rode isso simultaneamente com outra coleta no mesmo banco; prefira o agendador do serviço. Um serviço com instâncias múltiplas exige controle central de execução e persistência, não fornecidos neste pacote.

## Antes de trocar a URL atualmente publicada

- Fazer backup do site e do cache/banco atuais.
- Obter o código-fonte e verificar o contrato das APIs já usado por ele.
- Substituir a origem dos dados por um proxy autenticado ou adaptar componentes; não inserir tokens no navegador nem no APK.
- Preservar módulos antigos que não estão neste pacote: **Mapa 3D, áreas de interesse, alertas operacionais e relatórios avançados**. A interface local V2.2 cobre a Visão geral, foco esquemático, vento Windy, notícia, panorama, saúde e uso offline; não é reprodução pixel-perfect de todos os módulos do site original.
- Realizar testes **ao vivo** com serviços oficiais e comparar dados reais, horários, geografia e fontes.
- Só então publicar e gerar APK novo da URL oficial.

## Modo offline no Android

O navegador/PWA guarda a interface por service worker e snapshots locais de dados. Abra uma vez online via HTTPS para instalar o cache da interface. O iframe Windy não funciona offline, e isto não deve ser interpretado como ausência de vento. O snapshot offline preserva seus horários e avisos. Esta entrega é uma **PWA**, não um arquivo `.apk` compilado.

## Limitações de aquisição

- Coletas reais de INPE, CAMS/Open-Meteo e dos 20 veículos precisam ser verificadas em servidor com acesso externo.
- Consulta humana/iframe do Windy não constitui ingestão numérica Windy. AccuWeather e SELVA precisam de API autorizada para dados automatizados.
- O mapa de focos V2.2 representa os pontos do CSV numa grade geográfica simplificada; sem carta oficial de base ou imagem de satélite.
- A alteração direta do endereço `.chatgpt.site` não é viável sem acesso à publicação original.
