# Sentinela Tapajós — Android / atualização do site 24 (21/10/2026)

Este módulo adiciona um **cliente Android de consulta ao Site ORIGINAL**, sem substituir o frontend por `public/` da V2.2. URL preservada:

https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/

## Escopo da atualização

- Abre a publicação atual do Site, incluindo **Histórico regional com mapa temporal e comparação (v22)**; **Previsão do tempo com AccuWeather e Clima & Radar (v23)**; e **modo de consulta pública da v24**.
- Mantém mapa 3D, alertas, áreas de interesse, histórico e navegação **do próprio Site**, sem copiá-los nem alterar banco/controle de acesso.
- Mudanças futuras do Site aparecem **online** no aplicativo sem exigir novo APK.
- Mantém cookies e armazenamento WebView do pacote Android quando o `applicationId` e a assinatura são iguais e o aplicativo é instalado como atualização.
- Não incorpora segredos no APK. Links externos HTTPS abrem no navegador. HTTP e esquemas desconhecidos não são carregados na janela principal.

## Limites importantes

1. **Não é atualização binária do APK 1.2.1 existente** até confirmar o `applicationId`, obter o projeto Android anterior e reutilizar **a mesma chave de assinatura**. Não se deve desinstalar o APK anterior para tentar atualizar: isso pode apagar dados locais.
2. O pacote construído automaticamente pelo GitHub é **debug** e serve para testes, não para substituir o APK assinado existente.
3. **Modo campo/offline:** depende das implementações de cache, service worker e exportação do Site original e exige testes no dispositivo. Este cliente não oferece uma cópia offline autônoma dos dados novos nem os rotula como atuais.
4. **PDF gerado por links `blob:`**, impressão e downloads complexos exigem teste em Android. Para esses casos, o fallback é abrir o Site original no navegador. Não marcar funcionalidade como validada sem teste.
5. A V2.2 do repositório GitHub contém frontend diferente e não deve ser embutida como substituto do Site original.

## Compilar

Requer Android SDK (API 35), JDK 17 e Gradle 8.9. No diretório raiz:

```sh
gradle -p android :app:assembleDebug
```

Resultado: `android/app/build/outputs/apk/debug/app-debug.apk`. O GitHub Actions também disponibiliza esse **APK de teste** como artefato do workflow `Android APK (Sentinela Tapajós)`.

Para instalar **sobre o APK 1.2.1** sem perda de dados, verificar primeiro com `aapt dump badging` / `apkanalyzer manifest application-id` o ID antigo e com `apksigner verify --print-certs` o certificado do APK antigo, depois configurar o mesmo pacote, assinatura e `versionCode` maior que o original:

```sh
gradle -p android :app:assembleRelease \
  -PsentinelaApplicationId=ID_REAL_ANTERIOR \
  -PsentinelaVersionCode=CODIGO_MAIOR_QUE_O_ANTERIOR
```

A compilação release usa as variáveis de ambiente `SENTINELA_SIGN_STORE`, `SENTINELA_SIGN_STORE_PASSWORD`, `SENTINELA_SIGN_KEY_ALIAS`, `SENTINELA_SIGN_KEY_PASSWORD`. Nunca publicar o keystore nem senhas no GitHub.

## Homologação em dispositivo

- [ ] Conferir o nome de pacote e certificado do APK original.
- [ ] Compilar e instalar APK de teste isoladamente; verificar que a página original foi carregada (não a V2.2).
- [ ] Histórico regional: mapa timeline 7/30 dias; comparação por data.
- [ ] Previsão do tempo: oito municípios, AccuWeather, Clima & Radar; radar e CSV.
- [ ] Mapa 3D: rotação/zoom/seleção; alertas e áreas de interesse.
- [ ] Reconexão e WebView em conexão fraca; dados indisponíveis nunca apresentados como zero.
- [ ] Modo campo com rede desligada, reabertura e identificação de data do snapshot.
- [ ] PDF/download, permissões, links externos e uploads.
- [ ] Instalação por cima do APK original com assinatura e ID idênticos, sem limpar dados.

A abertura deste PR não publica o Site original e não é prova de APK homologado.
