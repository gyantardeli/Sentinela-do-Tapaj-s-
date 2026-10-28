# Validação para publicação — 26/10/2026

O usuário autorizou validar e publicar as alterações no site original Sentinela Tapajós. A base é a V35, commit `6f2d464fec8f6d3ee3a0a71958f8b0997d138c61`. A organização anterior de 14 abas independentes permanece restaurada, com Visão geral como entrada.

## Ajustes encontrados na validação

- Contraste de títulos, controles e cabeçalhos de tabelas no tema verde; os mapas conservam superfícies claras e rótulos escuros.
- Monitor da coleta: ausência de resposta ou de verificação independente não informa mais “Em dia”; a versão compacta também distingue consulta em andamento de falha. O estado automático não é inferido quando a consulta falha.
- Página de apoio retorna à Visão geral e usa texto adequado ao site publicado. Pagamentos continuam desativados.
- Rodapé do Diário identifica história, cultura e natureza, removendo a identificação de prévia independente.

## Verificação executada

As 14 verificações automatizadas da base passaram, abrangendo TypeScript, interface online, falhas de consulta e retomada de conexão, integração, operações, geometrias, reprodução de focos, KML, qualidade do ar, PurpleAir, previsão, apoio, acesso público e API móvel. Os resultados estão no JSON correspondente.

Após os ajustes, TypeScript e verificações de interface online, execução online, integração e apoio passaram novamente. Foi acrescentado um teste de renderização do monitor com seis cenários: carregamento, falha, ausência de verificação, consulta apenas manual, atraso e verificação em dia. Os outros componentes ambientais e os 63 arquivos protegidos de APIs, armazenamento, autorização e aplicativo móvel foram comparados às bases revisadas.

Na prévia gerenciada em navegador, os 14 painéis abriram; foram conferidos os capítulos do Diário, ida e volta da página de apoio, legibilidade e ausência de rolagem horizontal no tamanho de tela disponível. A falha da consulta da coleta exibe “Indisponível”.

## Limites

- A prévia não dispõe dos dados e vínculos de produção; não comprova atualização das fontes externas.
- O navegador de teste não oferece WebGL, portanto a renderização do mapa 3D não foi comprovada. A lógica de eventos, filtros e exportações passou nos testes automatizados.
- O servidor de mapas OpenStreetMap bloqueou tiles no ambiente de teste. Isso limita a inspeção da cartografia externa nesse navegador.
- Não houve inspeção em aparelho móvel real; o teste de API móvel não substitui essa inspeção.
- Não foram executadas ações manuais de coleta, pagamento ou alteração de dados em produção durante esta validação.

O build, envio do commit, criação da versão e publicação são realizados pelo fluxo Sites. O retorno da ferramenta de implantação deve confirmar a versão efetivamente publicada.
