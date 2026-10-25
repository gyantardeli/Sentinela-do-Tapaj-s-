# Easter Eggs experimentais — Sentinela Tapajós (versão revisada)

> **Prévia independente:** https://sentinela-eggs-preview.gyantardeli.workers.dev/__egg/test
>
> **Painel espelhado de consulta:** https://sentinela-eggs-preview.gyantardeli.workers.dev/
>
> **Site original:** https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/ — não foi alterado.

## Quatro experiências

1. **Despertar do Sentinela**: animação Web Animations de 6,5 segundos com lua, olhos, feixe de luz e título; botão **Repetir animação** e tratamento de `prefers-reduced-motion`. Disponível em `/?egg=guardiao`; sete toques rápidos no texto **SENTINELA TAPAJÓS** do cabeçalho (sem tocar na imagem da harpia).
2. **A Floresta Fala**: paisagem sonora sintetizada e opt-in, ou player oficial do vídeo `https://www.youtube.com/watch?v=DNwvIQEXHP4`. Botões exclusivos para evitar reproduzir duas fontes simultaneamente. Incorporação via `youtube-nocookie.com`, sem copiar mídia nem baixar faixas; link externo se incorporação for bloqueada. Disponível em `/?egg=floresta`; pressionar por 5 segundos a harpia do cabeçalho.
3. **Diário do Explorador**: **aba independente e visível no menu principal** do painel experimental, com oito páginas interativas, imagem de fundo de mapas e bússolas, busca, navegação e 24 referências consultáveis. Abre via botão `Diário do Explorador` no menu, pelo link `/?tab=diario`, pelo atalho legado `/?egg=diario` ou por sete toques rápidos na imagem da harpia (`a.brand .brand-mark img[src='/branding/mark.svg']`). O Diário usa um frame de mesma origem `/__egg/diario` e pode ser aberto em tela inteira. **Não é mais apenas um Easter Egg oculto**. O painel ambiental permanece montado sob a aba, sem mutações de dados.
4. **Mensagem do Criador**: transcrição integral da mensagem enviada pelo responsável pelo projeto, com destaque para a afirmação “O verdadeiro Sentinela não é o sistema. É quem está diante dele.” Disponível em `/?egg=criador`; três ativações no rodapé.

**Removidos:** Terminal Secreto e Portal do Tempo, inclusive das rotas de consulta, menu de experiências e gatilhos de teclado/data.

## Proteção do ambiente

- Worker `sentinela-eggs-preview` separado do original; GET/HEAD apenas, com recusa dos métodos mutáveis.
- Recursos próprios servidos em `/__egg/overlay.js`, `/__egg/overlay.css` e `/__egg/test` e `/__egg/diario`; o HTML original é consultado e a sobreposição é injetada no fluxo. Nenhuma integração com D1, nenhuma edição de dados ambientais nem do APK.
- A experiência `A Floresta Fala` carrega YouTube somente após clique; o player pode estar indisponível segundo a política de incorporação do proprietário.
- O painel espelhado pode não reproduzir funções autenticadas ou mutáveis do site original; seus dados originais continuam sob responsabilidade das fontes.
- Todo recurso é opcional e fecha sem alterar os gráficos, o mapa 3D e os alertas. Nenhum service worker novo ou modo offline foi incluído.

## Testes

- Chromium headless em GitHub Actions: `.github/workflows/five-eggs-preview.yml` (nome de workflow legado, testes atualizados para quatro experiências).
- O teste dedicado é `experiment/browser-check.mjs`, intencionalmente fora da descoberta automática do `node --test`.
- Verificar carregamento, animação e replay, modal de vídeo, aba Diário visível no menu, navegação em oito páginas, referências e retorno ao mapa, transcrição textual completa, **7 toques na imagem da harpia abrem Diário sem acionar o Guardião, e 7 toques no texto da marca continuam abrindo o Guardião**, remoção de recursos anteriores, viewport mobile e bloqueio de POST.
- Teste em Android físico e disponibilidade efetiva do streaming YouTube ainda requerem validação humana.

## Controle de mudanças

**Não promover esta branch ao domínio original, ao APK ou ao GitHub `main` sem uma homologação específica da integração no site original.**
