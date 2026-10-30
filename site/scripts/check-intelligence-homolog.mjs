import assert from "node:assert/strict";
import { hasCompleteFire, hasCompleteAir, fireTotalForCoveredDays, meanPm25ForCoveredDays, responsePercent } from "../lib/intelligence-metrics.ts";

const complete = { closed: true, fireCoverage: "full", fireCount: 0, pm25: 0, pmSamples: 24, expectedHours: 24 };
const positive = { closed: true, fireCoverage: "full", fireCount: 12, pm25: 18, pmSamples: 24, expectedHours: 24 };
const partial = { closed: true, fireCoverage: "partial", fireCount: 7, pm25: 55, pmSamples: 12, expectedHours: 24 };
const absent = { closed: true, fireCoverage: "missing", fireCount: null, pm25: null, pmSamples: 0, expectedHours: 24 };
const current = { closed: false, fireCoverage: "full", fireCount: 5, pm25: 30, pmSamples: 24, expectedHours: 24 };

assert.equal(hasCompleteFire(complete), true, "Zero verificado deve ser válido.");
assert.equal(hasCompleteAir(complete), true, "PM2,5 zero verificado deve ser válido.");
assert.equal(hasCompleteFire(partial), false, "Não aceitar foco parcial como completo.");
assert.equal(hasCompleteAir(partial), false, "Não aceitar PM2,5 parcial como completo.");
assert.equal(hasCompleteFire(current), false, "Não incluir dia em curso.");
assert.equal(hasCompleteAir(current), false, "Não incluir dia em curso.");
assert.equal(fireTotalForCoveredDays([partial, absent]), null, "Ausência não é zero.");
assert.equal(meanPm25ForCoveredDays([partial, absent]), null, "Ausência não é zero.");
assert.equal(fireTotalForCoveredDays([complete, positive, partial, current]), 12);
assert.equal(meanPm25ForCoveredDays([complete, positive, partial, current]), 9);
assert.equal(responsePercent(87.5), 87.5, "Porcentagem não deve ser multiplicada novamente.");
assert.equal(responsePercent(0), 0);
assert.equal(responsePercent(100), 100);
assert.equal(responsePercent(10000), null, "Taxa fora da escala é inválida.");
console.log("Inteligência Ambiental: 14 verificações de integridade aprovadas.");
