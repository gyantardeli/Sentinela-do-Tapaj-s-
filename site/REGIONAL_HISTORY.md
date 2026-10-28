# Resumo municipal, saúde das fontes e histórico regional

O panorama municipal combina a coleta persistente de ar e vento, a consulta de detecções do painel e manchetes com menção textual ao município. O raio de detecções é centrado na sede, pode cruzar limites administrativos e pode se sobrepor ao de outras sedes. As contagens dos cartões não formam uma soma regional. Manchetes de contexto sem local exato aparecem identificadas.

## Registros duráveis

- `environment_observations`: pontos do CAMS/Open-Meteo e meteorologia com o horário de referência, local e data da coleta. Um ponto de modelo já arquivado não é substituído por uma coleta posterior. Previsões futuras ficam fora do histórico.
- `fire_archive_days`: resumo de cada arquivo diário UTC do INPE para oito sedes, quatro raios e cada satélite. O coletor remove duplicatas exatas e preserva passagens e satélites diferentes. O resumo é dividido por dia local UTC−3. Para completar um dia local são necessários dois arquivos UTC de dias encerrados. Uma gravação antiga não substitui um arquivo mais recente.
- `source_health_history`: consultas efetivamente registradas por fonte e horário, sem duplicar uma repetição do mesmo registro.

O histórico ambiental conserva até 32 dias para as bordas do calendário local; a interface oferece 7 e 30 dias. A saúde das fontes conserva 30 dias. As notícias usam o histórico existente do Radar, limitado a 30 dias.

## Cobertura e comparação

O gráfico de PM2,5 mostra médias das horas disponíveis do mesmo modelo CAMS global. O arquivo importado é uma saída arquivada de previsão, não medição por sensor nem reanálise observacional. A interface informa as horas presentes por dia; a comparação numérica exige 24 horas nos dois dias.

O INPE é comparado com município, raio e satélite constantes. A cobertura indica quais arquivos foram recebidos, sujeita a atrasos e revisões do fornecedor. Ausência de arquivo é uma lacuna, e zero só é mostrado quando ao menos uma parte foi recebida. A comparação exige as duas partes de dias encerrados. O dia em curso permanece parcial.

A taxa de resposta das fontes é calculada por consulta registrada: `ok`, `partial`, `indexed` e `empty` contam como resposta; `unavailable` conta como falha. Um índice vazio é resposta sem resultados e não cobertura completa. Dias sem consulta não recebem taxa presumida. SELVA, Windy, AccuWeather e Clima & Radar são consultas externas/incorporadas e não entram nessa taxa.

Não é possível reconstruir falhas antigas de cada fonte a partir do último estado. O bootstrap preserva apenas o último registro conhecido, com sua data original. Novos registros são acumulados a cada coleta.

## Rotina existente

A revisão `radar-tapajos-v4` mantém a rotina existente e os formatos de notícias anteriores. A rotina normal atualiza notícias, ambiente e saúde das fontes, reconsulta os três arquivos diários mais recentes e tenta preencher dois arquivos antigos ainda faltantes. O modelo recebe uma importação inicial de até 31 dias; os pontos novos entram pela coleta ambiental habitual.

O coletor é disponibilizado em `/radar-collector.mjs`. Leia `/api/radar/instructions`, obtenha acesso privado atual e confira o SHA-256 declarado antes de executá-lo. Credenciais ficam apenas em memória e stdin oculto. Nenhum token está no código.

Para a importação inicial, a entrada do coletor admite `historyDays: 30`; para recuperar apenas o histórico, admite `scope: "history"`. Na rotina normal, omita os dois. O escopo `environment` continua disponível para reparo ambiental. A execução verifica os escritores e as leituras subsequentes; falhas reais de fontes ficam registradas e não apagam dados anteriores. Nenhum novo agendamento é necessário.

## APIs

- `GET /api/regional`: oito resumos municipais e horários das fontes.
- `GET /api/source-health?days=7|30`: 23 fontes monitoradas e quatro serviços externos identificados separadamente.
- `GET /api/history?place=itaituba&radius=100&satellite=all&days=7|30`: série por dia local e cobertura.
- Acrescente `scope=regional` à mesma consulta para receber também `region`, com as séries das oito sedes. As observações são lidas em conjunto, preservando a separação por município. Os consumidores anteriores continuam recebendo o formato municipal por padrão.
- `GET /api/history/status`: arquivos recebidos e extensão dos pontos de modelo arquivados.
- `POST /api/history/ingest`: bootstrap, arquivo diário, arquivo do modelo e estado do INPE, todos validados na fronteira do Site privado.

## Verificação

Execute `node scripts/verify-monitoring.mjs` para verificar migrações em SQLite, o limite de 100 parâmetros do D1, idempotência, gravação monotônica, falha parcial, fronteiras UTC−3, filtro por satélite, agrupamento de notícias e renderização dos gráficos. O script também aceita arquivos JSON coletados para validar pacotes reais antes da gravação.

Use TypeScript sem emissão e o build padrão do Site. Depois de publicar, execute o coletor verificado e confira `/api/history/status`, `/api/source-health`, `/api/regional` e as séries de 7/30 dias. A conferência visual exige navegador disponível.

## Mapa com linha do tempo

A aba Histórico regional inclui um mapa dos oito recortes, com dias de 7 ou 30 dias, controles anterior/próximo, reprodução com três ritmos e seleção direta por calendário deslizante e cartões diários. A reprodução para no último dia; uma nova reprodução recomeça do primeiro. Pausa ao sair da aba do navegador, trocar filtros ou selecionar manualmente uma data. O fundo OpenStreetMap é opcional em modo de campo; sua falha preserva coordenadas e valores.

As camadas são contagens INPE por raio e PM2,5 médio do CAMS na sede. Os círculos mostram valores agregados, com escala fixa em todo o período. Não representam posições individuais de focos, perímetro queimado, imagens de satélite do dia nem uma superfície contínua de poluição. O arquivo histórico atual não armazena coordenadas individuais dos focos antigos. As sedes próximas usam pequenas linhas de chamada para separar os rótulos, mantendo a âncora geográfica correta. Recortes sobrepostos não são somados como total regional.

O modo Comparar A × B mantém a data A fixa e mostra B menos A por município, com tabela de valores e cobertura. A diferença só é calculada para dois dias encerrados com arquivos INPE completos ou 24 horas de modelo. O campo `closed` distingue inclusive a última hora do dia ainda em curso. Dias sem dado permanecem como lacuna, zeros válidos continuam como zero, e dias parciais têm contorno tracejado. Os gráficos e a tabela municipal anterior permanecem disponíveis e usam as mesmas datas A/B.

Validação adicional em `verify-monitoring.mjs`: igualdade entre respostas individuais e regionais nos oito municípios, separação das observações, filtros de raio e satélite, períodos de 7/30 dias, lacuna versus zero, comparações incompletas ou em curso bloqueadas, escala estável e renderização estática do mapa, linha do tempo e estados vazios. Nenhuma migração de banco ou mudança no coletor é necessária.
