# Código do site V41

Proveniência: ChatGPT Sites, commit ddd8c6970fa6b448d77bf1c183e3ad7211db63a9. Os 338 arquivos rastreados dessa revisão estão reproduzidos sem alterações em site/.

## Desenvolvimento

Requer Node >=22.13.0 e pnpm 11.25.0. A partir da raiz:

```sh
cd site
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm run dev
```

O runtime usa Vinext/Cloudflare e D1; consulte site/README.md, site/PUBLIC_ACCESS.md e site/.openai/hosting.json. Não execute o servidor V2.2 da raiz esperando obter o painel V41. Preserve o project_id do site original. Publicação pelo fluxo próprio do ChatGPT Sites, separada de um push ao GitHub.

## Validação desta revisão

TypeScript e compilação de produção passaram antes da publicação V41. O IQAir carregou sua página no quadro; a renderização efetiva do mapa não foi confirmada no navegador de teste. PurpleAir e mapa 3D ainda exigem validação em dispositivo com WebGL. O APK atual é um lançador online; consulte site/android/README.md.

A cópia não contém node_modules, builds, credenciais, chaves de assinatura, banco em produção ou estado local de execução. Os agendamentos existentes são recursos externos, não recriados pelo GitHub.

## Testes no GitHub Actions

O workflow `Testar site Sentinela` roda em pushes para main, pull requests e por acionamento manual. Usa Node 24, Python 3.12 e a versão pnpm declarada em site/package.json, com lockfile congelado. Executa `pnpm run typecheck`, `pnpm run check:ci` (16 suítes) e `pnpm run build` dentro de site/.

As suítes cobrem coleta com fontes simuladas, persistência SQLite, histórico, alertas, geometria, reprodução de focos, KML, previsão, modelos de ar, PurpleAir/IQAir, RSS, autorização das APIs e operação online. Não usam credenciais de produção nem gravam no site publicado. Não comprovam disponibilidade atual dos mapas externos, execução dos agendamentos ou funcionamento em Android real.

O coletor executa seus 19 grupos funcionais com `check-collector-v23 --ci`; apenas a comparação histórica de arquivos é omitida, pois depende de commits do repositório original. As auditorias históricas `check-consolidated-integration` e `check-online-interface` também dependem desses commits e ficam fora da CI portátil. O workflow anterior da raiz continua testando a V2.2. A CI não faz deploy.
