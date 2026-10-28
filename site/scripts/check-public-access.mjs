import assert from 'node:assert/strict';
import fs from 'node:fs';
import {harness} from './priority1-harness.mjs';
const h=harness(':memory:'),load=h.loader(),guard=load('./lib/site-access');
const settings={ownerEmail:'owner@example.invalid',serviceToken:'service-test-token-32-characters-minimum'};
const paths=['areas','alerts','environment/ingest','fires/ingest','history/ingest','radar/ingest','watchdog','radar/schedule','radar/collect','access'];
for(const path of paths)for(const method of ['POST','PUT','PATCH','DELETE']){
 const request=new Request('https://site.invalid/api/'+path,{method});
 const denied=guard.guardSiteWrite(request,settings);assert.equal(denied.status,403);
 assert.equal(guard.guardSiteWrite(new Request(request,{headers:{'origin':'https://site.invalid'}}),settings).status,403,'same-origin is not authorization');
 assert.equal(guard.guardSiteWrite(new Request(request,{headers:{'x-sentinela-service-token':'wrong'}}),settings).status,403);
 assert.equal(guard.guardSiteWrite(new Request(request,{headers:{'x-sentinela-service-token':settings.serviceToken}}),settings),null);
 assert.equal(guard.guardSiteWrite(new Request(request,{headers:{'oai-authenticated-user-id':'trusted-owner-id','oai-authenticated-user-email':'OWNER@example.invalid'}}),settings),null);
 assert.equal(guard.guardSiteWrite(new Request(request,{headers:{'oai-authenticated-user-id':'trusted-viewer-id','oai-authenticated-user-email':'viewer@example.invalid'}}),settings).status,403);
 assert.equal(guard.guardSiteWrite(new Request(request,{headers:{'oai-authenticated-user-email':settings.ownerEmail}}),settings).status,403,'identity requires both platform headers');
 assert.equal(guard.guardSiteWrite(request,{}).status,403,'missing runtime configuration fails closed');
}
for(const method of ['GET','HEAD','OPTIONS'])assert.equal(guard.guardSiteWrite(new Request('https://site.invalid/api/weather-map',{method}),settings),null);
assert(fs.readFileSync('middleware.ts','utf8').includes('matcher:["/api/:path*"]'));
assert(fs.readFileSync('scripts/radar-runner-template.mjs','utf8').includes('"X-Sentinela-Service-Token": access.token'));
assert(fs.readFileSync('app/api/watchdog/instructions/route.ts','utf8').includes('X-Sentinela-Service-Token'));
assert(!fs.readFileSync('app/api/radar/instructions/route.ts','utf8').includes('Manter o Site privado'));
assert(!fs.readFileSync('components/site-access-notice.tsx','utf8').includes('SENTINELA_SERVICE_TOKEN'));
const info=JSON.parse(fs.readFileSync('lib/radar-runner-info.json','utf8'));const crypto=await import('node:crypto');assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/radar-collector.mjs')).digest('hex'),info.sha256);
h.sql.close();console.log(JSON.stringify({passed:true,checks:['all API write methods reject anonymous and viewer requests','same-origin is not authorization','owner identity and service token allowed','missing secrets fail closed','public read methods preserved','updated scheduled collector protocol and checksum','service credentials absent from client code'],productionWrites:0}));
