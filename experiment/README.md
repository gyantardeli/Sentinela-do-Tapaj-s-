# Easter Eggs experimentais — Sentinela Tapajós (versão revisada)

> **Prévia independente:** https://sentinela-eggs-preview.gyantardeli.workers.dev/__egg/test
>
> **Painel espelhado de consulta:** https://sentinela-eggs-preview.gyantardeli.workers.dev/
>
> **Site original:** https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/ — não foi alterado.

## Quatro experiências

1. **Despertar do Sentinela**: animação Web Animations de 6,5 segundos com lua, olhos, feixe de luz e título; botão **Repetir animação** e tratamento de `prefers-reduced-motion`. Disponível em `/?egg=guardiao`; sete toques rápidos no texto **SENTINELA TAPAJÓS** do cabeçalho (sem tocar na imagem da harpia).
2. **A Floresta Fala**: paisagem sonora sintetizada e opt-in, ou player oficial do vídeo `https://www.youtube.com/watch?v=DNwvIQEXHP4`. Botões exclusivos para evitar reproduzir duas fontes simultaneamente. Incorporação via `youtube-nocookie.com`, sem copiar mídia nem baixar faixas; link externo se incorporação for bloqueada. Disponível em `/?egg=floresta`; pressionar por 5 segundos a harpia do cabeçalho.
3. **Diário do Explorador**: quatro passagens histórico-documentais (ocupação indígena pré-colonial, formação de Santarém, livro de Barbosa Rodrigues de 1875, expedição da Embrapa de 1986). Fontes Arquivo Nacional, Prefeitura de Santarém, Biblioteca Brasiliana USP e Embrapa; trata-se de notas curadas, não diário ficcional nem documento original. Disponível em `/?egg=diario`; **sete toques rápidos na figura da harpia no painel principal** (`a.brand .brand-mark img[src='/branding/mark.svg']`). O gesto usa contador distinto do Guardião.
4. **Mensagem do Criador**: transcrição integral da mensagem enviada pelo responsável pelo projeto, com destaque para a afirmação “O verdadeiro Sentinela não é o sistema. É quem está diante dele.” Disponível em `/?egg=criador`; três ativações no rodapé.

**Removidos:** Terminal Secreto e Portal do Tempo, inclusive das rotas de consulta, menu de experiências e gatilhos de teclado/data.

## Proteção do ambiente

- Worker `sentinela-eggs-preview` separado do original; GET/HEAD apenas, com recusa dos métodos mutáveis.
- Recursos próprios servidos em `/__egg/overlay.js`, `/__egg/overlay.css` e `/__egg/test`; o HTML original é consultado e a sobreposição é injetada no fluxo. Nenhuma integração com D1, nenhuma edição de dados ambientais nem do APK.
- A experiência `A Floresta Fala` carrega YouTube somente após clique; o player pode estar indisponível segundo a política de incorporação do proprietário.
- O painel espelhado pode não reproduzir funções autenticadas ou mutáveis do site original; seus dados originais continuam sob responsabilidade das fontes.
- Todo recurso é opcional e fecha sem alterar os gráficos, o mapa 3D e os alertas. Nenhum service worker novo ou modo offline foi incluído.

## Testes

- Chromium headless em GitHub Actions: `.github/workflows/five-eggs-preview.yml` (nome de workflow legado, testes atualizados para quatro experiências).
- O teste dedicado é `experiment/browser-check.mjs`, intencionalmente fora da descoberta automática do `node --test`.
- Verificar carregamento, animação e replay, modal de vídeo, diário com fontes, transcrição textual completa, **7 toques na imagem da harpia abrem Diário sem acionar o Guardião, e 7 toques no texto da marca continuam abrindo o Guardião**, remoção de recursos anteriores, viewport mobile e bloqueio de POST.
- Teste em Android físico e disponibilidade efetiva do streaming YouTube ainda requerem validação humana.

## Controle de mudanças

**Não promover esta branch ao domínio original, ao APK ou ao GitHub `main` sem uma homologação específica da integração no site original.**
