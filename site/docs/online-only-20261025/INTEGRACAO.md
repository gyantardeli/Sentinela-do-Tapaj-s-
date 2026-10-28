# Sentinela Tapajós — candidata online

Data: 25/10/2026. Estado: **PRÉ-HOMOLOGAÇÃO; NÃO PUBLICAR**.

Projeto original: `appgprj_6ad394eb7be48191a994993ead538987`.
Base ativa: versão 32, commit `095c2c1a0111957749f161a7d3734873da951b24`.
A versão publicada permanece a 30. Esta alteração deve ser salva sem implantação.

## Alterações

- Removidos Modo Campo, leitor, pacote e boletim offline, seus módulos órfãos e estilos.
- Nenhum snapshot ambiental é lido ou gravado no localStorage. Falha de consulta limpa dados remotos e informa o erro; reconexão revalida. Respostas tardias não restauram dados após desconexão.
- Limpeza restrita ao cache automático `sentinela-shell-v1` e aos registros do `/sw.js` da mesma origem. Leituras manuais, outros caches e áreas não são apagados. O SW de aposentadoria não intercepta requisições.
- Exportações GeoJSON/CSV usam um helper de download independente.
- Manifesto e ícones preservados. O APK antigo não foi recompilado nem homologado nesta tarefa.
- `lib/field-packet.ts` NÃO é órfão: `mobile/worker.ts` usa `createFieldPacket`. Mantido o contrato JSON e removida apenas a persistência de navegador. Não se declara removido o modo offline de um APK já instalado.

## Preservação e rastreabilidade

O patch V2.3 serviu para comparação e merge semântico. `app/page.tsx` não foi substituído pelo overlay antigo. Um teste compara toda a marcação JSX com a versão 32. O mapa único, as quatro camadas, a marca, o código 3D e o fallback 2D foram preservados.

APIs, autenticação, esquema, migrações, stores e workers permanecem byte a byte iguais à base ativa nas verificações de preservação. O backup original, a árvore e os hashes estão documentados no manifesto anexo. O SHA base remoto permite reconstruir o backup.

## Verificação da candidata

TypeScript completo: aprovado. Quinze suítes de regressão: aprovadas na reaplicação de 25/10. As quatro novas famílias de testes executam o SW, a limpeza de inicialização, useSnapshot e Home com respostas controladas. Os testes D1 de escrita são locais/em memória; não escrevem em produção.

Na inspeção visual de 24/10: desktop e viewport de 390 px funcionaram, menu móvel abriu/fechou, filtros e camadas foram navegados; indisponibilidade não virou zero. A prévia mostrou o fallback 2D, mas o navegador não iniciou WebGL/3D. Há capturas antes/depois. Após a recuperação, a marcação da página foi novamente comparada com a base e os testes foram repetidos.

D1 real do Site foi consultado somente para leitura: tabelas e amostras existentes de radar_runs e environment_observations. Amostras não demonstram atualidade da coleta. Não houve dump ou alteração do banco.

## Pendências que impedem homologação

1. Prévia externa protegida desta candidata: ainda não implantada. O Sites não fornece uma URL independente ao salvar sem publicar. O Worker `sentinela-tapajos-staging` existente tem Access e quatro cron ativos; o entrypoint do Site contém fetch, sem o scheduled desse ambiente. Substituir diretamente o Worker poderia interromper a coleta. É necessário integrar a candidata preservando esse wrapper e validar os vínculos antes de atualizar staging.
2. Fluxo completo da candidata com D1 real e fontes externas, incluindo históricos e alertas; provedores retornaram falhas na prévia local.
3. WebGL/3D em navegador/dispositivo compatível; o fallback 2D foi observado.
4. Instalação como aplicativo online e testes de rede em aparelho físico. Manifesto/ícones e testes locais não substituem essa validação.
5. Atualizar e recompilar o APK online em etapa própria; o contrato mobile foi preservado nesta candidata.

Nenhuma publicação, alteração de audiência, rota, segredo, agendamento ou banco de produção foi executada. Não solicitar publicação enquanto essas pendências permanecerem.
