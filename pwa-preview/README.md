# Sentinela Tapajós · Prévia PWA privada — 27/10/2026

## Endereço de homologação
https://sentinela-pwa-preview.gyantardeli.workers.dev/

Acesso restrito pela política já existente "Sentinela Tapajos - Administradores" do Cloudflare Zero Trust; esta URL não é o site público nem o ambiente de coleta. Não divulgar como versão operacional.

## Implementado
- Interface responsiva móvel e desktop, abas Mapa / Visão geral / Previsão / Qualidade do ar / Coleta.
- Identidade verde-floresta com símbolo de harpia vetorial.
- Manifesto standalone, ícones 192/512px reaproveitados do repositório, sugestões de instalação para Android/iOS.
- Camada principal OpenStreetMap, opção Windy e PurpleAir; abertura de IQAir, AccuWeather, Clima & Radar e INPE.
- Carregamento de mapas externos sob demanda; troca de cidade; botões de acesso às fontes.
- Endpoint /health apenas para verificar a disponibilidade do protótipo.
- Cache-Control: no-store, sem service worker registrado, sem dados offline e sem comandos de coleta.

## Limitações e testes manuais obrigatórios
- NÃO integrado às APIs reais, ao D1, às detecções geográficas, ao mapa 3D ou ao histórico diário. Os indicadores exibem "—".
- Mapas de terceiros podem restringir iframes. Os links abrem diretamente as fontes quando necessário.
- As páginas protegidas por Cloudflare Access podem exigir autenticação adicional durante o fluxo de instalação PWA.
- Instalação como aplicativo depende do navegador, de HTTPS, ícones e condições da plataforma; testar no dispositivo.
- O botão de instalação mostra instruções manuais quando o navegador não emite beforeinstallprompt.
- Ícones PNG são servidos por um proxy de arquivos públicos do repositório; caso a fonte fique indisponível, podem falhar.
- Teste automatizado local: node --test test/pwa-preview.test.mjs; sintaxe da Worker verificada na implantação Cloudflare.
- Testar no Chrome Android, Safari iOS e Firefox desktop após autenticação; examinar console e comportamento das páginas externas.

## Próximo marco
Unificar progressivamente com a interface e APIs reais do site original, preservar recursos existentes, conferir política de acesso e cobertura dos dados antes de qualquer lançamento ao público.

A branch é de homologação e não deve ser mesclada diretamente na main sem auditoria.
