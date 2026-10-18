# Vincular desenvolvimento GitHub ao Site original

## Identidades

- Site original: https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/
- Repositório: https://github.com/gyantardeli/Sentinela-do-Tapaj-s-
- Fonte na branch `main`: versão V2.2 **independente** (coletor, API, painel próprio e testes).
- Status: referência cruzada documentada. O GitHub **não publica automaticamente** neste ChatGPT Site.

## Atualização segura preservando o endereço original

1. Acesse ChatGPT > Sites, encontre **Sentinela Tapajós — Queimadas e qualidade do ar** e escolha editar; alternativamente use **Edit site** no site publicado, quando disponível.
2. Na conversa de edição (Work ou Codex com referência ao Site), forneça este repositório e peça análise diferencial antes de alterar o código original.
3. Faça cópia/versão do Site e exporte o que estiver disponível para backup. Preserve banco de dados, secrets, configuração de acesso, alertas e dados persistidos.
4. Integre somente os módulos adequados: `collector.mjs`, `environment-view.mjs`, `frontend-adapter.mjs` e contratos da API em `server.mjs`, adaptando-os ao runtime efetivo do Site. O servidor Node com processo longo e disco local pode **não ser compatível** com o hosting ChatGPT Sites; use serviços externos onde necessário.
5. Conserve integralmente Mapa 3D, áreas de interesse, alertas, histórico e layout original. Não copie indiscriminadamente `public/index.html` da V2.2.
6. Execute testes de regressão, integração real com fontes INPE/Open-Meteo, validação de atualização offline, verificações de segurança e consistência do banco. Revise a prévia antes de publicar.
7. Publique uma versão revisada pelo editor do Site existente para manter a URL atual. O GitHub continuará sendo referência do coletor, não um gatilho automático de deploy.

### Instrução para a conversa de edição do Site

> Estou editando o **Site original** Sentinela Tapajós publicado em https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/. Consulte o repositório GitHub `gyantardeli/Sentinela-do-Tapaj-s-` (V2.2) como **fonte de módulos e testes**, não como substituto integral do meu Site. Faça comparação com o código real deste Site; preserve Mapa 3D, alertas, áreas de interesse, histórico, permissões, armazenamento e layout. Planeje e integre o coletor com adaptação ao ambiente hospedado, mantendo tokens no servidor; crie versão para revisão, rode testes e NÃO publique até minha autorização.

## Atenção

- A conexão do GitHub ao ChatGPT dá acesso a arquivos conforme permissões, mas não significa sincronização de código, hospedagem ou deploy automático.
- Este repositório é público. Nunca envie chaves de API, `.env`, coordenadas operacionais restritas, dados pessoais ou credenciais.
- Não foi feita alteração nesta URL publicada durante a associação documental.
- Referências: https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites e https://help.openai.com/pt-br/articles/11145903-connecting-github-to-chatgpt
