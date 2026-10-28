# Sentinela Tapajós — consolidação de 24 e 25/10/2026

> Atualização posterior à V34: a pedido do usuário, a simplificação das abas foi revertida. Consulte `RESTORE_TABS.md` para a organização atual. A auditoria cronológica abaixo mantém o registro das alterações anteriores.

## Estado e base

Trabalho preparado para revisão, sem publicação. A produção permanece na versão 30, implantada em 23/10/2026. As versões 31, 32 e 33 estavam salvas sem deploy. A base recuperada foi o commit `53e43fa4fc046978005ea97bb6dc28e1d629d797`, que contém a V33 (`0206e4a21c434b7ece422abd1c2faa333f78de61`) mais a alteração do Android 1.5.0. Nenhum merge nos PRs do GitHub foi feito por esta consolidação.

## Alterações realizadas nos dois dias

### 24/10 — mapa único e simplificação (V31/V32)

- Navegação principal reduzida a Mapa, Visão geral e Coleta.
- Mapa único com Detecções e leituras locais, Vento e poluentes/Windy, Qualidade do ar e Previsão regional.
- Integração no mesmo espaço de células CAMS, referências municipais, leituras locais e previsões AccuWeather/Clima & Radar.
- Controles de município, raio, período, satélite, horário e fonte preservados; ausência de dados continua distinta de zero válido.
- Fallback 2D com arraste, zoom, marcadores, seleção e base de satélite quando WebGL não inicia.
- Histórico e notícias abertos a partir da Visão geral; diagnóstico reunido em Coleta.
- Recorte/boletim e Modo Campo retirados da interface simplificada; o código offline remanescente foi tratado na V33.
- Arquivo HTML de teste do mapa único e pacotes de comparação/integração produzidos.
- PR #4 do repositório V2.2 removeu caches e funcionamento offline naquele repositório. Esse merge não equivale à publicação do Site original.

### 24–25/10 — operação online (V33)

- Removidos módulos, telas, leitor e pacote offline do Site; não há registro de service worker de cache.
- Falha ou perda de conexão invalida o snapshot; reconexão dispara nova consulta.
- Cache ambiental automático no localStorage eliminado. Leituras manuais identificadas continuam no aparelho, conforme preservação definida; histórico e cache de fontes no servidor mantêm seus timestamps.
- Service worker legado aposentado e limpeza limitada ao cache específico do Sentinela.
- Exportação GeoJSON/CSV desacoplada do módulo offline.
- Serializador utilizado pelo worker mobile preservado por compatibilidade, sem leitura de cache local.
- Backup, diff, relatório V33 e 15 suítes de regressão registrados.

### 25/10 — Diário e experiências

- Diário ampliado para oito capítulos e 24 referências de capítulo (há fontes repetidas entre capítulos).
- Fundo de mapas/bússolas, pesquisa, índice, anterior/próximo, teclado e bibliografia.
- Diário promovido a aba independente; acesso adicional por sete toques na harpia.
- Despertar do Sentinela: animação de 6,5 s, repetição e respeito a movimento reduzido.
- A Floresta Fala: sons sintetizados ou vídeo oficial do YouTube, acionados pelo usuário e sem reprodução simultânea.
- Mensagem do Criador com agradecimento aos colaboradores e a Deus, mantendo Salmos 24:1 e o texto aprovado.
- Terminal Secreto, Portal do Tempo e DOOM descartados; não integram esta candidata.
- Prévia experimental em Worker separado existia antes desta entrega. Ela era um espelho de consulta, não uma integração definitiva no Site.

### 25/10 — apoio, aparência e Android

- Página de apoio voluntário com chamada “Me paga um café? ☕”, explicação de uso dos recursos e gratuidade do painel.
- Configuração Pix empresarial preparada, mas sem chave/favorecido e sem geração de cobrança/QR Code. Pagamento não foi ativado.
- Conceitos visuais evoluíram do azul futurista para verde-floresta, com menor aparência militar. Houve espelho visual privado de consulta.
- APK 1.5.0 assinado, versionCode 7, com identidade da harpia, abertura do painel online no navegador e compartilhamento do endereço; leitores e sincronização offline nativos removidos. Foi uma entrega separada. Não houve envio à Play Store nem validação física informada dessa versão.

