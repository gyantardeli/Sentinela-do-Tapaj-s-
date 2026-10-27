# Sentinela Tapajós · Homologação PWA (27/10/2026)

## Ambientes
- Worker isolado de homologação: `sentinela-pwa-preview`.
- URL esperada: https://sentinela-pwa-preview.gyantardeli.workers.dev/
- Cloudflare Access: aplicação `Sentinela Tapajos - PWA Mobile - Homologacao Privada`, vinculada ao ID real do Worker `2efe2d59812b4212acfc7a84c2bca9e6`, política reutilizável `Sentinela Tapajos - Administradores`.
- Site original ChatGPT Sites, Worker operacional e Worker staging **não alterados**.
- Código do Worker de homologação: `deploy/pwa-preview-worker.mjs`, nesta branch. Não implantar em produção automaticamente.

## Integração
- Binding D1 `DB` conectado ao banco `sentinela-tapajos-staging`; apenas SQL `SELECT` nas rotas adicionadas.
- Rota `GET /api/pwa/status?city=itaituba`, aceita oito municípios do painel.
- Leitura dos registros `environment_observations` (`air` e `weather`), `fire_archive_days`, `radar_runs` e `watchdog_checks`.
- Leitura ambiental considerada defasada após 3h (ou se o timestamp estiver indevidamente no futuro).
- O número INPE arquivado representa contagem histórica registrada, **não** uma contagem integral garantida; zero não prova ausência.
- PM2,5 e AQI são estimados por modelo, nunca substituem medição de sensor físico.
- Não grava em D1, não dispara coleta e não mantém base ambiental offline.
- Manifesto do PWA e cinco abas preservados. Mapas externos carregados por ação do usuário.

## Verificações executadas
- API administrativa Cloudflare: upload do Worker aceito; D1 binding presente; script implantado.
- Conferida aplicação Access com política de inclusão restrita ao administrador; ID da aplicação associado ao ID do Worker.
- Consultas equivalentes às quatro SQL utilizadas pelo endpoint respondem com dados e estrutura esperados no D1.
- Código está versionado em branch de homologação, sem merge em main.

## Testes pendentes
- Testar a URL de homologação no navegador com sessão autorizada e sem sessão (espera-se login/negação de acesso).
- Verificar `/api/pwa/status?city=itaituba`, `/health` e `/manifest.webmanifest` após autenticação Access.
- Confirmar carregamento e atualização dos cinco painéis, mapas externos em dispositivos Android/iOS, instalação da PWA e tratamento offline (mensagem de indisponibilidade).
- Fazer auditoria de fidelidade ao frontend original do ChatGPT Sites antes de qualquer integração pública.

O acesso à URL depende da sessão Cloudflare Access; configuração administrativa verificada, mas o teste ponta a ponta com navegação autenticada não foi concluído deste ambiente.
