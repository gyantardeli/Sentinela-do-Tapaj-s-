import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";
const names = ["radar-sources", "radar-core", "radar-collector", "environment", "environment-provider", "monitoring", "history-collector", "source-http", "fire-collector", "fire-snapshot"];
const definitions = names.map(name => {
  const source = fs.readFileSync(path.join("lib", name + ".ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  return JSON.stringify("./" + name) + ": function(module, exports, require) {\n" + compiled + "\n}";
});
const template = fs.readFileSync("scripts/radar-runner-template.mjs", "utf8");
const runner = template.replace("/*__RADAR_MODULES__*/", "const definitions = {" + definitions.join(",\n") + "};");
fs.writeFileSync("public/radar-collector.mjs", runner);
fs.writeFileSync("lib/radar-runner-info.json", JSON.stringify({ revision: "radar-tapajos-v5", sha256: crypto.createHash("sha256").update(runner).digest("hex"), path: "/radar-collector.mjs" }, null, 2) + "\n");
console.log("Built portable Radar collector; no credentials embedded.");
