# Sentinela Tapajós — Testes consolidados da PWA 1.0

**Data:** 27/10/2026  
**Escopo:** Worker `sentinela-pwa-preview`, branch `homologacao/pwa-mobile-2026-10`, D1 `sentinela-tapajos-staging`.  
**Resultado:** aprovados os testes de lógica simulada, sintaxe, estrutura e consultas reais ao D1. **Homologação final ainda pendente de navegação autenticada e testes em Android/iOS.**

## Evidências e resultados

| Área | Evidência | Resultado |
|---|---|---|
| Implantação | Worker isolado implantado; binding `DB` do tipo D1 confirmado via API administrativa | Aprovado |
| Acesso privado | Cloudflare Access vinculado ao ID do Worker e política administrativa de inclusão por e-mail | Configuração confirmada, **bloqueio HTTP ainda não testado** |
| D1 real | Consultas SELECT retornaram registros dos 8 municípios, cada um com `air` e `weather` | Aprovado |
| Coleta | `radar_runs` registra última execução parcial, 20 fontes verificadas, 7 disponíveis, 5 artigos aceitos (na consulta realizada) | Estado **parcial**, não falha técnica da consulta |
| Monitor independente | D1 registra `status=attention` para modo `independent` | Atenção operacional (estado preservado) |
| Manifesto | JSON válido com modo `standalone`, ícones declarados e navegação própria | Aprovado no código; instalação real não verificada |
| Navegação | 5 abas previstas; 8 municípios no seletor; sem IDs HTML duplicados ou referências a ID inexistente nas chamadas analisadas | Aprovado na inspeção estática |
| Segurança funcional | Somente SELECT no endpoint de PWA; POST devolve 405; D1 ausente devolve 503 | Aprovado em execução simulada |
| Offline | Sem registro de service worker offline; código desregistra workers antigos | Aprovado por inspeção; comportamento móvel pendente |
| HTTP real na origem | Ferramentas externas não conseguiram alcançar a URL de testes para verificar resposta e login Access | **Não testado** |
| Integrações externas | Windy, OpenStreetMap, PurpleAir e IQAir têm dependências de redes/iframes de terceiros | **Não homologado no celular** |

## Testes funcionais simulados: 14/14 aprovados

1. `GET /api/pwa/status` com dados do banco simulado;
2. Contagem de focos com preferência pelo dia correspondente ao arquivo;
3. Estado do radar e do monitor preservados;
4. Consultas exclusivamente SELECT;
5. Valores antigos sinalizados como desatualizados;
6. Município desconhecido tratado com fallback;
7. Ausência de D1 sinalizada com HTTP 503;
8. Método POST bloqueado com HTTP 405;
9. `/health` informa configuração do banco;
10. `/manifest.webmanifest` tem estrutura instalável;
11. HTML possui cinco abas;
12. JavaScript do cliente compila;
13. Nenhum modo offline reinserido;
14. Caminho inexistente devolve HTTP 404.

**Regressão após correção:** oito cenários simulados, um para cada município, aprovados. O código da API seleciona agora exclusivamente verificações `watchdog_checks WHERE mode='independent'`, distinguindo-as da rotina `cron:environment`.

## Defeito identificado e corrigido nesta homologação

- **Defeito:** consulta anterior exibia o registro de watchdog mais recente, inclusive `cron:environment`, rotulando-o incorretamente como monitor independente. Isso poderia ocultar um estado de atenção.
- **Correção:** restringir consulta SQL ao modo `independent` e manter o registro temporal.
- **Abrangência:** só o Worker da PWA privada e a branch de homologação.
- **Reteste:** filtro SQL presente e aprovado nos oito cenários sintéticos; consulta independente foi executada contra o D1 real.

## Riscos remanescentes (bloqueios à publicação)

1. **P0 — Segurança:** tentar acessar a origem sem autenticação e confirmar efetivo bloqueio pelo Cloudflare Access.
2. **P0 — Funcionalidade:** sessão administrativa real deve abrir `/`, `/health`, `/api/pwa/status?city=itaituba` e `/manifest.webmanifest`.
3. **P1 — Instalação:** verificar instalação PWA real em Android (Chrome) e iOS (Safari), ícones, inicialização, atualização e comportamento desconectado.
4. **P1 — Mapas:** validar Windy, OpenStreetMap, PurpleAir, links IQAir e estado de falha de embeds externos.
5. **P1 — Integridade:** confrontar valores expostos pelo PWA com dados D1 no instante de teste, conferindo horário, origem, cobertura e status parcial.
6. **P2 — Resiliência:** ícones PNG hoje dependem de fetch a uma URL externa do GitHub. Recomenda-se incorporar os arquivos aos assets servidos pelo Worker.
7. **P2 — Produto:** a PWA privada ainda não replica todas as funções do painel original, incluindo mapa 3D e camadas próprias.

**Decisão de QA:** **APROVADA PARA CONTINUAR HOMOLOGAÇÃO PRIVADA, NÃO APROVADA PARA PRODUÇÃO OU APK FINAL.**

**Origem planejada:** https://sentinela-pwa-preview.gyantardeli.workers.dev/  
**Site público:** não alterado.
