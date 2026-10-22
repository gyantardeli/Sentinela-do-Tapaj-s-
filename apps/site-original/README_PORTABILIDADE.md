# Sentinela Tapajós — Código original recuperado (V2.3 / Prioridade 1)

Esta pasta contém a **árvore de código recuperada do backup de revisão V2.3 / Prioridade 1** do ChatGPT Sites, datado de outubro de 2026, sem dependências `node_modules` nem dados vivos do D1. O projeto é uma aplicação **Vinext / Next.js / Cloudflare Workers com D1**. Não é o painel Node.js V2.2 da raiz do outro repositório.

## Estado da migração

- Recuperado: mapa 3D (`components/fire-terrain-map.tsx`), reprodução temporal, mapas regionais, áreas de interesse, alertas, boletins, PWA/offline, clima e radar, modelos e migrações do D1, scripts e testes.
- Não recuperado: eventuais **alterações posteriores ao backup** (site de produção v22–v24), segredos, valores atuais do banco D1, estados locais de dispositivos, agendas externas e domínio.
- Código recuperado **não foi publicado nem implantado** fora do ChatGPT Sites. Recursos de integração nativos da plataforma precisam de adaptação.

## Segurança e portabilidade (leitura obrigatória)

1. **Não exponha** `POST /api/*/ingest`, endpoints de alteração de áreas/alertas ou quaisquer cabeçalhos de autenticação vindos do cliente. A autenticação via cabeçalhos `oai-authenticated-*` somente é segura dentro de um perímetro que remove cabeçalhos forjados e os define após autenticação real. Ao migrar para outra plataforma, implemente autenticação no servidor e autorização explícita.
2. Configure Cloudflare D1 e migrações antes da implantação. Os dados de produção não acompanham este código: faça exportação autenticada, teste importação e consistência antes de trocar a URL.
3. `vite.config.ts` refere `.openai/hosting.json`. O arquivo incluído foi sanitizado e declara somente o binding `DB`, sem project_id original. Revise integrações Vinext/Workers e configuração de D1 para ambiente externo.
4. Os arquivos binários de fontes TTF não são redistribuídos. O gerador de PDF aponta para `/fonts/DejaVuSans*.ttf`; configure fontes licenciadas localmente para habilitar PDF, ou altere o renderizador para fontes embutidas compatíveis.
5. APIs externas (INPE, Open-Meteo, Windy, AccuWeather, Clima & Radar, SELVA) têm formas distintas de acesso, licença e limites. Links/iframes não equivalem a coleta numérica autorizada.
6. Modo offline/PWA exibe dados armazenados com horário: nunca represente snapshots sem conectividade como medições atuais.

## Desenvolvimento

- Node.js >= 22.13; pnpm definido no `package.json`.
- Instale dependências conforme `pnpm-lock.yaml`, sem reutilizar credenciais de produção.
- Scripts de teste descritos em `package.json`: `check:v23`, `check:priority1` etc. Alguns testes foram desenhados para o ambiente do Sites e necessitam adaptação para ambiente externo.
- Fora do ChatGPT Sites, não basta executar o build: a camada de autenticação, D1, runner/agendamentos e endpoints de gravação requerem auditoria independente.

## Relacionamento com o painel Node.js V2.2

As duas implementações foram conservadas separadamente de propósito. A consolidação de funcionalidades só deve ocorrer após um desenho de migração para runtime único, preservando persistência, permissões, histórico e cache.
