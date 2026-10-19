# Integração da Prioridade 1 no Site original (sem republicação automática)

## Destino obrigatório

- Site **existente**: https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/
- Projeto original ChatGPT Sites: `appgprj_6ad394eb7be48191a994993ead538987`.
- Repositório fonte: https://github.com/gyantardeli/Sentinela-do-Tapaj-s-
- Correção validada: commit `b000690b9c354c6ccc7badef90a1c2972f765fa0` na `main`, originado do PR #1.
- A V2.2 do GitHub **não é o frontend original**: não substituir a aplicação inteira.
- Este arquivo é uma especificação de integração; **não significa que o Site foi alterado**.

## Procedimento para o editor do Site original (ChatGPT Sites / Work)

1. Abra o projeto EXISTENTE pelo editor, com permissão de edição. Registre uma versão de backup do código e da configuração; tire cópia e confira integridade dos dados persistentes e dos segredos sem expô-los em logs.
2. Faça inventário dos contratos, fontes e agendamentos do Site: backend/worker, `/api/environment`, `/api/health`, `/api/radar`, bancos, horários, endpoints do INPE e atualização de UI.
3. Adapte **seletivamente** o commit acima, consultando `collector.mjs` (`collectINPE`, `mergeINPEOnPartial`, `collectAll`, `layer`, `markStale`) e os diagnósticos de `server.mjs`.
4. INPE: consultar os CSV diários oficiais de hoje e ontem (UTC), validar colunas, horários GMT, coordenadas e satélite. Não interpretar 404, HTML nem CSV inválido como **zero detecções**. Se um arquivo falhar, marcar `parcial` e preservar focos previamente válidos com idade <=24h, deduplicados por latitude, longitude, instante e satélite. Se ambos falharem, conservar último snapshot como `cache_anterior` / `defasado` conforme horário real. Se ambos responderem, substituir cache inclusive por conjunto vazio.
5. Persistência: preservar banco e chaves existentes, esquema de dados e alertas. As gravações devem ser atômicas/idempotentes; execução antiga não deve substituir snapshot mais novo. Uma falha do INPE não deve apagar ar, vento nem radar; município inválido não deve apagar os demais.
6. Diagnóstico: adicionar, SEM alterar layout principal, campos equivalentes a `arquivos`, `errosParciais`, `falhasUltimaTentativa`, `recuperadosCache`, `totalFocosEmCache`, `ultimaAtualizacao`, `ultimaTentativa`, `tipoErro` e `mensagem`. Exibir a causa real: 404, 429, timeout, resposta inválida, erro remoto.
7. Agendamento: confirmar rotina HORÁRIA no ambiente da implantação mesmo sem navegador aberto. Não depender apenas de `setInterval` em browser, timer num processo web que pode hibernar ou atualização manual. Usar mecanismo agendado do backend/serviço externo autorizado compatível com ChatGPT Sites.
8. Interface: preservar integralmente mapa 3D, camadas existentes, áreas de interesse, alertas, histórico, armazenamento, controle de acesso e URL; apresentar contagem parcial de focos como limite inferior ou indisponível, nunca como confirmação de zero.
9. Testar casos com CSV válido, dias parcial/totalmente indisponíveis, ausência de focos, foco antigo, zero válido, duplicatas, 429, falhas independentes, reinício do backend, acesso offline e execução sem site aberto. Testes integrados com INPE real e Open-Meteo real devem ser realizados separadamente dos mocks.
10. Criar PRÉVIA **na versão do próprio Site**, verificar compatibilidade e informar diffs e testes; **não publicar na URL existente sem autorização específica do proprietário**.

## Critérios de aceite

- [ ] Site original (mesmo projeto) em prévia funcional; nenhum segundo site criado.
- [ ] Mapa 3D, alertas, áreas de interesse, histórico, dados persistidos e layout intactos.
- [ ] Falhas INPE não zeram focos ou apagam outras fontes; contagem parcial não é apresentada como completa.
- [ ] Erros por fonte e horários reais visíveis no monitor de saúde.
- [ ] Coleta recorrente validada com frontend fechado.
- [ ] Testes de regressão e integração real executados, com evidências e limites reportados.
- [ ] Publicação aguardando autorização expressa.

## Instrução curta para o editor do Site

> Abra e edite o projeto ORIGINAL Sentinela Tapajós (https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/), não crie outro Site. Use como referência o commit `b000690b9c354c6ccc7badef90a1c2972f765fa0` de `gyantardeli/Sentinela-do-Tapaj-s-`. Faça backup, adapte apenas a correção da coleta INPE, persistência e monitor de fontes à arquitetura real do Site e teste agendamento sem a página aberta. Preserve mapa 3D, interface, áreas de interesse, alertas, histórico, armazenamento e permissões. Gere prévia e apresente testes; NÃO publique sem minha autorização.