## O que esta candidata integra agora

1. Mantém a base online da V33 e as alterações Android. Após a V34, a navegação por mapa único foi substituída pelas abas independentes anteriores, com Coleta e Diário mantidos.
2. Aplica tema verde-selva às superfícies da interface, navegação, filtros e painéis, sem aplicar filtros de cor aos mapas/legendas.
3. Adiciona Diário na navegação React e assets de mesma origem em `/diario/index.html`. Botão de retorno à Visão geral e tela inteira incluídos. A restauração das abas usa o ciclo de montagem dos painéis anteriores.
4. Porta as três experiências mantidas para um módulo com montagem/desmontagem, limpeza de eventos/áudio, foco e bloqueio do fundo enquanto o modal abre. Não carrega o proxy de homologação.
5. Adiciona `/apoie` e link discreto fora dos controles de camadas. Nesta candidata o Pix permanece explicitamente bloqueado mesmo que existam variáveis de ambiente futuras.
6. Inclui uma prévia HTML derivada dos mesmos componentes. Ela não contém snapshots ambientais e retorna indisponibilidade para APIs; não deve ser usada para monitoramento. Recursos externos exigem internet. É um arquivo de revisão, sem modo offline de consulta implementado no produto.

## Verificação da V34 e limites

- TypeScript completo: aprovado.
- Build de produção: aprovado antes da redução de CSS não utilizado; o empacotamento final repete o build sobre a árvore final.
- 15 suítes existentes: aprovadas, incluindo ausência/zero, mapa, qualidade do ar, coleta, histórico, exportação, controle de acesso e contrato mobile.
- Quatro verificações do apoio: aprovadas.
- Verificação consolidada: oito capítulos, 24 referências, Pix desligado, experiências sem APIs/armazenamento e 63 arquivos protegidos idênticos à base (API, Android, banco, mobile, autenticação e manifesto).
- O teste antigo que exigia JSX integralmente idêntico à V32 foi atualizado: novas abas são intencionais; entradas dos componentes ambientais e módulos essenciais continuavam comparadas com a V33. Na restauração das abas, os componentes são comparados com a V34 e a navegação passa por verificação própria. Não se suprimiu a proteção das funções ambientais.
- Prévia gerenciada retornou endereço, mas o navegador recusou conexão. Não há teste visual desta combinação nem comprovação de navegação/touch em navegador ou Android físico nesta entrega.
- Não foram feitas consultas mutáveis ao D1, alterações em agendamentos ou testes com fontes reais. Nenhum novo Worker de homologação foi implantado.
- A disponibilidade efetiva de mapas 3D, fontes ao vivo, incorporação do YouTube e desempenho no celular permanece pendente de homologação.
- Builds automáticos dos PRs separados #6/#7 registravam falhas. Os resultados locais desta integração não apagam nem representam aprovação desses pipelines.

## Recuperação

A candidata deve ser salva no mesmo projeto sem deploy. V30 permanece publicada e os commits V32/V33/base Android continuam no histórico. Para futura publicação, conferir a versão exata salva e sua homologação; não substituir `app/page.tsx` pelos overlays antigos dos pacotes V2.3.

## Evidências de origem

- Sites: projeto `appgprj_6ad394eb7be48191a994993ead538987`, versões 30–33 e histórico Git recuperado.
- Pacote `sentinela_site_original_cafe_v33.zip` e `DIARIO_EXPLORADOR_PACOTE_INTEGRACAO.zip`.
- PRs https://github.com/gyantardeli/Sentinela-do-Tapaj-s-/pull/4, https://github.com/gyantardeli/Sentinela-do-Tapaj-s-/pull/6 e https://github.com/gyantardeli/Sentinela-do-Tapaj-s-/pull/7.
- Relatório V33 e Guia do APK 1.5.0 atuais, lidos em 25/10/2026.
- Tema visual recuperado em leitura do Worker existente `sentinela-visual-homolog`, sem alteração nesse ambiente.
