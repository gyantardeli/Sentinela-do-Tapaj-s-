# Pacote de importação — Sentinela Tapajós

Cópia da árvore original V2.3 / Prioridade 1 a ser incorporada ao repositório `gyantardeli/Sentinela-do-Tapaj-s-` sob `apps/site-original/` **sem sobrescrever a raiz V2.2**.

O backup foi obtido da Biblioteca do usuário (`Previa_Sentinela_V2.3_Prioridade1.zip`) e não é uma exportação verificável do estado atual v24 do ChatGPT Sites. Consulte `apps/site-original/README_PORTABILIDADE.md`.

## Importar no repositório

1. Clone `https://github.com/gyantardeli/Sentinela-do-Tapaj-s-.git`.
2. Crie uma branch de revisão, por exemplo `git switch -c feature/import-site-original-v23`.
3. Extraia as pastas deste arquivo ZIP na raiz do clone (sem apagar os arquivos existentes).
4. Faça `git status`, inspecione o diff e confira se não foram incluídos `.env`, chaves, banco D1 ou tokens.
5. Execute os testes que não dependem de bindings do Sites e revise a camada de segurança antes de publicar.
6. `git add apps/site-original CONSOLIDACAO_GITHUB.md && git commit -m "chore: import original Sentinela Site V2.3 source" && git push -u origin feature/import-site-original-v23`.
7. Abra PR, revise e faça merge; o código não deve ser implantado automaticamente.

## Pendências

- Confrontar as mudanças do site v22/v23/v24 com esta versão recuperada; mapa temporal e integração meteorológica podem ter alterações posteriores.
- Exportar e migrar banco D1 e preferências com backups restauráveis.
- Substituir autenticação gerida pelo ChatGPT e proteger rotas de escrita na hospedagem externa.
- Validar licenças e limites de APIs de terceiros; reconstruir automatizações externas.
- Validar testes de integração, PWA, PDF e APK após a implantação.
