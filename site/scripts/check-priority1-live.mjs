// Real providers; only the disposable local SQLite database receives writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {harness} from './priority1-harness.mjs';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sentinela-p1-live-')),filename=path.join(directory,'local.sqlite'),h=harness(filename),now=Math.floor(Date.now()/1000),startedAt=new Date().toISOString(),load=h.loader(fetch);
const [fire,environment]=await Promise.all([load('./lib/fire-snapshot').collectFirePacket(now),load('./lib/environment-provider').collectEnvironment(now)]);
const packet=load('./lib/fire-snapshot').validateFirePacket(fire,now),model=load('./lib/environment-provider').validateEnvironment(environment,now);
await load('./lib/fire-store').saveFireSnapshot(packet);await load('./lib/environment-store').saveEnvironment(model);h.sql.close();
const restarted=harness(filename),fresh=restarted.loader(),stored=await fresh('./lib/fire-store').readFireSnapshot(),cache=await fresh('./lib/environment-store').readEnvironmentCache();
assert.equal(stored.attemptedAt,now);assert.equal(stored.collection?.fires.length??0,packet.collection?.fires.length??0);assert.equal(cache.air?.locations.length??0,model.air?.length??0);assert.equal(cache.weather?.locations.length??0,model.weather?.length??0);
const report={startedAt,completedAt:new Date().toISOString(),productionWrites:0,network:'real INPE + real Open-Meteo',localPersistenceVerified:true,backendRestartVerified:true,inpe:fresh('./lib/fire-snapshot').fireDiagnostics(stored,Math.floor(Date.now()/1000)),environment:{airPlaces:cache.air?.locations.length??0,weatherPlaces:cache.weather?.locations.length??0,failures:model.failures,municipalityFailures:model.municipalityFailures}};
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/priority1-live-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));restarted.sql.close();fs.rmSync(directory,{recursive:true,force:true});
if(!packet.collection||!model.air?.length||!model.weather?.length)process.exitCode=1;
