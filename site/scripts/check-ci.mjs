import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const checks = [
  "check-collector-v23",
  "check-apoie-integration",
  "check-unified-map",
  "check-radarclima-iframe",
  "check-priority1",
  "verify-monitoring",
  "verify-operations",
  "verify-geo-monitor",
  "check-fire-replay",
  "check-fire-kml",
  "check-weather-capture",
  "check-air-quality-map",
  "check-purpleair",
  "check-rss1",
  "check-public-access",
  "check-online-runtime",
  "check-mobile"
];
for (const name of checks) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(process.execPath, [`scripts/${name}.mjs`, ...(name === "check-collector-v23" ? ["--ci"] : [])], {
    cwd, stdio: 'inherit', timeout: 120_000,
  });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`\n${checks.length} suítes concluídas.`);
