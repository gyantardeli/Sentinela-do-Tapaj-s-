import css from "../public/field/reader.css?raw";
import script from "../public/field/reader.js?raw";
import shell from "../public/field/reader.html?raw";
import type { FieldPacket } from "./field-packet";

export function fieldHtml(packet: FieldPacket) {
  const json = JSON.stringify(packet).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return shell.replace('<link rel="stylesheet" href="reader.css">', `<style>${css}</style>`)
    .replace('<script src="reader.js" defer></script>', `<script>${script}</script>`)
    .replace('<script id="field-data" type="application/json">null</script>', `<script id="field-data" type="application/json">${json}</script>`);
}
