# Inteligência Ambiental · Homologação Power BI

Status: **branch de homologação, sem publicação na versão principal**.

## Objetivo

Introduzir a aba **Inteligência Ambiental**, com filtros 7/30 dias e raio de 25/50/100/200 km, gráficos de detecções INPE e PM2,5 modelado, panorama climático atual, comparação municipal e saúde da coleta. A análise nativa depende das APIs existentes do Sentinela:

- /api/history?place=itaituba&radius=100&days=7&satellite=all&scope=regional
- /api/dashboard?place=itaituba
- /api/source-health?days=7

Os gráficos preservam lacunas, dias parcialmente preenchidos e os metadados dos modelos. Não existem números de demonstração.

## Microsoft Power BI

A aba **Power BI** é uma **área preparada**, não um relatório ativo. Uma publicação futura poderá usar a variável pública de build NEXT_PUBLIC_SENTINELA_POWERBI_REPORT_URL apenas com URL HTTPS https://app.powerbi.com/reportEmbed?reportId=...&groupId=... correspondente à função "incorporar no seu site/portal" (autenticação corporativa).

**Não inserir tokens, segredos, chaves de API, links Publish to Web nem dados privados nessa variável.** A incorporação depende de licenças/permissões Microsoft e deve ser restrita a homologadores no provedor de hospedagem. Um iframe não substitui o controle de acesso.

## Critérios de homologação

1. O branch não altera a versão principal nem desativa o mapa, a visão geral ou a coleta.
2. As seis subabas e a navegação por hash #inteligencia-ambiental carregam sem erro.
3. O painel mostra lacuna e travessão quando não há dados; zero aparece apenas para arquivo completo.
4. Métricas históricas usam dias encerrados com cobertura total; comparação avisa sobre dias desiguais.
5. Conferir no celular a navegação horizontal, tabelas roláveis, filtros e fallback sem conexão.
6. Somente após conta Power BI, relatório autenticado e revisão de licenciamento testar a incorporação Microsoft.
7. Não fazer merge na main ou expor a homologação externamente antes de revisar permissões.

## Responsabilidades

- Dados e coleta: Sentinela/Cloudflare (origem INPE, CAMS e Open-Meteo).
- Apresentação nativa: site Next/Vinext do Sentinela.
- Power BI: opcional, acesso restrito e relatório autorizado pelo administrador Microsoft.
