# HOMOLOGAÇÃO — Apoie o Sentinela / Pix empresarial (CNPJ)

**Status:** preparado em ramificação isolada; **não publicar, não unir à main e não habilitar pagamentos** sem validação e autorização.

## Escopo
- Navegação: link discreto “☕ Me paga um café?”; não adiciona cartões, filtros ou camadas ao mapa.
- Tom: leve e bem-humorado, com “cafezinho simbólico” e referências à Amazônia, sem esconder que se trata de contribuição voluntária, sem contrapartida.
- A mensagem declara que a metáfora do café não significa compra literal de café e que o apoio financia manutenção e desenvolvimento.
- Página `GET /apoie`, usando folha de estilos do projeto e CSS isolado.
- `GET /api/apoie`: resposta JSON sem cache, sem gravações e sem depender das fontes ambientais.
- Default seguro: `ativo=false`, `chavePix=null`, `beneficiario=null`.
- Após configuração empresarial válida: mostrar nome informado e chave Pix CNPJ, com opção de copiar. **Não cobra, não cria QR Code, não gera BR Code e não confirma pagamento.**
- Não coleta dados pessoais de doadores nem muda autorizações, banco, autenticação, mapa ou coleta.
- Finalidade: contribuição voluntária ao desenvolvimento do aplicativo, sem recompensas, conteúdo pago ou promessa de dedução tributária.

## Testes

Executar `npm run check` e `node --test test/apoie.test.mjs`. A suíte adicionada cobre desativação padrão, CNPJ inválido, ausência de autorização explícita e textos da página. Testar manualmente no celular e em computador:
1. Abrir o mapa e verificar que as camadas, indicadores e histórico permanecem intactos.
2. Acessar `/apoie` pelo menu; validar acessibilidade, retorno ao mapa e responsividade.
3. Sem nenhuma variável de Pix: `GET /api/apoie` retorna `ativo=false` e valores nulos; botão de cópia oculto.
4. Com variáveis incompletas/inválidas: permanece desativado; não exibe CNPJ.
5. Testar carregamento de página com API fora do ar: aviso de indisponibilidade sem dados inventados.
6. Somente em fase posterior: verificar CNPJ real e titularidade *diretamente no banco do recebedor*; conferir a concordância de nome e chave, antes de qualquer ativação.

## Configuração futura — não adicionar dados reais ao Git
As seguintes variáveis de ambiente **não devem ser preenchidas durante esta homologação**:
- `SENTINELA_PIX_ENABLED` — manter ausente ou `false`; somente `true` após autorização específica.
- `SENTINELA_PIX_CNPJ` — chave Pix empresarial em formato CNPJ numérico de 14 dígitos (sem pontuação), válida e efetivamente vinculada ao recebedor.
- `SENTINELA_PIX_BENEFICIARIO` — nome empresarial que o recebedor deseja exibir; o nome no banco deve ser conferido pelo usuário pagador.

**Limite técnico:** a validação sintática do CNPJ não comprova que ele seja uma chave Pix ativa nem que pertença à empresa. A conferência com o PSP/banco é obrigatória. Essa etapa não contém PIX Copia e Cola com valor definido nem QR. Não classificar a página como arrecadação beneficente ou isenta de tributos sem comprovação.

## Integração com o site original
O frontend neste repositório **não corresponde à publicação original** `https://sentinela-tapajos-ar.gyantardeli.chatgpt.site/`. Não há sincronização automática.

No editor **do projeto original**, após backup:
1. Adicionar somente a entrada discreta no menu “Sobre/Apoie” e a tela visual correspondente.
2. Conectar a configuração do Pix a um backend seguro; desabilitado por padrão.
3. Preservar totalmente o mapa único/3D, camadas, áreas, alertas e histórico existentes; não transplantar o painel V2.2 inteiro.
4. Abrir uma prévia no próprio projeto original, executar testes e solicitar aprovação expressa.
5. Não publicar no domínio original nem gerar APK até a autorização.

## Critérios de aceite
- [ ] Página de apoio funcional **em prévia**.
- [ ] Nenhum dado de pagamento fictício ou segredo versionado.
- [ ] Ausência de pagamento no modo padrão.
- [ ] Acesso fácil pelo menu; mapa principal sem novos elementos operacionais.
- [ ] Testes automatizados e de regressão concluídos.
- [ ] Validação do recebedor antes da ativação.
- [ ] Publicação somente com autorização específica.
