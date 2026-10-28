# API Android beta e arquivo diário

Worker `sentinela-tapajos-beta`, separado da administração protegida do staging. Usa o D1 de homologação existente e expõe somente leituras ambientais públicas: `GET /v1/places`, `GET /v1/snapshot?place=itaituba` e `GET /health`. Métodos de gravação HTTP retornam 405. O aplicativo não recebe credenciais ou configurações administrativas.

O núcleo INPE/ar/tempo continua no coletor existente. O novo handler agendado preenche `fire_archive_days`, mantendo os parsers e o contrato do histórico. Atualiza hoje e ontem e preenche lacunas de forma limitada. Cada arquivo tem limite de tamanho, validação, escrita idempotente e confirmação de leitura. Uma falha preserva o dia anterior e fica em `radar_settings` na chave `mobile:history-run`. O agendamento nominal é horário, no minuto 41 UTC. A agenda pode ser temporariamente acelerada durante o teste inicial e deve voltar à configuração nominal após a confirmação.

A base atende oito municípios. A futura cobertura nacional exige substituir os recortes fixos, o catálogo e os limites atuais por uma configuração territorial, com dimensionamento dos provedores e da infraestrutura.

Validação local: `node scripts/check-mobile.mjs`, `node scripts/verify-monitoring.mjs` e TypeScript. Configuração de implantação em `mobile/wrangler.jsonc`. Chaves de assinatura Android não pertencem ao repositório.
