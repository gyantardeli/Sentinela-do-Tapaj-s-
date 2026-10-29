# Sentinela Tapajós Android v1.8.0-beta.1 — provedores integrados

**Branch:** `feat/android-fontes-integradas-20261029` | **Escopo:** somente `site/android/` e CI. Site publicado inalterado.

## O que é nativo e o que não é

- **100% nativo:** interface de navegação e filtros Android, cartões de dados, mapas MapLibre/OpenFreeMap (geopontos INPE e grade PM2,5 modelada CAMS/Open-Meteo), legendas, horário, diagnóstico, vínculos com as APIs do servidor.
- **Painel de serviço externo dentro do APK:** Android `WebView` isolado carrega conteúdo **web do provedor**, não recria o aplicativo/SDK do fornecedor nem extrai dados proprietários.
- **Windy:** URL documentada de mapa incorporável `https://embed.windy.com/embed.html?...&lat=<lat>&lon=<lon>`; centro ajustado ao município. Camadas do widget controladas pelo próprio Windy.
- **PurpleAir:** mapa público `https://map.purpleair.com/air-quality-standards-us-epa-aqi`, com tentativa de centro via fragmento. Sensores públicos, não se confundem com CAMS. O posicionamento e os filtros dependem de implementação atual do provedor.
- **IQAir:** mapa público em `https://www.iqair.com/br/air-quality-map`; escolha de cidade pelo mapa original, não vinculada ao seletor nativo.
- **Clima & Radar:** RadarClima público `https://www.climaeradar.com.br/radarclima`; bloqueios/compatibilidade com WebView dependem do terceiro.
- **AccuWeather:** previsão em `https://www.accuweather.com/`; seleção manual da localidade quando necessária.

**Importante:** nenhum dos cinco sites é declarado convertido para bibliotecas Android nativas. Uma conversão real exigiria APIs licenciadas/SDK e direitos de redistribuição de mapas/dados. Não mascarar frames como sensores locais.

## Localização das telas

- **Mapas:** MapLibre nativo + painel com seletor Windy / RadarClima / PurpleAir / IQAir / AccuWeather.
- **Qualidade do ar:** modelo próprio nativo + PurpleAir e IQAir originais em painel interno.
- **Previsão:** dados meteorológicos próprios + RadarClima, AccuWeather e Windy em painel interno.
- **Visão geral**, **Mapa 3D**, **Queimadas INPE**, **Histórico**, **Alertas**, **Coleta** etc continuam nativos como na beta anterior.

## Proteções

- Apenas HTTPS; sem redirecionamentos `http` ou `file://`; links fora do domínio autorizado abrem no navegador.
- JavaScript necessário para mapas, mas nenhuma interface JavaScript->Android; sem permissões de GPS, câmera, microfone ou cookies.
- Arquivos e conteúdo locais inacessíveis; dom storage temporário eliminado no encerramento do painel; cache HTTP desativado; sem pacote offline.
- Caso o terceiro bloqueie, falhe, exija identificação ou mude domínio, mostrar aviso e botão **Abrir fonte oficial**. Não substituir por números fictícios nem contornar bloqueios.
- Fundo florestal suave em drawable nativo de recurso local; cartões translúcidos para leitura. Nenhuma imagem gerada remotamente durante o uso.

## Teste obrigatório no celular

1. Instalar APK `br.com.sentinelatapajos.app.preview` sem desinstalar o Sentinela principal.
2. Comparar município Itaituba/Jacareacanga/Novo Progresso e os filtros de raio; conferir se MapLibre ainda funciona.
3. **Mapas:** abrir Windy, mudar para RadarClima, PurpleAir, IQAir e AccuWeather. Confirmar exibição dentro do painel ou indisponibilidade + abertura do navegador.
4. **Qualidade do ar:** conferir que modelo CAMS é rotulado como estimativa, e que PurpleAir/IQAir permanecem separados como fornecedores de sensores.
5. **Previsão:** testar RadarClima/AccuWeather/Windy e alternar cidades. Pode ser necessário escolher cidade manualmente nos mapas de terceiros.
6. Voltar à aba Visão geral, repetir 5 vezes; verificar fluidez e nenhuma tela branca/fechamento inesperado.
7. Desligar rede e confirmar aviso de indisponibilidade. Desligar app e reconectar: nenhum conteúdo de mapa offline.
8. Validar contraste/leitura dos cartões com novo fundo, em tela clara e escura.
9. Conferir ausência de permissões GPS e assinatura da variante beta. Chave debug não é assinatura Play Store.

Fontes oficiais sobre integração:
- https://embed.windy.com/ — Windy embed.
- https://www.climaeradar.com.br/widget-do-tempo — widget Clima & Radar (não confundir com RadarClima).
- https://community.purpleair.com/t/embed-code/12954 — discussão sobre limitações de incorporação.
- https://www.iqair.com/br/air-quality-map — mapa IQAir.
- https://www.accuweather.com/ — AccuWeather.
