# Guia de integração — revisão V2.1

**Situação:** pacote atualizado e testes locais concluídos; implantação no site anterior **não** foi feita.
O antigo projeto permanece inalterado. Preserve os mapas e a aparência anterior.

## 1. Segurança e implantação

- Faça backup do projeto hospedado e do estado persistente antes de alterar componentes.
- Rode o serviço Node em um backend com disco persistente. Use HTTPS/proxy. Não faça scraping no Android ou no browser.
- Configure `COLLECT_TOKEN` como segredo no backend. Não injete tokens no React/Vite ou APK.
- O backend deve realizar uma única coleta recorrente a cada hora enquanto estiver ativo.
- Configure o frontend para chamar o proxy no **mesmo domínio**: `/api/environment`, `/api/health`, `/api/radar`.
- Mantenha wind maps, SELVA e AccuWeather como consulta manual/iframe autorizado; não os contabilize como API de dados confirmada.

## 2. Aplicação no frontend

```js
import {consultarColetor, indicadorPrincipal, municipioNoPanorama} from './frontend-adapter.mjs';

// Chame a API UMA vez para cada combinação de município e filtros.
const dados = await consultarColetor({
  apiBase: '', municipio: 'itaituba', raioKm: 100, horas: 24, satelite: 'todos'
});
const cartao = indicadorPrincipal(dados);
const mesmaCidadeNoPanorama = municipioNoPanorama(dados);

// NÃO consulte um segundo cache do panorama para renderizar os cartões.
// Exiba cartao.pm25 ?? 'Sem dados' e não cartao.pm25 || 'Sem dados'.
// Se dados.modoOffline, mostre aviso + hora salva e não rotule como tempo real.
// Se dados.focos?.contagemCompleta !== true, NÃO use total=0 como ausência de focos.
// Se dados.focos?.limiteInferior > 0, exiba "ao menos N detecções".
// Sempre diferencie PM2,5 CAMS modelado de sensor físico.
```

## 3. Campos relevantes

`GET /api/environment?municipio=itaituba&raioKm=100&horas=24&satelite=todos`

- `cidade`: município efetivamente consultado.
- `indicadores`: mesma referência do cartão principal, incluída no mesmo JSON que o panorama.
- `regional`: oito municípios, com `ar`, `tempo`, `referenciaAr`, `referenciaVento`, `estadoAr`, `estadoTempo`.
- `ar` e `tempo`: camadas locais com estado individual (`atual`, `cache_anterior`, `defasado`, `sem_dados`) e horário do dado original.
- `focos`: `itens`, `total` (nulo se não há cobertura confiável e nenhuma detecção), `contagemCompleta`, `parcial`, `limiteInferior`.
- `ultimaExecucao`: ciclo da rotina, não implica sucesso de cada fonte.

## 4. Testes antes de publicar

1. Rodar `npm run check` (verificar 25 testes automatizados).
2. `ENABLE_AUTO_COLLECT=0 node server.mjs` e consultar `/api/health`, `/api/environment`, `/api/radar`.
3. Executar **coleta real** com servidor conectado à internet; confirmar fonte, horário, lat/lon, XML e CSV.
4. Validar na mesma tela que Itaituba no panorama e cartões têm os mesmos valores e horários.
5. Desconectar Internet no APK, validar cache local, data da leitura e aviso de modo offline.
6. Não publicar nova versão sem testes de coerência, valores zero legítimos e camadas parciais.

## 5. Limitações

Sem o código-fonte e o contrato da aplicação publicada, não é possível acoplar automaticamente
os novos endpoints ao site. As rotinas de teste usam respostas simuladas. A disponibilidade
atual de cada uma das vinte fontes não é garantida e exige monitoramento na hospedagem.
