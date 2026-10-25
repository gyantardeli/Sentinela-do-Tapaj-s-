# Easter Eggs experimentais — prévia isolada

Projeto **Sentinela Tapajós**. Cinco módulos de curiosidade e entretenimento adicionados **somente** na infraestrutura de testes Cloudflare, usando como base um **proxy de leitura** do site original.

## Endereços
- Central de testes: https://sentinela-eggs-preview.gyantardeli.workers.dev/__egg/test
- Painel experimental: https://sentinela-eggs-preview.gyantardeli.workers.dev/
- Site original preservado: https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/

## Arquitetura
- Worker separado: `sentinela-eggs-preview`, no subdomínio `gyantardeli.workers.dev`.
- Rotas `/__egg/overlay.js`, `/__egg/overlay.css`, `/__egg/test` servidas localmente pelo Worker.
- Demais GET/HEAD são enviados ao domínio público do Sentinela original, sem retransmitir cookies ou credenciais; mutações são rejeitadas com 405.
- Apenas na prévia, `HTMLRewriter` acrescenta JS e CSS externos à árvore principal, sem modificar registros operacionais, backend, D1 ou repositório do site original.
- Não registra cache ou service worker próprio, usa respostas com `Cache-Control: no-store`.
- **Limitações:** é um espelho de leitura do site publicado; qualquer alteração no site original pode impactá-lo. Funcionalidades que dependem de ações POST, autenticação ou sessão não são reproduzidas. O site original publicado ainda contém interface herdada de offline, que não integra os módulos novos.

## Easter Eggs
1. **Despertar**: animação simbólica com olhos iluminados. Disparado com 7 toques no logotipo, ou `/?egg=guardiao`.
2. **A Floresta Fala**: áudio procedural sintetizado (não é gravação real de animais), ligado pelo usuário; pressão longa no símbolo, ou `/?egg=floresta`.
3. **Terminal Secreto**: digitar `SENTINELA` fora de formulários, ou `/?egg=terminal`. Comandos limitados a texto educativo, nunca comandos reais.
4. **Portal do Tempo**: duas faixas 1985–2025 com links oficiais para mapas anuais MapBiomas. Não produz falsa comparação de dados; `/?egg=tempo`.
5. **Mensagem do Criador**: créditos e propósito do projeto; `/?egg=criador`.

## Homologação
Executar workflow `Validar cinco Easter Eggs na prévia`, usando Chromium Playwright. Comparar capturas desktop/mobile e usar Android físico antes de aplicar ao projeto original por ChatGPT Work.

**Não publicar nem mesclar estes arquivos no site original sem adaptação ao seu código verdadeiro.**
