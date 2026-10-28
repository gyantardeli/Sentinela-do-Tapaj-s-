import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const nativeRequire = createRequire(import.meta.url), modules = new Map();
function load(name) {
  if (!name.startsWith('.')) return nativeRequire(name);
  const file = ['.ts', '.tsx'].map(ext => path.resolve(name + ext)).find(fs.existsSync);
  if (!file) throw new Error('Module not found: ' + name);
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} }; modules.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext('(function(require,module,exports){' + code + '\n})', { console, setTimeout, clearTimeout })(id => load(id.startsWith('.') ? './' + path.relative(process.cwd(), path.resolve(path.dirname(file), id)) : id), mod, mod.exports);
  return mod.exports;
}

const api = load('./lib/purpleair');
// Category transitions from the US EPA/AirNow scale, including real zero.
const boundaries = [[0,0],[50,0],[51,1],[100,1],[101,2],[150,2],[151,3],[200,3],[201,4],[300,4],[301,5],[500,5]];
for (const [value,index] of boundaries) {
  const result = api.interpretPurpleAirAqi(String(value));
  assert.equal(result.state, 'value'); assert.equal(result.value, value);
  assert.equal(result.band, api.PURPLEAIR_AQI_BANDS[index]);
}
for (const input of ['', '   ']) assert.equal(api.interpretPurpleAirAqi(input).state, 'empty');
for (const input of ['-1','501','50.5','NaN','Infinity','abc']) assert.equal(api.interpretPurpleAirAqi(input).state, 'invalid');

const Panel = load('./components/purpleair-panel').default;
const { PLACES } = load('./lib/environment');
const render = (place = PLACES[0]) => renderToStaticMarkup(React.createElement(Panel, { place }));
const full = render();
assert(full.includes('<iframe') && full.includes(api.PURPLEAIR_REGION_URL), 'normal view retains the supplied map settings');
assert.equal((full.match(/<iframe/g)||[]).length,1,'PurpleAir is the only initially loaded map');
assert(!/<input|air-map-canvas|<details[^>]*\bopen(?:=|\s|>)/.test(full),'manual interpreter removed and CAMS initially collapsed');
assert(full.indexOf('Mapa PurpleAir')<full.indexOf('<details'),'PurpleAir appears before the collapsed CAMS section');
assert(full.includes('Mapa CAMS · estimativas e previsão'));
for(const band of api.PURPLEAIR_AQI_BANDS) assert(full.includes(band.range)&&full.includes(band.label),'all AQI legend bands remain visible');
assert(full.includes('não é uma concentração de PM2,5'), 'AQI and concentration must remain distinct');
for(const url of ['https://www.airnow.gov/aqi/aqi-basics/','https://community.purpleair.com/t/purpleair-map-guide/90']) assert(full.includes(url),'official references retained');
for (const place of PLACES) assert(render(place).includes('Ver ' + place.name));
console.log(JSON.stringify({ passed: true, checks: ['all six AQI boundaries and zero', 'missing and invalid input remain unclassified', 'PurpleAir prominent with supplied map URL', 'CAMS collapsed without initial render', 'Portuguese legend and official references visible', 'all eight municipality labels'] }));
