import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const read=p=>fs.readFileSync(p,'utf8');
const page=read('app/page.tsx'),sw=read('public/sw.js');
for(const term of ['FieldPanel','BulletinPanel','PwaPanel','FieldModeContext','sentinela-cache-','preparePwa','Pacote offline']) assert(!page.includes(term),term);
assert(!page.includes('<UnifiedMap'),'independent panels replace the unified navigation');
assert(page.includes('sentinela-selva-readings-v1'));
assert(page.includes('disableLegacyOffline()'));
assert(read('components/areas-panel.tsx').includes('lib/download-file'));
for(const f of ['lib/offline.ts','lib/field-html.ts','components/field-panel.tsx','components/field-mode.tsx','components/bulletin-panel.tsx','components/pwa-panel.tsx','public/field/reader.js']) assert(!fs.existsSync(f),f);
for(const dir of ['app','components','lib']) for(const f of fs.readdirSync(dir,{recursive:true}).filter(f=>/\.(ts|tsx|css)$/.test(f))){
 const s=read(dir+'/'+f); assert(!/from ["'][^"']*(?:field-mode|field-panel|field-html|offline|pwa-install)["']/.test(s),f);
 assert(!/serviceWorker\.register\(/.test(s),f);
}
assert(!/addEventListener\(["']fetch["']|caches\.open\(/.test(sw));
assert(!/localStorage/.test(read('lib/online-only.ts')));
assert(!/localStorage|readFieldPacket|FIELD_SYNC_KEY/.test(read('lib/field-packet.ts')));
assert(read('mobile/worker.ts').includes('createFieldPacket'));
// Restoring the earlier tabs is intentional. Their retained online components and
// data modules must stay byte-identical to the reviewed V34 source.
// WatchdogPanel has a separately tested correction for unknown/error states.
const stable='f31d03bb7e2a0c762b488507f2bc12f6235dab39';
for(const file of ['components/use-snapshot.ts','lib/online-only.ts','components/fire-replay-panel.tsx','components/overview-maps.tsx','components/purpleair-panel.tsx','components/weather-panel.tsx','components/inpe-panel.tsx','components/radar-panel.tsx','components/history-panel.tsx','components/source-health.tsx','components/areas-panel.tsx','components/alerts-panel.tsx']) {
  assert.equal(read(file),execFileSync('git',['show',stable+':'+file],{encoding:'utf8'}),file+' retained online implementation');
}
assert(page.includes('PANELS.map'));
assert(page.includes('href="/apoie"'));
assert(page.includes('SentinelaExperiences'));
assert(page.includes('panelFromLocation(window.location.hash,window.location.search)'));

console.log(JSON.stringify({passed:true,checks:['no offline UI or orphan imports','manual storage key retained','mobile serializer retained without local storage','GeoJSON/CSV use independent download helper','legacy worker has no intercept','independent tabs reuse unchanged environmental components and online data modules']}));
