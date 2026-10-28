# Mapa de previsão · AccuWeather e Clima & Radar

A aba **Previsão do tempo** inclui um mapa das oito sedes, com dados capturados diretamente nas páginas públicas dos fornecedores. Cada ponto representa a sede e a sua própria previsão; não há interpolação espacial, atribuição de valores a áreas sem dados ou mistura com o Open-Meteo.

## Conteúdo

- Seletor AccuWeather / Clima & Radar, temperatura, probabilidade de chuva e vento.
- Condição atual, previsão por hora até 24 horas e previsão diária até sete dias, limitada ao que cada página efetivamente disponibiliza. Na captura validada, o AccuWeather expôs 12 horários e o Clima & Radar expôs 48; o mapa usa até 24 horas e conserva lacunas. A previsão diária de temperatura mostra a máxima; a mínima aparece no detalhe.
- Comparação das duas fontes para o mesmo horário ou dia, com referências de tempo separadas nas condições atuais. Não é calculada uma média combinada das previsões.
- Captura e referência exibida pela página identificadas separadamente. O relógio da página não é apresentado como horário de estação meteorológica ou emissão do modelo.
- Exportação CSV dos oito municípios no indicador e horizonte selecionados.
- Mapa de chuva oficial: RadarClima em iframe, com controles próprios, e imagem pública de radar vinculada na página do AccuWeather. A imagem é servida pelo fornecedor, com seus créditos e legenda. O horário da imagem do AccuWeather não foi obtido como campo estruturado; ele não recebe o horário da captura da previsão.

## Captura e limites

`GET /api/weather-map?provider=accuweather|climaeradar` consulta as oito páginas do fornecedor. As URLs são geradas por IDs fixos já verificados; o endpoint não aceita URLs externas arbitrárias. O transporte limita cada página a 2 MB e 9,5 segundos, sem repetição automática de erros de acesso. A captura não usa login, chave da API comercial, execução de JavaScript do fornecedor nem endpoints internos. No Clima & Radar, somente o JSON já incluído na página pública é lido; URLs de API e credenciais do próprio app não são reutilizadas nem devolvidas ao navegador.

As capturas válidas são reutilizadas em memória por 15 minutos. Consultas concorrentes compartilham a mesma requisição por município. Após uma falha, a captura anterior mantém os horários originais e fica identificada como cópia anterior. Depois de duas horas, considerando tanto a referência da página quanto a captura, os valores são retirados do mapa atual. O relógio do navegador também aplica esse corte se a conexão falhar. Lacunas não são convertidas em zero e horas não são interpoladas.

A atualização ocorre sob demanda e durante a leitura da aba; não é um novo agendamento de coleta e não cria um arquivo histórico meteorológico. O cache em memória pode reiniciar com o serviço. Esta integração não escreve no banco nem altera as coleções ambientais, histórico regional, alertas, áreas de interesse ou dados do modo de campo. Os mapas de fundo e chuva respeitam o carregamento opcional do modo de campo.

Páginas públicas podem mudar de formato ou recusar acesso. Nesses casos, o painel apresenta a falha municipal e preserva a referência anterior, quando disponível. O radar externo tem controles próprios, independentes do horário do mapa regional. Ausência de imagem ou de valor não demonstra ausência de chuva.

## Verificação

`node scripts/check-weather-capture.mjs` verifica identidade municipal, unidades, zeros válidos, calendários UTC−3, formato e referência temporal, lacunas, rejeição de imagens de domínio ou cidade incorretos, compartilhamento de consultas, preservação após falha, corte de dados antigos no servidor e navegador, ausência de escritas no banco e renderização estática dos mapas e controles.

O parâmetro opcional `--live-index <arquivo-local>` valida um índice de páginas reais já capturadas, usando o horário original de cada captura. Em 21 de outubro de 2026, a leitura e normalização das 16 páginas públicas dos oito municípios foram verificadas com sucesso. Isso comprova a captura e o formato, sem representar uma validação visual no navegador nem garantia permanente de disponibilidade dos fornecedores.

Referências públicas: [AccuWeather Itaituba](https://www.accuweather.com/pt/br/itaituba/2297818/weather-forecast/2297818?unit=c), [Clima & Radar Itaituba](https://www.climaeradar.com.br/previsao-tempo/itaituba/11821981), [RadarClima Itaituba](https://www.climaeradar.com.br/radarclima/itaituba/11821981), [widget oficial para sites](https://www.climaeradar.com.br/widget-do-tempo).
