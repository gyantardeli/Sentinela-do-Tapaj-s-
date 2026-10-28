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
