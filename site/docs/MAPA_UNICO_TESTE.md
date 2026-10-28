# Mapa único — versão para revisão

Alteração preparada para salvar sem implantação. Não alterar o endereço ou a audiência da versão publicada.

## Interface

- Navegação principal: Mapa, Visão geral e Coleta.
- Mapa: detecções INPE e leituras locais; Windy; grade CAMS; previsão Clima & Radar e AccuWeather.
- Detecções, CAMS e previsões municipais usam a mesma instância cartográfica. Windy e radares oficiais ocupam o mesmo painel, com controles e horários próprios; não são rasterizações nem sobreposições extraídas desses fornecedores.
- Mantidos filtros municipais, leituras manuais, fontes, saúde da coleta, notícias e histórico sem um segundo mapa.
- Retirados da interface modo de campo, pacote offline, áreas/recortes e boletim. Dados anteriores e APIs existentes não foram apagados.
- Preservadas as imagens do guardião incorporadas na versão anterior.

## Verificação

- TypeScript e compilação do aplicativo.
- Identificadores das leituras locais usam `getRandomValues` quando `randomUUID` não está disponível, inclusive no preview HTTP.
- `node scripts/check-unified-map.mjs`: zeros e ausências, validade temporal, coordenadas, horário exato de previsão, métricas diárias, oito sedes e navegação antiga.
- Testes existentes de qualidade do ar e captura meteorológica passaram durante a implementação.
- Navegador: três abas, quatro camadas, 154 células CAMS, oito previsões válidas por provedor e layout de 390 px.
- O navegador de QA não possui WebGL2. A alternativa 2D foi verificada; relevo 3D permanece pendente de verificação visual em aparelho compatível.
- A navegação ao Windy foi verificada, mas não foi possível confirmar visualmente o conteúdo do iframe externo neste ambiente. Mapas externos dependem da internet e do fornecedor.

## Arquivo de teste

O HTML separado usa o mesmo código de interface e 18 capturas reais, com referência em 23/10/2026 às 11:08 UTC−3. Não contém credenciais nem altera a coleta em produção. Requisições de escrita são bloqueadas. Leituras manuais ficam no navegador do avaliador.

Os dados são uma fotografia de teste, não uma consulta ao vivo. Os mapas de terceiros mantêm seus próprios horários. Consultas de histórico que não constam da captura apresentam indisponibilidade explícita.

Geração: `node scripts/build-test-preview.mjs /caminho/absoluto/snapshots.json /caminho/absoluto/teste.html`.
