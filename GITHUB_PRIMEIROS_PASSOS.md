# Publicar no GitHub com segurança

Repositório indicado: https://github.com/gyantardeli/Sentinela-do-Tapaj-s-

Este material é o **projeto web/PWA independente V2.2**, construído a partir da documentação e do coletor V2.1. Não é uma cópia integral do Site original do ChatGPT: os módulos antigos de mapa 3D, alertas e áreas de interesse **não estão incluídos**.

## Antes de enviar

1. Abra o GitHub e **verifique os arquivos atualmente no repositório**.
2. Se existir o código original, crie uma branch `integracao-v2.2` e compare os diretórios. **Não substitua** `public/` ou `server.mjs` às cegas: integre a API, o adaptador e o coletor preservando os módulos antigos.
3. Se o repositório estiver vazio, esta versão pode servir de base, com a ressalva de que não substitui o Site original.
4. Copie o **conteúdo desta pasta** para a raiz do repositório, inclusive `.github`, `.gitignore` e `.env.example`. Não envie o ZIP como único arquivo.
5. Nunca envie `.env`, segredos, dados coletados ou credenciais. Preencha `COLLECT_TOKEN` no ambiente de hospedagem, não no código.
6. Aguarde a verificação verde em **Actions** (30 testes com serviços simulados; não valida a acessibilidade das fontes ao vivo).
7. Publicar os arquivos no GitHub **não atualiza automaticamente** o domínio `sentinela-tapajos-ar.gyantardeli.chatgpt.site` e não constrói um APK.

## Validar localmente

Instale Node.js 20+ e execute:

```bash
npm run check
ENABLE_AUTO_COLLECT=0 npm start
```

Acesse http://localhost:8787/ . O processo de coleta só deve ser ativado em um servidor com acesso à internet e armazenamento persistente.

## Atualizar a versão original

Obtenha a exportação completa do código-fonte editável do ChatGPT Sites e monte um merge manual ou Pull Request. Preserve o layout, mapa 3D, áreas de interesse e alertas originais; utilize os endpoints desta V2.2 como camada de dados.
