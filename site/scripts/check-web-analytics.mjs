import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const worker = readFileSync(new URL("../build/sites-worker.ts", import.meta.url), "utf8");

assert.match(layout, /import Script from ["']next\/script["'];/);
assert.match(layout, /CLOUDFLARE_WEB_ANALYTICS_TOKEN = "[a-f0-9]{32}";/);
assert.equal((layout.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) ?? []).length, 1, "beacon must appear exactly once");
assert.match(layout, /strategy="afterInteractive"/);
assert.match(layout, /data-cf-beacon=\{JSON\.stringify\(\{/);
assert.match(layout, /token: CLOUDFLARE_WEB_ANALYTICS_TOKEN,/);
assert.match(layout, /spa: true,/);
assert.ok(layout.indexOf("<SiteAccessNotice />") < layout.indexOf("<Script"), "beacon must remain within the document body");
assert.ok(!worker.includes("cloudflareinsights"), "Worker APIs must not be instrumented at fetch level");

console.log(JSON.stringify({
  passed: true,
  checks: [
    "Cloudflare Web Analytics beacon present once in root layout",
    "production site token and SPA navigation tracking configured",
    "beacon loaded after hydration in browser, outside Worker APIs"
  ]
}));
