# Acesso público

O modo público permite consultar o painel pelo endereço publicado. Todas as APIs
de escrita passam pelo middleware, inclusive inclusão e remoção de áreas, alertas,
ingestão de dados, coleta manual e configuração das rotinas.

As alterações exigem a identidade do proprietário autenticado pelo Sites ou a
credencial de serviço da coleta. Os cabeçalhos de identidade são fornecidos pelo
Sites; a aplicação não recebe identidade ao usar apenas a credencial de serviço.
O indicador de consulta pública oferece o acesso administrativo pelo login do Sites.

## Configuração de produção

Configurar no ambiente do Sites e aplicar a revisão em uma implantação:

- `SENTINELA_OWNER_EMAIL`: e-mail do proprietário confirmado na política de acesso;
  armazenado como segredo.
- `SENTINELA_SERVICE_TOKEN`: credencial de serviço retornada pelo `get_site`;
  armazenada como segredo. Nunca registrar o valor em código, arquivos ou logs.
- `SENTINELA_PUBLIC_READ`: `1` para exibir o indicador de consulta pública.

A coleta usa a mesma credencial em `OAI-Sites-Authorization: Bearer …` e
`X-Sentinela-Service-Token`. O primeiro autoriza o acesso na plataforma; o segundo
autoriza a escrita na aplicação. O coletor publicado já envia ambos. Se a plataforma
rotacionar a credencial de serviço, atualizar o segredo e implantar uma versão salva
para aplicar a nova revisão. Configuração ausente ou credencial incorreta bloqueia
a escrita.

## Verificação

Executar `npm run check:public` e a regressão `npm run check:v23` antes da publicação.
Na produção, verificar leitura anônima, rejeição de escrita anônima e rejeição de
cabeçalhos de identidade enviados pelo visitante. Usar `POST /api/access` para testar
a autorização sem gravar dados: anônimo recebe 403; serviço autorizado passa pelo
middleware e recebe 405 porque a rota só oferece GET.
