# Sentinela Tapajós — Android 1.5.0 online

APK assinado para distribuição direta. Package `br.com.sentinelatapajos.app`, versionCode 7, Android 6.0/API 23 ou posterior, targetSdk 36.

A tela inicial e o ícone usam a harpia guardiã. O botão **Abrir painel online** abre o endereço público do Sentinela em uma aba do navegador compatível com Custom Tabs (ou no navegador padrão). O botão **Compartilhar site** abre o seletor de compartilhamento de um link público.

Esta versão do APK remove os leitores, importação e sincronização offline nativos. Não possui WebView, serviço em segundo plano, credenciais de serviço nem permissões Android declaradas. Não lê nem apaga arquivos antigos guardados pelo aplicativo. A navegação web usa o armazenamento e as permissões do navegador escolhido; este APK não controla o cache do navegador.

O site de destino é a publicação vigente em https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/ . A compilação do APK não publica revisões de homologação do site. A revisão com mapa único e a remoção completa dos recursos offline do site têm seu próprio processo de homologação.

## Compilar

JDK 17, Android SDK Platform 36 e Build Tools 36.0.0. Defina `ANDROID_HOME`, `JAVA_HOME`, `SENTINELA_KEYSTORE` e `SENTINELA_PASSWORD_FILE` para caminhos locais e execute `python3 android/scripts/build-apk.py` na raiz do repositório. A assinatura deve usar a chave original, alias `sentinela-tapajos`. Não inclua o keystore ou sua senha no repositório, APK ou material de divulgação.

A saída fica em `android/app/build/outputs/apk/release/`. O script compila o código e os recursos, gera o DEX, alinha, assina e verifica o APK. O arquivo `VERIFICACAO.json` registra a evidência da entrega; testes de assinatura não substituem instalação e uso em aparelho físico.
