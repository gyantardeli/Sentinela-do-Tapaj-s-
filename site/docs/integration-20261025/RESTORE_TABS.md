# Restauração das abas — 25/10/2026

Solicitação: retirar a simplificação das abas e voltar à organização anterior. Trabalho salvo sem publicação no projeto original.

## Organização

A ordem anterior foi recuperada da V30, mantendo os componentes ambientais atuais e os recursos online da V34:

1. Visão geral (tela inicial)
2. Mapa 3D · evolução
3. Comparar mapas (detecções/leituras locais e Windy)
4. Qualidade do ar
5. Previsão do tempo
6. INPE · Queimadas
7. Radar regional
8. Histórico regional
9. Saúde das fontes
10. Áreas de interesse
11. Alertas da operação
12. Coleta
13. Fontes e método
14. Diário do Explorador

O mapa único deixa de organizar a navegação. Histórico, notícias e diagnóstico têm telas próprias novamente. Áreas de interesse e alertas voltam a usar suas telas existentes. Os filtros de município, raio, período e satélite continuam conectados aos painéis apropriados. Fontes e método recupera a explicação das medições, limites e registros manuais.

O tema verde floresta, o Diário, as três experiências e a página de apoio permanecem. O botão de retorno do Diário aponta à Visão geral. O menu completo recebe rolagem própria e mantém abertura em telas estreitas.

A decisão de retirar Campo/offline e Boletim/offline permanece. Não há restauração dos módulos removidos, cache ambiental local, sincronização offline ou serviço de armazenamento. Áreas de interesse são consultadas no servidor; sua seleção vale para a sessão. O Pix continua desligado.

## Compatibilidade

Links antigos continuam válidos: `#mapa` e `#mapa-3d` levam ao mapa 3D; `#windy` abre Comparar mapas com vento; `#qualidade-do-ar`, `#previsao`, `#coleta`, `#fontes` e `#diario` abrem as abas correspondentes. Endereços desconhecidos e o antigo `#campo` retornam à Visão geral. `?tab=diario` continua disponível quando não há fragmento no endereço.

As APIs, Android, banco, autenticação, manifesto e módulos de coleta foram preservados. Não houve execução de ações de alerta, gravações no banco ou implantação. A prévia em arquivo bloqueia todas as chamadas `/api/`, inclusive mutações dos painéis recuperados.

## Verificação

Os resultados desta revisão ficam em `restored-tabs-checks.json`. Os registros antigos de regressão permanecem como evidência da V34. As verificações de interface foram ajustadas para a nova organização intencional, mantendo a comparação dos componentes ambientais e dos módulos online com a V34.

A prévia gerenciada não iniciou porque o ambiente informou outro servidor de desenvolvimento ativo. O diagnóstico suportado informou a prévia parada. Não há validação visual desta revisão em navegador ou aparelho. Nenhuma falha de infraestrutura foi contornada por publicação.
