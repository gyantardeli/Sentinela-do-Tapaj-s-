import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const cache = new Map();
function load(name) {
  const file = path.resolve(name);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", compiled)(specifier => load(path.resolve(path.dirname(file), specifier + ".ts")), exports);
  return exports;
}
const { replayKml } = load("lib/fire-kml.ts");
const { buildFireReplay, replayFrame } = load("lib/fire-replay.ts");
const start = 1792300000, end = start + 86400, cursor = start + 7200;
const fire = (id, time, satellite = "NPP-375") => ({ id, time, satellite, lat: -4.27, lon: -55.99, frp: 12.5, source: 'INPE <a & "b">', municipality: 'São João & Tapajós\u0001' });
const replay = buildFireReplay([fire("first", start + 1), fire("latest", cursor - 20), fire("other-satellite", cursor - 10, "AQUA_M-T"), fire("future", end - 1)], start, end);
const options = { fires: replay.detections, start, end, cursor, place: { id: "itaituba", name: "Itaituba & Tapajós", lat: -4.27, lon: -55.99 }, radius: 25, satellite: "all", eventId: "all", recentOnly: false, sourceStatus: "partial" };
function inspect(kml) {
  return JSON.parse(execFileSync("python", ["-c", `
import sys,json,xml.etree.ElementTree as ET
r=ET.fromstring(sys.stdin.read()); n={'k':'http://www.opengis.net/kml/2.2'}
ids=[v.attrib['id'] for v in r.iter() if 'id' in v.attrib]
assert len(ids)==len(set(ids)), 'KML identifiers must be unique'
points=[]
for p in r.findall('.//k:Placemark',n):
 point=p.find('k:Point',n)
 if point is None: continue
 points.append({'id':p.findtext('k:name',namespaces=n),'coordinates':point.findtext('k:coordinates',namespaces=n),'mode':point.findtext('k:altitudeMode',namespaces=n),'time':p.findtext('k:TimeStamp/k:when',namespaces=n),'data':{d.attrib['name']:d.findtext('k:value',namespaces=n) for d in p.findall('k:ExtendedData/k:Data',n)}})
ring=r.findtext('.//k:LinearRing/k:coordinates',namespaces=n)
assert not r.findall('.//k:NetworkLink',n), 'export must not call back to private Site'
print(json.dumps({'points':points,'ring':ring,'lines':len(r.findall('.//k:LineString',n)),'description':r.findtext('k:Document/k:description',namespaces=n)}))
`], { input: kml, encoding: "utf8" }));
}
const snapshot = inspect(replayKml(options));
assert.equal(snapshot.points.length, 3, "future observations must not be exported");
assert.deepEqual(snapshot.points.map(p => p.time), replayFrame(replay, cursor).visible.map(f => new Date(f.time * 1000).toISOString()));
assert.equal(snapshot.points[0].coordinates, "-55.9900000,-4.2700000,0", "Google Earth uses longitude, latitude, altitude");
assert.ok(snapshot.points.every(p => p.mode === "clampToGround"));
assert.equal(snapshot.points[0].data.fonte, 'INPE <a & "b">', "XML metacharacters round trip as text");
assert.equal(snapshot.points[0].data.municipio, "São João & Tapajós", "invalid XML control characters are removed");
assert.equal(snapshot.points[0].data.frp_MW, "12.5");
assert.equal(snapshot.ring.split(" ")[0], snapshot.ring.split(" ").at(-1), "circle boundary must close exactly");
assert.match(snapshot.description, /Situação da fonte: partial/);
assert.equal(inspect(replayKml({ ...options, satellite: "NPP-375", recentOnly: true })).points.length, 1, "satellite and recent filters are preserved");
assert.equal(inspect(replayKml({ ...options, eventId: "missing" })).points.length, 0);
const empty = inspect(replayKml({ ...options, fires: [] })); assert.equal(empty.points.length, 0); assert.ok(empty.ring, "an empty result still exports its analysis area");
const polygon = { id: "polygon", name: 'Área "A" <B>', kind: "polygon", points: [{ lat:-4.3,lon:-56 },{ lat:-4.2,lon:-56 },{ lat:-4.2,lon:-55.9 }], radiusKm:0, updatedAt:start };
const p = inspect(replayKml({ ...options, fires:[], area:polygon })); assert.equal(p.ring.split(" ").length, 4);
const corridor = { ...polygon, kind:"corridor", points:polygon.points.slice(0,2), radiusKm:5 };
const c = inspect(replayKml({ ...options, fires:[], area:corridor })); assert.equal(c.ring,null); assert.equal(c.lines,4);
assert.throws(() => replayKml({ ...options, cursor:end+1 }));
console.log(JSON.stringify({ verified:true, checks:["XML parsing and unique IDs", "longitude/latitude and terrain", "original attributes and escaping", "observation timestamps", "no future leakage", "satellite/event/recent filters", "empty source", "circle/polygon/corridor geometry", "no private callbacks"] }));
