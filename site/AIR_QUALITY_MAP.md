# Qualidade do ar no Tapajós — CAMS e previsão

A versão atual remove a integração de sensores SELVA do Sentinela, incluindo a consulta automática, a camada de sensores no mapa regional, cartões, links, mensagens de indisponibilidade e o catálogo de fontes. O coletor portátil também foi atualizado. Os registros manuais existentes mantêm sua chave de armazenamento e passam a ter identificação genérica.

## Mapa e previsão

O mapa regional contém 154 células de 0,4° (aproximadamente 45 km), entre 2,2° S e 7,8° S e entre 58,2° O e 53,8° O, incluindo as oito sedes acompanhadas. O recorte não representa toda a bacia hidrográfica.

São apresentadas concentração PM2,5 em µg/m³ e AQI dos EUA específico de PM2,5, com 25 referências em passos de três horas até +72 horas. A referência inicial pode anteceder a consulta em até três horas. O AQI composto de outros poluentes não substitui o índice de partículas.

Seleção por célula ou sede, zoom, arraste, navegação por teclado, reprodução, gráfico e tabela municipal foram preservados. O fundo OpenStreetMap é carregado sob demanda no modo de campo. O mapa original PurpleAir e seu guia em português continuam em seção expansível, com filtros e horários próprios.

## Coleta

GET /api/air-map consulta somente CAMS via Open-Meteo, em quatro lotes fixos de até 40 coordenadas. A resposta não contém sensores nem estado da fonte removida. A revisão tapajos-air-v2 isola o cache anterior. O cache do Worker reutiliza as séries por uma hora e preserva horários originais em falhas de atualização. O cache é local ao datacenter e não é um arquivo histórico permanente.

O endpoint não escreve no D1 e não altera os agendamentos existentes. Não há novas chamadas SELVA nem integração direta à API PurpleAir.

Valores ausentes, coordenadas incompatíveis, horários inválidos e unidades erradas são rejeitados. Ausência não vira zero. Cópias de modelo com consulta superior a seis horas deixam de alimentar o mapa.

## Validação

node scripts/check-air-quality-map.mjs verifica cobertura, horizonte, unidades, horários, falhas parciais, cache, ausência de consulta à fonte removida, preservação dos registros manuais e renderização inicial. --live acrescenta a consulta real ao CAMS. Também são executados TypeScript, controles de acesso, PurpleAir e compilação.

A conferência visual em navegador segue pendente após a revisão automática bloquear a prévia por limite de uso.

Dados de composição atmosférica: Copernicus Atmosphere Monitoring Service (CAMS), disponibilizados por Open-Meteo.

- https://open-meteo.com/en/docs/air-quality-api
- https://developers.cloudflare.com/workers/runtime-apis/cache/
- https://www.openstreetmap.org/copyright
