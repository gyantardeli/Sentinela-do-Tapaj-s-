# Sentinela Tapajós — mapa Android nativo 1.7.0-beta.1

**Ramo de homologação:** `feat/android-mapa-nativo-20261029`. **Produção:** sem alterações.

## Implementação

- Motor MapLibre Native Android **OpenGL ES 13.7.1**. Não utiliza WebView para o mapa.
- Mapa vetorial base: OpenFreeMap Liberty (dados OpenStreetMap), URL oficial `https://tiles.openfreemap.org/styles/liberty`.
- Focos: `GET /api/dashboard?place=<id>`. JSON `fires[]`, filtro local com raio 25/50/100/200 km e janela de 6/12/24 h. Focos com horário fora da janela ou coordenadas não finitas são descartados.
- Ar: `GET /api/air-map`, matriz de `cells[]` com `times[]`, `aqiPm25[]` e `pm25[]`. Apenas dados com até 6 horas são representados; trata-se de **estimativa CAMS/Open-Meteo**, não sensores PurpleAir/IQAir.
- Seletor de camadas: INPE / PM2,5 / ambos; zoom, pan, rotação e visão inclinada sem relevo 3D.
- Municípios: oito sedes no arquivo `NativeDashboardActivity.java`.
- Toque sobre um ponto mostra coordenadas, satélite e data, ou uma leitura modelada com unidade e ressalva.
- Sem novas permissões de localização. Sem modo campo, mapa offline ou pacote de tiles. A API requer conexão HTTPS, sem persistência local no aplicativo; cache ambiente do MapLibre configurado como zero e cache de tiles por níveis desabilitado.
- Crédito da carta-base no painel e attribution do SDK.

## Limitações reais

- **Não é terreno 3D real.** O MapLibre Native suporta inclinação de câmera e hillshade, mas não elevação 3D via DEM. A aba antiga “Mapa 3D” é preservada na navegação; a representação é 2,5D.
- **Não são painéis nativos de terceiros:** Windy, PurpleAir, IQAir, RadarClima e AccuWeather, que permanecem links independentes e/ou indicadores de APIs locais.
- O visual vetorial depende de rede e disponibilidade do OpenFreeMap; as sobreposições dependem de acesso público ao servidor. HTTP 401/403/5xx não é substituído por valores antigos ou fictícios.
- O diálogo de alertas, áreas e histórico continua conforme a beta nativa anterior. Sem novas gravações administrativas.
- Não há teste físico automatizado, teste instrumental de fluidez, nem ensaio de acessibilidade ainda.

## Checklist de homologação física

1. Instalar o APK de **teste** paralelamente ao aplicativo de produção.
2. Abrir Itaituba, aguardar a carta-base do OpenFreeMap e confirmar zoom/pan/rotação.
3. Comparar focos filtrados por 6/12/24 h aos registros de origem do mesmo instante; validar números, horário UTC e unidades.
4. Ativar **PM2,5** e **Ambos**, conferir estado `ok/partial/unavailable`, cor e horas da grade no momento.
5. Alternar Itaituba, Jacareacanga e Novo Progresso; testar raio 25/50/100/200 km.
6. Usar inclinação e retorno a 2D; verificar que o aplicativo não informa relevo 3D quando não existe.
7. Desconectar internet: mapa e consultas devem mostrar indisponibilidade sem inventar dados.
8. Conceder **zero** permissões de GPS; validar comportamento após alternar telas e retorno do background.
9. Confirmar estabilidade em Android 6 e 16 e verificar consumo de memória durante 15 minutos.
10. Só promover à produção mediante aprovação funcional, key original e assinatura release verificável.

**Fontes técnicas:** https://maplibre.org/maplibre-native/android/examples/getting-started/ ; https://openfreemap.org/quick_start/ ; https://maplibre.org/maplibre-style-spec/terrain/
