import assert from "node:assert/strict";
import { normalizeParaCatalog, PARA_MUNICIPALITY_COUNT, PARA_UF_CODE } from "../lib/municipal-catalog.ts";

const sample = Array.from({ length: PARA_MUNICIPALITY_COUNT }, (_, i) => ({
  id: Number(`${PARA_UF_CODE}${String(i).padStart(5, "0")}`),
  nome: `Município ${String(PARA_MUNICIPALITY_COUNT - i).padStart(3, "0")}`,
}));
const result = normalizeParaCatalog(sample);
assert.equal(result.length, 144);
assert.equal(result[0].state, "PA");
assert.equal(result[0].monitoring, "not_verified");
assert.equal(result[0].name, "Município 001");
assert.equal(result[143].name, "Município 144");
assert.throws(() => normalizeParaCatalog(sample.slice(0, 143)), /incompleto/);
assert.throws(() => normalizeParaCatalog([...sample.slice(0, 143), sample[0]]), /unicidade/);
assert.throws(() => normalizeParaCatalog([{ id: 1100001, nome: "Outro estado" }, ...sample.slice(1)]), /inválidos/);
assert.throws(() => normalizeParaCatalog([{ id: sample[0].id, nome: "" }, ...sample.slice(1)]), /inválidos/);
console.log("Catálogo Pará: validação, ordenação e falha segura — OK (dados simulados).");
