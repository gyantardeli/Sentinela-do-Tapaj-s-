# Sentinela Tapajós — Projeto integrado V2.2

Versão web/PWA que **integra** o coletor resiliente V2.1 com um painel funcional de visualização e diagnóstico. O frontend é uma implementação nova baseada na estrutura funcional documentada do projeto. **Não modifica o site antigo automaticamente.**

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

O projeto não possui o código-fonte do Site publicado. A versão hospedada em `sentinela-tapajos-ar.gyantardeli.chatgpt.site` continua intacta e não deve ser anunciada como atualizada. Faltam os módulos antigos não reproduzidos na nova Visão geral (por exemplo Mapa 3D e Áreas de Interesse); para preservá-los, integra-se o coletor no código original assim que o acesso for disponibilizado.

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
