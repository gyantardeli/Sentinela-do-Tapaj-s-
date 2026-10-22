import { createInterface } from "node:readline";
import { execFileSync } from "node:child_process";
const definitions = {"./radar-sources": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RADAR_AXES = exports.RADAR_LOCALITIES = exports.RADAR_SOURCES = void 0;
exports.sourceIndexUrl = sourceIndexUrl;
exports.RADAR_SOURCES = [
    { id: "giro", name: "Giro Portal", domain: "giroportal.com.br", url: "https://www.giroportal.com.br/", category: "local", coverage: "Itaituba, Miritituba e Tapajós" },
    { id: "plantao", name: "Plantão 24Horas News", domain: "plantao24horasnews.com.br", url: "https://plantao24horasnews.com.br/", category: "local", coverage: "Itaituba e região do Tapajós", feeds: ["https://plantao24horasnews.com.br/feed/"] },
    { id: "folha", name: "Folha do Progresso", domain: "folhadoprogresso.com.br", url: "https://news.folhadoprogresso.com.br/", category: "local", coverage: "Novo Progresso, BR-163 e sudoeste do Pará", feeds: ["https://news.folhadoprogresso.com.br/feed/"] },
    { id: "tapajos", name: "Tapajós de Fato", domain: "tapajosdefato.com.br", url: "https://www.tapajosdefato.com.br/", category: "regional", coverage: "Tapajós e oeste do Pará" },
    { id: "impacto", name: "Jornal O Impacto", domain: "oimpacto.com.br", url: "https://oimpacto.com.br/", category: "regional", coverage: "Santarém e oeste do Pará", feeds: ["https://oimpacto.com.br/feed/"] },
    { id: "estadonet", name: "O EstadoNet", domain: "oestadonet.com.br", url: "https://oestadonet.com.br/", category: "regional", coverage: "Oeste do Pará e Baixo Amazonas" },
    { id: "jeso", name: "Blog do Jeso", domain: "jesocarneiro.com.br", url: "https://www.jesocarneiro.com.br/", category: "regional", coverage: "Santarém e oeste do Pará", feeds: ["https://www.jesocarneiro.com.br/feed/"] },
    { id: "roma", name: "Roma News", domain: "romanews.com.br", url: "https://www.romanews.com.br/", category: "regional", coverage: "Pará; filtrado para a região de interesse" },
    { id: "g1", name: "G1 Santarém e Região", domain: "g1.globo.com/pa/santarem-regiao", url: "https://g1.globo.com/pa/santarem-regiao/", category: "regional", coverage: "Santarém, Tapajós e oeste do Pará" },
    { id: "oliberal", name: "O Liberal", domain: "oliberal.com", url: "https://www.oliberal.com/", category: "regional", coverage: "Pará; filtrado para a região de interesse" },
    { id: "dol", name: "DOL", domain: "dol.com.br", url: "https://dol.com.br/", category: "regional", coverage: "Pará; filtrado para a região de interesse" },
    { id: "agencia-para", name: "Agência Pará", domain: "agenciapara.com.br", url: "https://www.agenciapara.com.br/", category: "official", coverage: "Comunicados do Governo do Pará" },
    { id: "bombeiros", name: "Bombeiros / Defesa Civil do Pará", domain: "bombeiros.pa.gov.br", url: "https://www.bombeiros.pa.gov.br/", category: "official", coverage: "Prevenção, resposta e boletins estaduais", feeds: ["https://www.bombeiros.pa.gov.br/feed/"] },
    { id: "semas", name: "SEMAS Pará", domain: "semas.pa.gov.br", url: "https://www.semas.pa.gov.br/", category: "official", coverage: "Meio ambiente e gestão do fogo no Pará" },
    { id: "itaituba", name: "Prefeitura de Itaituba", domain: "itaituba.pa.gov.br", url: "https://www.itaituba.pa.gov.br/", category: "official", coverage: "Itaituba e distritos" },
    { id: "santarem", name: "Prefeitura de Santarém", domain: "santarem.pa.gov.br", url: "https://santarem.pa.gov.br/noticias", category: "official", coverage: "Santarém, Alter do Chão e comunidades" },
    { id: "ibama", name: "IBAMA / Prevfogo", domain: "gov.br/ibama", url: "https://www.gov.br/ibama/pt-br", category: "official", coverage: "Ações e comunicados com menção ao Pará ou à Amazônia" },
    { id: "icmbio", name: "ICMBio", domain: "gov.br/icmbio", url: "https://www.gov.br/icmbio/pt-br", category: "official", coverage: "Unidades de conservação; foco em Tapajós e Jamanxim" },
    { id: "censipam", name: "Censipam", domain: "gov.br/censipam", url: "https://www.gov.br/censipam/pt-br", category: "official", coverage: "Monitoramento e resposta na Amazônia Legal" },
    { id: "mppa", name: "Ministério Público do Pará", domain: "mppa.mp.br", url: "https://www2.mppa.mp.br/", category: "official", coverage: "Ações ambientais e recomendações no Pará" },
];
exports.RADAR_LOCALITIES = [
    { id: "itaituba", name: "Itaituba", axis: "itaituba", municipality: "itaituba", aliases: ["itaituba"] },
    { id: "miritituba", name: "Miritituba", axis: "itaituba", municipality: "itaituba", aliases: ["miritituba"] },
    { id: "jacareacanga", name: "Jacareacanga", axis: "jacareacanga", municipality: "jacareacanga", aliases: ["jacareacanga", "rio cururu", "aldeia cururu"] },
    { id: "novo-progresso", name: "Novo Progresso", axis: "novo-progresso", municipality: "novo-progresso", aliases: ["novo progresso"] },
    { id: "moraes-almeida", name: "Moraes Almeida", axis: "novo-progresso", municipality: "itaituba", aliases: ["moraes almeida", "moraes de almeida"] },
    { id: "castelo-sonhos", name: "Castelo dos Sonhos", axis: "novo-progresso", municipality: "altamira", aliases: ["castelo dos sonhos"] },
    { id: "ruropolis", name: "Rurópolis", axis: "ruropolis-placas", municipality: "ruropolis", aliases: ["ruropolis"] },
    { id: "placas", name: "Placas", axis: "ruropolis-placas", municipality: "placas", aliases: ["municipio de placas", "em placas", "cidade de placas", "placas pa", "placas no para"] },
    { id: "aveiro", name: "Aveiro", axis: "aveiro", municipality: "aveiro", aliases: ["aveiro", "fordlandia"] },
    { id: "trairao", name: "Trairão", axis: "trairao", municipality: "trairao", aliases: ["trairao"] },
    { id: "santarem", name: "Santarém e entorno", axis: "santarem", municipality: "santarem", aliases: ["santarem", "alter do chao", "belterra", "mojui dos campos", "ponta de pedras"] },
];
exports.RADAR_AXES = [
    { id: "itaituba", name: "Itaituba / Miritituba" }, { id: "jacareacanga", name: "Jacareacanga" }, { id: "novo-progresso", name: "Novo Progresso / Moraes Almeida / Castelo dos Sonhos" },
    { id: "ruropolis-placas", name: "Rurópolis / Placas" }, { id: "aveiro", name: "Aveiro" }, { id: "trairao", name: "Trairão" }, { id: "santarem", name: "Santarém e entorno" },
];
function sourceIndexUrl(source) {
    const query = `site:${source.domain} (incêndio OR queimadas OR queimada OR fumaça OR "focos de calor" OR "pega fogo") when:30d`;
    return "https://news.google.com/rss/search?" + new URLSearchParams({ q: query, hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" });
}

},
"./radar-core": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fold = fold;
exports.decodeText = decodeText;
exports.parseFeed = parseFeed;
exports.isFireText = isFireText;
exports.classifyText = classifyText;
exports.cleanTitle = cleanTitle;
exports.priority = priority;
exports.groupArticles = groupArticles;
exports.canonicalUrl = canonicalUrl;
exports.acceptsPublisher = acceptsPublisher;
const radar_sources_1 = require("./radar-sources");
function fold(text) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeText(text) { return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16)))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n)))).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, x) => (ENTITIES[x] ?? x)); }
function plain(text) { return decodeText(decodeText(text).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function parseFeed(xml) {
    if (xml.length > 2_000_000 || !/<(?:rss|feed)\b/i.test(xml))
        throw new Error("Resposta não é um RSS/Atom válido.");
    const blocks = Array.from(xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi), m => m[2]).slice(0, 120);
    const tag = (text, name) => text.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"))?.[1] ?? "";
    return blocks.map(block => ({
        title: plain(tag(block, "title")), url: decodeText(tag(block, "link").trim() || block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] || ""),
        date: plain(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date")),
        text: plain(tag(block, "description") || tag(block, "summary")).slice(0, 700), sourceUrl: block.match(/<source\b[^>]*url=["']([^"']+)["']/i)?.[1] ?? null,
    }));
}
function isFireText(text) {
    const s = fold(text);
    return /\b(incendios?|queimadas?|fumaca|focos? de calor|focos? de fogo|combate ao fogo|pegou fogo|pega fogo|em chamas|incendiar|incendiada|incendiado)\b/.test(s);
}
function classifyText(title, body = "") {
    const combined = title + " " + body.slice(0, 500), s = fold(combined), t = fold(title);
    if (!isFireText(combined))
        return null;
    const foreignAmbiguity = /\b(portugal|portuguesa?|distrito de santarem)\b/.test(s) && !/pará/i.test(combined) && !/\b(tapajos|fordlandia|oeste do para|baixo amazonas)\b/.test(s);
    const places = radar_sources_1.RADAR_LOCALITIES.filter(p => !(foreignAmbiguity && (p.id === "aveiro" || p.id === "santarem")) && p.aliases.some(a => (" " + s + " ").includes(" " + fold(a) + " "))).map(p => p.id);
    const regions = [];
    if (/pará/i.test(combined) || /\b(no para|do para|estado do para|paraense|paraenses)\b/.test(s))
        regions.push("Pará");
    if (/\b(tapajos|baixo amazonas|oeste do para|sudoeste do para|flona do jamanxim|floresta nacional do jamanxim|flona do tapajos)\b/.test(s))
        regions.push("Tapajós / oeste do Pará");
    if (/\b(amazonia|amazonica|amazonico|amazonia legal)\b/.test(s))
        regions.push("Amazônia");
    if (!places.length && !regions.length)
        return null;
    const tags = [];
    if (/\b(br 163|br 230|transamazonica|rodovia|estrada|balsa|porto|aeroporto|aerodromo|visibilidade|transito)\b/.test(s))
        tags.push("Transporte / acesso");
    if (/\b(saude|respirator\w*|pneumonia|qualidade do ar|insalubre|poluicao|hospital|fumaca)\b/.test(s))
        tags.push("Saúde / fumaça");
    if (/\b(aldeia|indigena|indigenas|comunidade|comunidades|moradores|residencias|casas|desabrigados)\b/.test(s))
        tags.push("Comunidades");
    if (/\b(brigadistas?|bombeiros|prevfogo|combate|resgate|brigadas?)\b/.test(s))
        tags.push("Resposta ao fogo");
    if (/\b(interditad[ao]s?|bloquead[ao]s?|evacuacao|evacuad[ao]s?|suspensao de voos|voos suspensos|vitimas?|feridos?|mortos?|desabrigados)\b/.test(t))
        tags.push("Impacto explícito no título");
    let topic = isFireText(title) ? "Incêndio / ocorrência" : "Monitoramento / contexto";
    if (/\b(prevencao|preventiv\w*|conscientiz\w*|campanha|capacit\w*|inscri\w*|processo seletivo|contratacao|orienta\w*|selecion\w*|recrut\w*|vagas?)\b/.test(t))
        topic = "Prevenção / preparação";
    else if (/\b(previsao|risco|estiagem|seca|el nino|monitoramento|focos de calor|balanco|reduz\w*|queda|aument\w*|registra)\b/.test(t) && !/\b(atinge|destroi|queima|chamas|pegou fogo|pega fogo)\b/.test(t))
        topic = "Monitoramento / contexto";
    else if (/\b(qualidade do ar|fumaca|insalubre|poluicao)\b/.test(t) && !/\b(incendio|chamas|queimada)\b/.test(t))
        topic = "Fumaça / qualidade do ar";
    if (!places.length && topic === "Incêndio / ocorrência")
        topic = "Monitoramento / contexto";
    return { places, regions: [...new Set(regions)], tags, topic };
}
function cleanTitle(title, source) {
    let text = title.replace(/\s+/g, " ").trim();
    const split = text.lastIndexOf(" - ");
    if (split >= 0) {
        const tail = fold(text.slice(split + 3)), name = fold(source.name);
        if (tail && (name.includes(tail) || tail.includes(name) || (source.id === "g1" && tail === "g1") || tail === "www gov br" || tail === "governo federal"))
            text = text.slice(0, split);
    }
    return text.slice(0, 240);
}
function priority(item, axis, now) {
    let score = 0;
    const reasons = [];
    const local = radar_sources_1.RADAR_LOCALITIES.filter(p => item.places.includes(p.id));
    const exact = axis !== "all" && local.some(p => p.axis === axis || p.id === axis);
    if (exact) {
        score += 35;
        reasons.push("Menciona o local selecionado");
    }
    else if (local.length) {
        score += 20;
        reasons.push("Menciona município ou distrito monitorado");
    }
    else {
        score += item.regions.includes("Tapajós / oeste do Pará") ? 12 : 6;
        reasons.push("Contexto regional, sem local exato");
    }
    const age = (now - item.publishedAt) / 3600;
    if (age <= 24) {
        score += 20;
        reasons.push("Publicado nas últimas 24 h");
    }
    else if (age <= 72) {
        score += 12;
        reasons.push("Publicado nas últimas 72 h");
    }
    else if (age <= 168)
        score += 6;
    score += item.topic === "Incêndio / ocorrência" ? 15 : item.topic === "Fumaça / qualidade do ar" ? 12 : 5;
    if (item.tags.includes("Impacto explícito no título")) {
        score += 20;
        reasons.push("Título menciona consequência ou restrição");
    }
    else if (item.tags.includes("Transporte / acesso") || item.tags.includes("Saúde / fumaça") || item.tags.includes("Comunidades")) {
        score += 8;
        reasons.push("Menciona acesso, saúde ou comunidades");
    }
    const source = radar_sources_1.RADAR_SOURCES.find(s => s.id === item.sourceId);
    if (source?.category === "official") {
        score += 10;
        reasons.push("Publicação de canal oficial");
    }
    else
        score += source?.category === "local" ? 5 : 3;
    score = Math.min(100, score);
    return { score, label: score >= 75 ? "Alta" : score >= 50 ? "Média" : "Contexto", reasons, exact };
}
function tokens(title) { const stop = new Set("de da do das dos em no na nos nas para por com um uma e o a os as ao apos video veja fotos assista pa".split(" ")); return new Set(fold(title).split(" ").filter(x => x.length > 2 && !stop.has(x))); }
function groupArticles(items, axis, now) {
    const sorted = [...items].sort((a, b) => priority(b, axis, now).score - priority(a, axis, now).score || b.publishedAt - a.publishedAt);
    const groups = [];
    for (const item of sorted) {
        const set = tokens(item.title);
        const group = groups.find(g => {
            if (Math.abs(g.lead.publishedAt - item.publishedAt) > 72 * 3600)
                return false;
            if (fold(g.lead.title) === fold(item.title))
                return true;
            if (!item.places.some(p => g.lead.places.includes(p)) || set.size < 6)
                return false;
            const other = tokens(g.lead.title);
            if (other.size < 6)
                return false;
            const intersection = [...set].filter(t => other.has(t)).length;
            return intersection / (set.size + other.size - intersection) >= .76;
        });
        if (group) {
            group.members.push(item);
            group.publishers = new Set(group.members.map(m => m.sourceId)).size;
        }
        else {
            const ranked = priority(item, axis, now);
            groups.push({ id: item.id, lead: item, members: [item], publishers: 1, ...ranked });
        }
    }
    return groups;
}
function canonicalUrl(raw) {
    try {
        const url = new URL(raw);
        if (url.protocol !== "https:" && url.protocol !== "http:")
            return null;
        if (url.username || url.password)
            return null;
        for (const key of [...url.searchParams.keys()])
            if (/^(utm_|fbclid|gclid|trk)/.test(key))
                url.searchParams.delete(key);
        url.hash = "";
        return url.toString();
    }
    catch {
        return null;
    }
}
function acceptsPublisher(entry, source, mode) {
    try {
        const wanted = source.domain.split("/")[0], raw = mode === "index" ? entry.sourceUrl : entry.url;
        if (!raw)
            return false;
        const url = new URL(raw), host = url.hostname.replace(/^www\./, "");
        return host === wanted || host.endsWith("." + wanted);
    }
    catch {
        return false;
    }
}

},
"./radar-collector": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectSource = collectSource;
exports.collectAllSources = collectAllSources;
const radar_sources_1 = require("./radar-sources");
const radar_core_1 = require("./radar-core");
const source_http_1 = require("./source-http");
async function hash(value) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join(""); }
async function collectSource(source, now, fetcher = fetch, cooldowns = new Map()) {
    const feeds = [...new Set([...(source.feeds ?? []).slice(0, 1), new URL("/feed/", source.url).href])];
    const targets = [...feeds.map(url => ({ url, mode: "rss" })), { url: (0, radar_sources_1.sourceIndexUrl)(source), mode: "index" }];
    const items = new Map();
    const errors = [], methods = [];
    let directOk = false, indexOk = false, indexEntries = 0, found = 0, undated = 0;
    for (const target of targets) {
        if (target.mode === "rss" && directOk)
            continue;
        try {
            const content = await (0, source_http_1.sourceText)(target.url, { fetcher, cooldowns, attempts: 1, timeoutMs: 6500, maxBytes: 2_000_000 });
            const entries = (0, radar_core_1.parseFeed)(content);
            if (target.mode === "rss" && entries.length && !entries.some(entry => (0, radar_core_1.acceptsPublisher)(entry, source, "rss")))
                throw new Error("RSS sem links identificáveis da fonte esperada.");
            if (target.mode === "rss")
                directOk = true;
            else {
                indexOk = true;
                indexEntries = entries.length;
            }
            methods.push(target.mode);
            found += entries.length;
            for (const entry of entries) {
                if (!(0, radar_core_1.acceptsPublisher)(entry, source, target.mode))
                    continue;
                const publishedAt = Math.floor(Date.parse(entry.date) / 1000);
                if (!Number.isFinite(publishedAt) || publishedAt > now + 300) {
                    undated++;
                    continue;
                }
                if (publishedAt < now - 30 * 86400)
                    continue;
                const title = (0, radar_core_1.cleanTitle)(entry.title, source), classified = (0, radar_core_1.classifyText)(title, target.mode === "rss" ? entry.text : "");
                const url = (0, radar_core_1.canonicalUrl)(entry.url);
                if (!classified || !url || title.length < 14)
                    continue;
                const id = await hash(source.id + "|" + (0, radar_core_1.fold)(title) + "|" + new Date(publishedAt * 1000).toISOString().slice(0, 10));
                const creditMatch = entry.text.match(/\bfonte\s*:\s*([^.;|\n]{4,90})/i)?.[1];
                const credit = creditMatch ? radar_sources_1.RADAR_SOURCES.find(s => s.id !== source.id && (0, radar_core_1.fold)(creditMatch).includes((0, radar_core_1.fold)(s.name)))?.name ?? null : null;
                const candidate = { id, sourceId: source.id, title, url, publishedAt, firstSeen: now, lastSeen: now, mode: target.mode, ...classified, credit };
                const prior = items.get(id);
                if (!prior || target.mode === "rss")
                    items.set(id, candidate);
            }
        }
        catch (error) {
            errors.push((target.mode === "rss" ? "RSS direto" : "Índice") + ": " + (0, source_http_1.sourceErrorKind)(error) + (error instanceof Error && /HTTP \d{3}/.test(error.message) ? " (" + error.message.match(/HTTP \d{3}/)[0] + ")" : ""));
        }
    }
    const status = directOk ? "ok" : indexOk && indexEntries > 0 ? "indexed" : indexOk ? "empty" : "unavailable";
    let detail = directOk ? "RSS direto consultado; complementado pelo índice quando disponível." : indexOk ? indexEntries > 0 ? "Coleta pelo RSS do Google Notícias segmentado por domínio; a indexação pode ser incompleta." : "Índice acessível, sem itens encontrados. Isso não confirma ausência de notícias nem cobertura completa da fonte." : "Não foi possível consultar o RSS ou o índice nesta execução.";
    if (errors.length)
        detail += " " + errors.join(" ").slice(0, 150);
    if (undated)
        detail += ` ${undated} item(ns) ignorados por data ausente ou futura.`;
    return { items: [...items.values()], check: { sourceId: source.id, status, checkedAt: now, lastOkAt: directOk || (indexOk && indexEntries > 0) ? now : null, found, accepted: items.size, detail, methods } };
}
async function collectAllSources(now, fetcher = fetch) {
    const cooldowns = new Map();
    const results = [];
    for (let start = 0; start < radar_sources_1.RADAR_SOURCES.length; start += 5) {
        const batch = await Promise.allSettled(radar_sources_1.RADAR_SOURCES.slice(start, start + 5).map(source => collectSource(source, now, fetcher, cooldowns)));
        for (let i = 0; i < batch.length; i++) {
            const result = batch[i];
            if (result.status === "fulfilled")
                results.push(result.value);
            else
                results.push({ items: [], check: { sourceId: radar_sources_1.RADAR_SOURCES[start + i].id, status: "unavailable", checkedAt: now, lastOkAt: null, found: 0, accepted: 0, detail: "Falha na execução do coletor desta fonte.", methods: [] } });
        }
    }
    return { items: results.flatMap(result => result.items), checks: results.map(result => result.check) };
}

},
"./environment": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TZ = exports.PLACES = void 0;
exports.distance = distance;
exports.bearing = bearing;
exports.upwind = upwind;
exports.compass = compass;
exports.display = display;
exports.stamp = stamp;
exports.aqBand = aqBand;
exports.nearestAir = nearestAir;
exports.filterFires = filterFires;
exports.parseCsv = parseCsv;
exports.fireRowTime = fireRowTime;
exports.parseFireRows = parseFireRows;
exports.deduplicateFires = deduplicateFires;
exports.filterSatellite = filterSatellite;
exports.PLACES = [
    { id: "itaituba", name: "Itaituba", lat: -4.2761, lon: -55.9836 },
    { id: "jacareacanga", name: "Jacareacanga", lat: -6.2222, lon: -57.7644 },
    { id: "novo-progresso", name: "Novo Progresso", lat: -7.1436, lon: -55.3783 },
    { id: "ruropolis", name: "Rurópolis", lat: -4.0967, lon: -54.9097 },
    { id: "placas", name: "Placas", lat: -3.8694, lon: -54.2172 },
    { id: "aveiro", name: "Aveiro", lat: -3.6094, lon: -55.3319 },
    { id: "trairao", name: "Trairão", lat: -4.5736, lon: -55.9422 },
    { id: "santarem", name: "Santarém", lat: -2.4385, lon: -54.6996 },
];
exports.TZ = "America/Santarem";
function distance(a, b) {
    const r = Math.PI / 180, dlat = (b.lat - a.lat) * r, dlon = (b.lon - a.lon) * r;
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
function bearing(a, b) {
    const r = Math.PI / 180, dl = (b.lon - a.lon) * r;
    return (Math.atan2(Math.sin(dl) * Math.cos(b.lat * r), Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos(dl)) / r + 360) % 360;
}
function upwind(place, fire, weather) {
    if (weather?.direction == null || weather.speed == null || weather.speed < 2)
        return false;
    return Math.abs(((bearing(place, fire) - weather.direction + 540) % 360) - 180) <= 30;
}
function compass(deg) { return ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round(deg / 45) % 8]; }
function display(value, digits = 1) { return value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits }); }
function stamp(time, full = false) {
    if (!time || !Number.isFinite(time))
        return "Sem horário";
    return new Intl.DateTimeFormat("pt-BR", { timeZone: exports.TZ, day: "2-digit", month: "2-digit", ...(full ? { year: "numeric" } : {}), hour: "2-digit", minute: "2-digit" }).format(new Date(time * 1000));
}
function aqBand(aqi) {
    if (aqi == null)
        return { label: "Sem índice", color: "#77817f", soft: "#f0f2f1" };
    if (aqi <= 50)
        return { label: "Boa", color: "#1e8062", soft: "#e9f5ee" };
    if (aqi <= 100)
        return { label: "Moderada", color: "#9b7315", soft: "#fff6db" };
    if (aqi <= 150)
        return { label: "Sensíveis: atenção", color: "#c36425", soft: "#fff0e5" };
    if (aqi <= 200)
        return { label: "Insalubre", color: "#c44242", soft: "#fceced" };
    if (aqi <= 300)
        return { label: "Muito insalubre", color: "#8750a6", soft: "#f3ecf8" };
    return { label: "Perigosa", color: "#80304b", soft: "#faeaf0" };
}
function nearestAir(points, at) { return points.reduce((best, p) => Math.abs(p.time - at) < Math.abs((best?.time ?? Infinity) - at) ? p : best, null); }
function filterFires(fires, place, radius, hours, now) { return fires.filter(f => f.time >= now - hours * 3600 && f.time <= now + 300 && distance(place, f) <= radius); }
function parseCsv(text) {
    const value = text.replace(/^\uFEFF/, "").trim();
    if (!value)
        return [];
    const sep = value.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < value.length; i++) {
        const c = value[i];
        if (c === '"') {
            if (quoted && value[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else
                quoted = !quoted;
        }
        else if (c === sep && !quoted) {
            row.push(cell.trim());
            cell = "";
        }
        else if ((c === "\n" || c === "\r") && !quoted) {
            if (c === "\r" && value[i + 1] === "\n")
                i++;
            row.push(cell.trim());
            if (row.some(s => s.length))
                rows.push(row);
            row = [];
            cell = "";
        }
        else
            cell += c;
    }
    if (quoted)
        throw new Error("CSV inválido: aspas sem fechamento.");
    row.push(cell.trim());
    if (row.some(s => s.length))
        rows.push(row);
    const fields = (rows.shift() ?? []).map(f => f.toLowerCase());
    if (new Set(fields).size !== fields.length || fields.some(f => !f || f === "__proto__" || f === "constructor"))
        throw new Error("Cabeçalho CSV inválido.");
    return rows.map(values => { if (values.length !== fields.length)
        throw new Error("Linha CSV incompleta."); return Object.fromEntries(fields.map((field, i) => [field, values[i]])); });
}
function fireRowTime(row) {
    let date = String(row.data_hora_gmt ?? row.datahora_gmt ?? row.datahora ?? row.data_hora ?? row.data ?? row.datetime ?? "").trim();
    if (row.acq_date) {
        const hhmm = String(row.acq_time ?? "0000").padStart(4, "0");
        date = row.acq_date + "T" + hhmm.slice(0, 2) + ":" + hhmm.slice(2) + ":00Z";
    }
    if (date && !/[zZ]$|[+-]\d\d:?\d\d$/.test(date))
        date = date.replace(" ", "T") + "Z";
    return Date.parse(date) / 1000;
}
function parseFireRows(rows, source) {
    const number = (v, max = Infinity) => { if (v == null || String(v).trim() === "")
        return null; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };
    const text = (v) => typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;
    const result = [];
    for (const row of rows) {
        if ((row.lat ?? row.latitude) === "" || (row.lon ?? row.longitude) === "")
            continue;
        const lat = Number(row.lat ?? row.latitude), lon = Number(row.lon ?? row.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -11 || lat > 1 || lon < -62 || lon > -50)
            continue;
        const time = fireRowTime(row);
        if (!Number.isFinite(time))
            continue;
        const satellite = String(row.satelite ?? row.satellite ?? row.instrument ?? "Não informado");
        const frp = number(row.frp);
        result.push({ id: [lat.toFixed(5), lon.toFixed(5), time, satellite].join("|"), lat, lon, time, satellite, frp, source,
            municipality: text(row.municipio), state: text(row.estado), biome: text(row.bioma),
            droughtDays: number(row.numero_dias_sem_chuva ?? row.diasemchuva), precipitation: number(row.precipitacao), risk: number(row.risco_fogo ?? row.riscofogo, 1),
        });
    }
    return result;
}
function deduplicateFires(fires) {
    const unique = new Map();
    for (const fire of fires) {
        const prior = unique.get(fire.id);
        if (!prior)
            unique.set(fire.id, { ...fire });
        else {
            const fields = ["frp", "municipality", "state", "biome", "droughtDays", "precipitation", "risk"];
            for (const key of fields)
                if (prior[key] == null && fire[key] != null)
                    prior[key] = fire[key];
        }
    }
    return [...unique.values()];
}
function filterSatellite(fires, satellite) { return satellite === "all" ? fires : fires.filter(f => f.satellite === satellite); }

},
"./environment-provider": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENVIRONMENT_REVISION = void 0;
exports.describeSourceError = describeSourceError;
exports.airRequestUrl = airRequestUrl;
exports.weatherRequestUrl = weatherRequestUrl;
exports.parseAirResponse = parseAirResponse;
exports.parseWeatherResponse = parseWeatherResponse;
exports.parseMunicipalResponse = parseMunicipalResponse;
exports.collectEnvironment = collectEnvironment;
exports.validateEnvironment = validateEnvironment;
const environment_1 = require("./environment");
const source_http_1 = require("./source-http");
exports.ENVIRONMENT_REVISION = "environment-v1";
function describeSourceError(error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.match(/HTTP\s+(\d{3})/)?.[1];
    if (status === "429")
        return "Limite temporário de consultas na fonte (HTTP 429).";
    if (status)
        return `A fonte recusou ou não concluiu a consulta (HTTP ${status}).`;
    if ((0, source_http_1.sourceErrorKind)(error) === "arquivo_excessivo")
        return "A fonte retornou um arquivo acima do limite permitido.";
    if (error instanceof Error && /Timeout|Abort/i.test(error.name))
        return "A fonte excedeu o tempo de resposta.";
    if ((0, source_http_1.sourceErrorKind)(error) === "resposta_invalida" || error instanceof SyntaxError || /ausente|inválid|incomplet|unidade/.test(message))
        return "A fonte retornou dados incompletos ou inválidos.";
    return "Falha de conexão com a fonte.";
}
function airRequestUrl(places = environment_1.PLACES) {
    return "https://air-quality-api.open-meteo.com/v1/air-quality?" + new URLSearchParams({ latitude: places.map(p => p.lat).join(","), longitude: places.map(p => p.lon).join(","), hourly: "pm2_5,pm10,us_aqi", domains: "cams_global", past_days: "1", forecast_days: "3", timeformat: "unixtime", timezone: "GMT" });
}
function weatherRequestUrl(places = environment_1.PLACES) {
    return "https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({ latitude: places.map(p => p.lat).join(","), longitude: places.map(p => p.lon).join(","), current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m", wind_speed_unit: "kmh", temperature_unit: "celsius", precipitation_unit: "mm", timeformat: "unixtime", timezone: "GMT", forecast_days: "1" });
}
function responseRows(input, length) { const rows = Array.isArray(input) ? input : [input]; if (rows.length !== length || rows.some(r => !r || typeof r !== "object"))
    throw new Error("Resposta incompleta."); return rows; }
const finite = (v, min, max) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
function parseAirResponse(input, places = environment_1.PLACES) {
    return responseRows(input, places.length).map((row, index) => {
        const h = row.hourly;
        if (row.error || !h || !Array.isArray(h.time) || h.time.length < 24 || h.time.length > 800 || !Array.isArray(h.pm2_5) || h.pm2_5.length !== h.time.length || !h.time.every((t, i) => typeof t === "number" && Number.isInteger(t) && (!i || t > h.time[i - 1])))
            throw new Error("Série de ar inválida.");
        if (row.hourly_units?.pm2_5 !== "μg/m³" && row.hourly_units?.pm2_5 !== "µg/m³")
            throw new Error("Unidade de partículas inválida.");
        const points = h.time.map((time, i) => ({ time, pm25: finite(h.pm2_5[i], 0, 10000), pm10: finite(h.pm10?.[i], 0, 20000), aqi: finite(h.us_aqi?.[i], 0, 5000) }));
        if (!points.some((p) => p.pm25 != null))
            throw new Error("Série de PM2,5 ausente.");
        return { placeId: places[index].id, points };
    });
}
function parseWeatherResponse(input, places = environment_1.PLACES) {
    return responseRows(input, places.length).map((row, index) => {
        const c = row.current;
        if (row.error || !c || !Number.isInteger(c.time) || row.current_units?.wind_speed_10m !== "km/h" || row.current_units?.temperature_2m !== "°C")
            throw new Error("Condição meteorológica ou unidade inválida.");
        const value = { time: c.time, temperature: finite(c.temperature_2m, -80, 70), humidity: finite(c.relative_humidity_2m, 0, 100), speed: finite(c.wind_speed_10m, 0, 500), direction: finite(c.wind_direction_10m, 0, 360), rain: finite(c.precipitation, 0, 1000) };
        if (value.speed == null || value.direction == null)
            throw new Error("Vento ausente.");
        return { placeId: places[index].id, value };
    });
}
function parseMunicipalResponse(input, kind, collectedAt, places = environment_1.PLACES) {
    const rows = Array.isArray(input) ? input : [input], failures = {};
    if (rows.length !== places.length)
        throw new Error("Resposta municipal incompleta; ordem dos municípios não confirmada.");
    const air = [], weather = [];
    for (let i = 0; i < places.length; i++) {
        const place = places[i];
        try {
            if (kind === "air") {
                const location = parseAirResponse(rows[i], [place])[0], current = (0, environment_1.nearestAir)(location.points, collectedAt);
                if (!current || current.pm25 == null || Math.abs(current.time - collectedAt) > 7200)
                    throw new Error("Série sem referência atual.");
                air.push(location);
            }
            else {
                const location = parseWeatherResponse(rows[i], [place])[0];
                if (location.value.time < collectedAt - 7200 || location.value.time > collectedAt + 300)
                    throw new Error("Horário meteorológico inválido.");
                weather.push(location);
            }
        }
        catch (error) {
            failures[place.id] = describeSourceError(error);
        }
    }
    return { air, weather, failures };
}
async function collectEnvironment(collectedAt, fetcher = fetch) {
    const results = await Promise.allSettled(["air", "weather"].map(async (kind) => parseMunicipalResponse(await (0, source_http_1.sourceJson)(kind === "air" ? airRequestUrl() : weatherRequestUrl(), { fetcher, maxBytes: 2_000_000 }), kind, collectedAt)));
    const packet = { revision: exports.ENVIRONMENT_REVISION, collectedAt, air: null, weather: null, failures: {}, municipalityFailures: {} };
    for (const [i, kind] of ["air", "weather"].entries()) {
        const result = results[i];
        if (result.status === "rejected") {
            packet.failures[kind] = describeSourceError(result.reason);
            continue;
        }
        if (kind === "air")
            packet.air = result.value.air.length ? result.value.air : null;
        else
            packet.weather = result.value.weather.length ? result.value.weather : null;
        if (Object.keys(result.value.failures).length) {
            packet.municipalityFailures[kind] = result.value.failures;
            packet.failures[kind] = `${Object.keys(result.value.failures).length}/8 municípios sem leitura válida; os demais foram preservados.`;
        }
    }
    return packet;
}
function validateEnvironment(input, now) {
    if (!input || typeof input !== "object")
        throw new Error("Coleta inválida.");
    const v = input;
    if (v.revision !== exports.ENVIRONMENT_REVISION || !Number.isInteger(v.collectedAt) || v.collectedAt < now - 7200 || v.collectedAt > now + 300)
        throw new Error("Horário da coleta inválido.");
    const municipalityFailures = {};
    for (const kind of ["air", "weather"]) {
        const map = v.municipalityFailures?.[kind];
        if (!map)
            continue;
        if (typeof map !== "object" || Array.isArray(map) || Object.keys(map).some(id => !environment_1.PLACES.some(p => p.id === id) || typeof map[id] !== "string" || !map[id].trim()))
            throw new Error("Falhas municipais inválidas.");
        municipalityFailures[kind] = Object.fromEntries(Object.entries(map).map(([id, detail]) => [id, String(detail).slice(0, 220)]));
    }
    const knownPlaces = (rows, kind) => Array.isArray(rows) && rows.length > 0 && rows.length <= environment_1.PLACES.length && new Set(rows.map(r => r?.placeId)).size === rows.length && rows.every(r => environment_1.PLACES.some(p => p.id === r?.placeId)) && environment_1.PLACES.every(p => rows.some(r => r.placeId === p.id) !== !!municipalityFailures[kind]?.[p.id]);
    const safeNumber = (n, min, max) => n === null || finite(n, min, max) !== null;
    let air = null, weather = null;
    if (v.air !== null) {
        if (!knownPlaces(v.air, "air"))
            throw new Error("Locais de ar inválidos.");
        air = v.air.map((row) => {
            if (!Array.isArray(row.points) || row.points.length < 24 || row.points.length > 240)
                throw new Error("Série inválida.");
            let previous = 0;
            const points = row.points.map((p) => {
                if (!p || !Number.isInteger(p.time) || p.time <= previous || p.time < v.collectedAt - 3 * 86400 || p.time > v.collectedAt + 7 * 86400 || !safeNumber(p.pm25, 0, 10000) || !safeNumber(p.pm10, 0, 20000) || !safeNumber(p.aqi, 0, 5000))
                    throw new Error("Ponto inválido.");
                previous = p.time;
                return { time: p.time, pm25: p.pm25, pm10: p.pm10, aqi: p.aqi };
            });
            const current = (0, environment_1.nearestAir)(points, v.collectedAt);
            if (!current || current.pm25 == null || Math.abs(current.time - v.collectedAt) > 7200)
                throw new Error("Série sem referência atual.");
            return { placeId: row.placeId, points };
        });
    }
    if (v.weather !== null) {
        if (!knownPlaces(v.weather, "weather"))
            throw new Error("Locais meteorológicos inválidos.");
        weather = v.weather.map((row) => {
            const p = row.value;
            if (!p || !Number.isInteger(p.time) || p.time < v.collectedAt - 7200 || p.time > v.collectedAt + 300 || !safeNumber(p.temperature, -80, 70) || !safeNumber(p.humidity, 0, 100) || finite(p.speed, 0, 500) === null || finite(p.direction, 0, 360) === null || !safeNumber(p.rain, 0, 1000))
                throw new Error("Meteorologia inválida.");
            return { placeId: row.placeId, value: { time: p.time, temperature: p.temperature, humidity: p.humidity, speed: p.speed, direction: p.direction, rain: p.rain } };
        });
    }
    const failures = {};
    for (const kind of ["air", "weather"])
        if (typeof v.failures?.[kind] === "string" && v.failures[kind].trim())
            failures[kind] = v.failures[kind].slice(0, 220);
    if (!air && !weather && !failures.air && !failures.weather)
        throw new Error("Nenhuma fonte ambiental respondeu.");
    return { revision: exports.ENVIRONMENT_REVISION, collectedAt: v.collectedAt, air, weather, failures, ...(Object.keys(municipalityFailures).length ? { municipalityFailures } : {}) };
}

},
"./monitoring": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOURCE_CATALOG = exports.RADII = exports.HISTORY_REVISION = void 0;
exports.localDay = localDay;
exports.utcDay = utcDay;
exports.dayStart = dayStart;
exports.calendarDays = calendarDays;
exports.validDay = validDay;
const radar_sources_1 = require("./radar-sources");
exports.HISTORY_REVISION = "regional-history-v1";
exports.RADII = [25, 50, 100, 200];
exports.SOURCE_CATALOG = [
    { id: "inpe", name: "INPE · arquivos diários", family: "environment", url: "https://data.inpe.br/queimadas/portal/", automatic: true },
    { id: "air", name: "CAMS / Open-Meteo · ar", family: "environment", url: "https://open-meteo.com/en/docs/air-quality-api", automatic: true },
    { id: "weather", name: "Open-Meteo · meteorologia", family: "environment", url: "https://open-meteo.com/en/docs", automatic: true },
    ...radar_sources_1.RADAR_SOURCES.map(s => ({ id: "radar:" + s.id, name: s.name, family: "news", url: s.url, automatic: true })),
    { id: "selva", name: "SELVA", family: "external", url: "https://www.appselva.com.br/", automatic: false },
    { id: "windy", name: "Windy", family: "external", url: "https://www.windy.com/", automatic: false },
    { id: "accuweather", name: "AccuWeather", family: "external", url: "https://www.accuweather.com/", automatic: false },
    { id: "climaeradar", name: "Clima & Radar", family: "external", url: "https://www.climaeradar.com.br/", automatic: false },
];
function localDay(time) { return new Date((time - 10800) * 1000).toISOString().slice(0, 10); }
function utcDay(time) { return new Date(time * 1000).toISOString().slice(0, 10); }
function dayStart(day) { return Date.parse(day + "T00:00:00-03:00") / 1000; }
function calendarDays(now, days) { const start = dayStart(localDay(now)); return Array.from({ length: days }, (_, i) => localDay(start - (days - 1 - i) * 86400)); }
function validDay(day) { if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day))
    return false; const time = Date.parse(day + "T00:00:00Z") / 1000; return Number.isFinite(time) && utcDay(time) === day; }

},
"./history-collector": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INPE_DAILY = void 0;
exports.summarizeFireDay = summarizeFireDay;
exports.collectFireDay = collectFireDay;
exports.collectAirArchive = collectAirArchive;
const environment_1 = require("./environment");
const source_http_1 = require("./source-http");
const fire_collector_1 = require("./fire-collector");
const environment_provider_1 = require("./environment-provider");
const monitoring_1 = require("./monitoring");
exports.INPE_DAILY = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/";
function summarizeFireDay(fires, dayUtc, collectedAt) {
    const start = Date.parse(dayUtc + "T00:00:00Z") / 1000;
    const unique = (0, environment_1.deduplicateFires)(fires.filter(f => f.time >= start && f.time < start + 86400 && f.time <= collectedAt + 300));
    const days = [(0, monitoring_1.localDay)(start), (0, monitoring_1.localDay)(start + 12 * 3600)];
    const parts = days.flatMap(day => environment_1.PLACES.flatMap(place => monitoring_1.RADII.map(radius => {
        const counts = { all: 0 };
        for (const f of unique)
            if ((0, monitoring_1.localDay)(f.time) === day && (0, environment_1.distance)(place, f) <= radius) {
                counts.all++;
                counts[f.satellite] = (counts[f.satellite] ?? 0) + 1;
            }
        return { day, placeId: place.id, radius, counts };
    })));
    return { revision: monitoring_1.HISTORY_REVISION, kind: "fire-day", collectedAt, dayUtc, closed: dayUtc < (0, monitoring_1.utcDay)(collectedAt), last: unique.length ? Math.max(...unique.map(f => f.time)) : null, parts };
}
async function collectFireDay(dayUtc, collectedAt, fetcher = fetch) {
    const parsed = (0, fire_collector_1.parseInpeCsv)(await (0, source_http_1.sourceText)(exports.INPE_DAILY + "focos_diario_br_" + dayUtc.replaceAll("-", "") + ".csv", { fetcher, timeoutMs: 25000, maxBytes: 20 * 1024 * 1024 }), collectedAt);
    if (parsed.rejected)
        throw new Error("CSV diário contém registros inválidos; histórico anterior preservado: " + dayUtc);
    return summarizeFireDay(parsed.fires, dayUtc, collectedAt);
}
async function collectAirArchive(collectedAt, fetcher = fetch) {
    const url = new URL((0, environment_provider_1.airRequestUrl)());
    url.searchParams.set("past_days", "31");
    url.searchParams.set("forecast_days", "1");
    const locations = (0, environment_provider_1.parseAirResponse)(await (0, source_http_1.sourceJson)(url.toString(), { fetcher, timeoutMs: 45000, maxBytes: 2_000_000 })).map(l => ({ ...l, points: l.points.filter(p => p.time <= collectedAt && p.time >= collectedAt - 32 * 86400) }));
    return { revision: monitoring_1.HISTORY_REVISION, kind: "air", collectedAt, locations };
}

},
"./source-http": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceFailure = void 0;
exports.sourceErrorKind = sourceErrorKind;
exports.sourceText = sourceText;
exports.sourceJson = sourceJson;
const defaults = new Map();
class SourceFailure extends Error {
    code;
    retryAfter;
    constructor(code, message, retryAfter = null) {
        super(message);
        this.code = code;
        this.retryAfter = retryAfter;
        this.name = "SourceFailure";
    }
}
exports.SourceFailure = SourceFailure;
function sourceErrorKind(error) {
    const e = error;
    if (e?.code === 429)
        return "limite_de_requisicoes";
    if (e?.code === 401 || e?.code === 403)
        return "acesso_negado";
    if (e?.code === 404)
        return "endereco_invalido";
    if (e?.code === "OVERSIZE")
        return "arquivo_excessivo";
    if (typeof e?.code === "number" && e.code >= 500)
        return "erro_servidor";
    if (/Timeout|Abort/.test(e?.name ?? ""))
        return "tempo_esgotado";
    if (["API_INVALID", "CSV_INVALID", "XML_INVALID"].includes(String(e?.code)) || error instanceof SyntaxError)
        return "resposta_invalida";
    return "falha_de_rede_ou_formato";
}
function retrySeconds(value, now) {
    if (!value)
        return null;
    const seconds = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - now) / 1000;
    return Number.isFinite(seconds) && seconds >= 0 ? Math.min(86400, Math.ceil(seconds)) : null;
}
async function sourceText(url, options = {}) {
    const { fetcher = fetch, timeoutMs = 8500, maxBytes = 2_500_000, attempts = 2, method = "GET", accept = "application/json,text/csv,application/rss+xml,application/atom+xml,application/xml,text/xml,text/html;q=0.7", now = Date.now, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = options;
    const cooldowns = options.cooldowns ?? (fetcher === globalThis.fetch ? defaults : new Map()), host = new URL(url).origin;
    const held = cooldowns.get(host);
    if (held && held.until > now())
        throw new SourceFailure(held.status, `HTTP ${held.status} · fonte em intervalo de espera.`, Math.ceil((held.until - now()) / 1000));
    if (cooldowns.size > 40)
        for (const [key, entry] of cooldowns)
            if (entry.until <= now())
                cooldowns.delete(key);
    const tries = Math.max(1, Math.min(2, attempts));
    for (let attempt = 0; attempt < tries; attempt++) {
        try {
            const response = await fetcher(url, { method, signal: AbortSignal.timeout(timeoutMs), headers: { Accept: accept, "User-Agent": "SentinelaTapajos/2.3 environmental-collector" } });
            if (!response.ok) {
                const retry = retrySeconds(response.headers?.get("retry-after") ?? null, now());
                await response.body?.cancel().catch(() => { });
                if (response.status === 429 || (response.status === 503 && retry != null))
                    cooldowns.set(host, { until: now() + (retry ?? 60) * 1000, status: response.status });
                throw new SourceFailure(response.status, "HTTP " + response.status, retry);
            }
            if (Number(response.headers?.get("content-length") ?? 0) > maxBytes) {
                await response.body?.cancel().catch(() => { });
                throw new SourceFailure("OVERSIZE", "Arquivo excede o limite de tamanho.");
            }
            if (!response.body?.getReader) {
                const text = await response.text();
                if (new TextEncoder().encode(text).byteLength > maxBytes)
                    throw new SourceFailure("OVERSIZE", "Arquivo excede o limite de tamanho.");
                return text;
            }
            const reader = response.body.getReader(), decoder = new TextDecoder();
            let bytes = 0, text = "";
            try {
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    bytes += value.byteLength;
                    if (bytes > maxBytes)
                        throw new SourceFailure("OVERSIZE", "Arquivo excede o limite de tamanho.");
                    text += decoder.decode(value, { stream: true });
                }
                return text + decoder.decode();
            }
            catch (error) {
                await reader.cancel().catch(() => { });
                throw error;
            }
            finally {
                reader.releaseLock();
            }
        }
        catch (error) {
            const e = error;
            if (e.code === "OVERSIZE" || (typeof e.code === "number" && e.code >= 400 && e.code < 500) || e.retryAfter != null || attempt + 1 >= tries || method !== "GET")
                throw error;
            await wait(400 * (attempt + 1));
        }
    }
    throw new SourceFailure("NETWORK", "Fonte indisponível.");
}
async function sourceJson(url, options = {}) {
    const text = await sourceText(url, { ...options, accept: "application/json" });
    try {
        return JSON.parse(text);
    }
    catch {
        throw new SourceFailure("API_INVALID", "Resposta JSON inválida.");
    }
}

},
"./fire-collector": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInpeCsv = parseInpeCsv;
exports.collectFires = collectFires;
exports.mergeFireCollections = mergeFireCollections;
exports.previousFires = previousFires;
const environment_1 = require("./environment");
const source_http_1 = require("./source-http");
const BASE = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/";
function parseInpeCsv(text, now) {
    const h = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0].toLowerCase().replaceAll('"', "").split(/[,;]/).map(s => s.trim());
    if (!h.some(k => ["lat", "latitude"].includes(k)) || !h.some(k => ["lon", "longitude"].includes(k)) || !h.some(k => ["data_hora_gmt", "datahora_gmt", "datahora", "data_hora", "data", "datetime", "acq_date"].includes(k)) || !h.some(k => ["satelite", "satellite", "instrument"].includes(k)))
        throw new source_http_1.SourceFailure("CSV_INVALID", "Colunas obrigatórias do INPE ausentes.");
    let rows;
    try {
        rows = (0, environment_1.parseCsv)(text);
    }
    catch {
        throw new source_http_1.SourceFailure("CSV_INVALID", "Estrutura CSV do INPE inválida.");
    }
    const valid = [];
    let last = 0, rejected = 0;
    for (const row of rows) {
        const lat = row.lat ?? row.latitude, lon = row.lon ?? row.longitude, time = (0, environment_1.fireRowTime)(row), satellite = row.satelite ?? row.satellite ?? row.instrument;
        if (!lat?.trim() || !lon?.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180 || !Number.isFinite(time) || time > now || !satellite?.trim()) {
            rejected++;
            continue;
        }
        last = Math.max(last, time);
        valid.push(row);
    }
    return { fires: (0, environment_1.parseFireRows)(valid, "INPE"), last, rejected };
}
async function collectFires(now, fetcher = fetch) {
    const day = (time) => new Date(time * 1000).toISOString().slice(0, 10).replaceAll("-", ""), days = [day(now - 86400), day(now)];
    const failures = [], fail = (file, e) => failures.push({ file, kind: (0, source_http_1.sourceErrorKind)(e), detail: e instanceof Error ? e.message.slice(0, 100) : "Falha na consulta." });
    const read = async (path, timeoutMs = 12000) => parseInpeCsv(await (0, source_http_1.sourceText)(BASE + path, { fetcher, timeoutMs, maxBytes: 20 * 1024 * 1024 }), now);
    const daily = await Promise.allSettled(days.map(async (date) => ({ ...await read("diario/Brasil/focos_diario_br_" + date + ".csv"), day: date })));
    for (const [i, result] of daily.entries())
        if (result.status === "rejected")
            fail("focos_diario_br_" + days[i] + ".csv", result.reason);
    const recent = [];
    try {
        const html = await (0, source_http_1.sourceText)(BASE + "10min/", { fetcher, timeoutMs: 4500, maxBytes: 1_000_000, attempts: 1 });
        const files = [...new Set(Array.from(html.matchAll(/href=["'](focos_10min_\d{8}_\d{4}\.csv)["']/g), m => m[1]))].sort().slice(-6);
        const snapshots = await Promise.allSettled(files.map(file => read("10min/" + file, 8000)));
        for (const [i, result] of snapshots.entries())
            if (result.status === "fulfilled")
                recent.push({ ...result.value, file: files[i] });
            else
                fail(files[i], result.reason);
    }
    catch (error) {
        fail("10min/", error);
    }
    const good = daily.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
    for (const v of good)
        if (v.rejected)
            failures.push({ file: "focos_diario_br_" + v.day + ".csv", kind: "resposta_invalida", detail: `${v.rejected} registros com coordenadas, horário ou satélite inválidos.` });
    if (!good.length)
        throw Object.assign(new source_http_1.SourceFailure("INPE_UNAVAILABLE", "Nenhum CSV diário válido do INPE. " + failures.map(f => f.file + ": " + f.kind + " " + f.detail).join("; ").slice(0, 400)), { files: failures });
    const files = [...good, ...recent], fires = (0, environment_1.deduplicateFires)(files.flatMap(v => v.fires).filter(f => f.time >= now - 86400 && f.time <= now)).sort((a, b) => b.time - a.time);
    const last = Math.max(0, ...files.map(v => v.last)), current = good.find(d => d.day === days[1]);
    const complete = good.length === 2 && !!current?.last && now - current.last <= 3600 && now - last <= 7200 && files.every(v => !v.rejected);
    return { fires, last, checkedAt: now, coverage: { start: now - 86400, end: last, complete }, failures, dailyComplete: good.length === 2 && good.every(v => !v.rejected), files: [...good.map(v => ({ file: "focos_diario_br_" + v.day + ".csv", rows: v.fires.length, last: v.last, rejected: v.rejected })), ...recent.map(v => ({ file: v.file, rows: v.fires.length, last: v.last, rejected: v.rejected }))], detail: complete ? "CSV diários e atualizações de 10 min; sujeito ao atraso dos satélites." : "Cobertura parcial: arquivos ausentes, inválidos ou atrasados; podem faltar detecções recentes. Zero não confirma ausência de focos." };
}
// Port of mergeINPEOnPartial from V2.2 b000690. A complete collection replaces
// the old copy (including zero); a partial one preserves only valid 24h points.
function mergeFireCollections(prior, fresh, now) {
    if (!prior || (fresh.dailyComplete ?? fresh.coverage.complete))
        return { ...fresh, recovered: 0 };
    const valid = (f) => Number.isFinite(f.time) && f.time >= now - 86400 && f.time <= now && Number.isFinite(f.lat) && Math.abs(f.lat) <= 90 && Number.isFinite(f.lon) && Math.abs(f.lon) <= 180 && !!f.satellite;
    const items = new Map(fresh.fires.filter(valid).map(f => [f.id, f]));
    let recovered = 0;
    for (const point of prior.fires) {
        if (!valid(point))
            continue;
        const current = items.get(point.id);
        if (current)
            items.set(point.id, (0, environment_1.deduplicateFires)([current, point])[0]);
        else {
            items.set(point.id, point);
            recovered++;
        }
    }
    return { ...fresh, fires: [...items.values()].sort((a, b) => b.time - a.time), recovered, last: Math.max(fresh.last, ...[...items.values()].map(f => f.time)), detail: fresh.detail + (recovered ? ` ${recovered} detecções anteriores preservadas com seus horários originais.` : "") };
}
function previousFires(prior, now, error) {
    return { ...prior, fires: prior.fires.filter(f => f.time >= now - 86400 && f.time <= now), coverage: { start: now - 86400, end: prior.last, complete: false }, failures: error?.files ?? [], detail: "Consulta ao INPE falhou. Última leitura disponível, com o horário original; cobertura parcial. " + (error instanceof Error ? error.message.slice(0, 350) : "") };
}

},
"./fire-snapshot": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIRE_REVISION = void 0;
exports.validFire = validFire;
exports.collectFirePacket = collectFirePacket;
exports.validateFirePacket = validateFirePacket;
exports.mergeFireSnapshot = mergeFireSnapshot;
exports.fireDiagnostics = fireDiagnostics;
exports.fireDiagnosticText = fireDiagnosticText;
exports.fireView = fireView;
const environment_1 = require("./environment");
const fire_collector_1 = require("./fire-collector");
const source_http_1 = require("./source-http");
exports.FIRE_REVISION = "inpe-snapshot-v1";
function validFire(f, now) {
    return !!f && Number.isInteger(f.time) && f.time >= now - 86400 && f.time <= now && Number.isFinite(f.lat) && Math.abs(f.lat) <= 90 && Number.isFinite(f.lon) && Math.abs(f.lon) <= 180 && typeof f.satellite === "string" && f.satellite.trim().length > 0;
}
async function collectFirePacket(now, fetcher = fetch) {
    try {
        const collection = await (0, fire_collector_1.collectFires)(now, fetcher);
        return { revision: exports.FIRE_REVISION, attemptedAt: now, collection, failures: collection.failures ?? [], errorKind: null, message: null };
    }
    catch (error) {
        const failures = error?.files ?? [];
        return { revision: exports.FIRE_REVISION, attemptedAt: now, collection: null, failures, errorKind: failures[0]?.kind ?? (0, source_http_1.sourceErrorKind)(error), message: error instanceof Error ? error.message.slice(0, 800) : "Consulta INPE indisponível." };
    }
}
function validateFirePacket(input, now) {
    if (!input || typeof input !== "object")
        throw new Error("Pacote INPE inválido.");
    const v = input, text = (s, n) => typeof s === "string" && s.length <= n;
    if (v.revision !== exports.FIRE_REVISION || !Number.isInteger(v.attemptedAt) || v.attemptedAt < now - 7200 || v.attemptedAt > now + 300)
        throw new Error("Revisão ou horário INPE inválido.");
    const failures = (values) => {
        if (!Array.isArray(values) || values.length > 12)
            throw new Error("Falhas INPE inválidas.");
        return values.map(f => { if (!f || !text(f.file, 100) || !text(f.kind, 60) || !text(f.detail, 200))
            throw new Error("Diagnóstico INPE inválido."); return { file: f.file, kind: f.kind, detail: f.detail }; });
    };
    const errors = failures(v.failures);
    if (v.collection === null) {
        if (!text(v.errorKind, 60) || !text(v.message, 800))
            throw new Error("Causa INPE ausente.");
        return { revision: exports.FIRE_REVISION, attemptedAt: v.attemptedAt, collection: null, failures: errors, errorKind: v.errorKind, message: v.message };
    }
    const c = v.collection;
    if (!c || c.checkedAt !== v.attemptedAt || !Number.isInteger(c.last) || c.last < 0 || c.last > v.attemptedAt || !c.coverage || c.coverage.start !== v.attemptedAt - 86400 || c.coverage.end !== c.last || typeof c.coverage.complete !== "boolean" || typeof c.dailyComplete !== "boolean" || !text(c.detail, 1000) || !Array.isArray(c.fires) || c.fires.length > 30000)
        throw new Error("Snapshot INPE inválido.");
    if (!Array.isArray(c.files) || !c.files.length || c.files.length > 8)
        throw new Error("Arquivos INPE ausentes.");
    const dates = [0, 1].map(i => new Date((v.attemptedAt - i * 86400) * 1000).toISOString().slice(0, 10).replaceAll("-", ""));
    const fileNames = new Set();
    const files = c.files.map(f => {
        if (!f || !text(f.file, 100) || fileNames.has(f.file) || !(/^(focos_diario_br_\d{8}|focos_10min_\d{8}_\d{4})\.csv$/.test(f.file)) || !Number.isInteger(f.rows) || f.rows < 0 || f.rows > 1000000 || !Number.isInteger(f.last) || f.last < 0 || f.last > v.attemptedAt || !Number.isInteger(f.rejected) || f.rejected < 0)
            throw new Error("Arquivo INPE inválido.");
        fileNames.add(f.file);
        return { file: f.file, rows: f.rows, last: f.last, rejected: f.rejected };
    });
    const daily = files.filter(f => dates.some(d => f.file === "focos_diario_br_" + d + ".csv"));
    if (!daily.length || c.dailyComplete !== (daily.length === 2 && daily.every(f => f.rejected === 0)) || c.coverage.complete && (!c.dailyComplete || !c.last || v.attemptedAt - c.last > 7200))
        throw new Error("Cobertura INPE inconsistente.");
    const points = c.fires.map((f) => {
        if (!validFire(f, v.attemptedAt) || !text(f.satellite, 60) || f.id !== [f.lat.toFixed(5), f.lon.toFixed(5), f.time, f.satellite].join("|") || f.source !== "INPE")
            throw new Error("Detecção INPE inválida.");
        const point = { id: f.id, lat: f.lat, lon: f.lon, time: f.time, satellite: f.satellite, source: "INPE", frp: null };
        for (const key of ["frp", "droughtDays", "precipitation", "risk"]) {
            const value = f[key];
            if (value != null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || key === "risk" && value > 1))
                throw new Error("Atributo INPE inválido.");
            if (value !== undefined)
                point[key] = value;
        }
        for (const key of ["municipality", "state", "biome"]) {
            const value = f[key];
            if (value != null && !text(value, 150))
                throw new Error("Local INPE inválido.");
            if (value !== undefined)
                point[key] = value;
        }
        return point;
    });
    return { revision: exports.FIRE_REVISION, attemptedAt: v.attemptedAt, collection: { fires: (0, environment_1.deduplicateFires)(points).sort((a, b) => b.time - a.time), checkedAt: c.checkedAt, last: c.last, coverage: { ...c.coverage }, detail: c.detail, files, dailyComplete: c.dailyComplete, failures: errors, recovered: 0 }, failures: errors, errorKind: null, message: null };
}
function mergeFireSnapshot(prior, packet) {
    if (prior && prior.attemptedAt >= packet.attemptedAt)
        return prior;
    const collection = packet.collection ? (0, fire_collector_1.mergeFireCollections)(prior?.collection ?? null, packet.collection, packet.attemptedAt) : prior?.collection ? (0, fire_collector_1.previousFires)(prior.collection, packet.attemptedAt) : null;
    return { ...packet, collection };
}
function fireDiagnostics(state, now) {
    const c = state?.collection, points = c?.fires.filter(f => validFire(f, now)) ?? [], stale = !!c && (now - c.checkedAt > 7200 || c.checkedAt > now + 300), usingCache = !!c && !!state?.errorKind;
    const partial = !c?.coverage.complete || usingCache || stale, failures = state?.failures ?? [];
    const status = !c ? "unavailable" : usingCache || stale || partial ? "partial" : "ok";
    return { status, estado: !state ? "nao_consultado" : !c ? "sem_dados" : stale ? "defasado" : usingCache ? "cache_anterior" : partial ? "parcial" : "atual", checkedAt: state?.attemptedAt ?? null, observedAt: c?.last || null, stale, arquivos: c?.files ?? [], errosParciais: state?.errorKind ? [] : failures, falhasUltimaTentativa: failures, recuperadosCache: c?.recovered ?? 0, totalFocosEmCache: c ? points.length : null, ultimaAtualizacao: c?.checkedAt ?? null, ultimaTentativa: state?.attemptedAt ?? null, tipoErro: state?.errorKind ?? (failures.length ? failures[0].kind : null), mensagem: state?.message ?? (failures.length ? failures.map(f => f.file + ": " + f.detail).join("; ") : null), usandoCache: usingCache, parcial: partial, limiteInferior: partial, ultimoFoco: points.length ? points[0].time : null, janelaHoras: 24 };
}
function fireDiagnosticText(state, now) {
    const d = fireDiagnostics(state, now), iso = (n) => n === null ? "sem registro" : new Date(n * 1000).toISOString();
    return `INPE: ${d.estado}. Última atualização: ${iso(d.ultimaAtualizacao)}. Última tentativa: ${iso(d.ultimaTentativa)}. Focos em cache (24 h): ${d.totalFocosEmCache ?? "indisponível"}; recuperados: ${d.recuperadosCache}. ` +
        `Arquivos: ${d.arquivos.map(f => f.file + " (" + f.rows + " detecções regionais, " + f.rejected + " rejeitadas)").join(", ") || "nenhum"}. ` +
        (d.falhasUltimaTentativa.length ? "Falhas da última tentativa: " + d.falhasUltimaTentativa.map(f => f.file + ": " + f.kind + " · " + f.detail).join("; ") + ". " : "") +
        (d.mensagem ? "Causa: " + d.mensagem + ". " : "") + (d.limiteInferior ? "Cobertura parcial; a contagem é um limite inferior e zero não confirma ausência de focos." : "Arquivos diários recebidos; detecções sujeitas ao atraso dos satélites.");
}
function fireView(state, now) {
    if (!state.collection)
        return null;
    const d = fireDiagnostics(state, now);
    return { ...state.collection, fires: state.collection.fires.filter(f => validFire(f, now)), coverage: { ...state.collection.coverage, start: now - 86400, complete: !d.parcial }, failures: state.failures, detail: fireDiagnosticText(state, now) };
}

}};
const cache = {};
function require(name) { if (cache[name]) return cache[name].exports; const module = { exports: {} }; cache[name] = module; if (!definitions[name]) throw new Error("Unknown bundled module."); definitions[name](module, module.exports, require); return module.exports; }
const EXPECTED_ORIGIN = "https://sentinela-tapajos-ar.gyantardeli.chatgpt.site";
const REVISION = "radar-tapajos-v5";
async function main() {
  if (process.stdin.isTTY) { try { execFileSync("stty", ["-echo"], { stdio: ["inherit", "ignore", "ignore"] }); } catch { throw new Error("Cannot hide stdin; use a private pipe."); } }
  console.log("Ready for Site access JSON on stdin (input is hidden).");
  const readline = createInterface({ input: process.stdin, terminal: false });
  const input = await new Promise(resolve => readline.once("line", resolve)); readline.close(); process.stdin.pause();
  const access = JSON.parse(input);
  if (access.url?.replace(/\/$/, "") !== EXPECTED_ORIGIN || typeof access.token !== "string" || !access.token || (access.scope && !["environment", "history"].includes(access.scope)) || (access.historyDays && ![7,30].includes(access.historyDays))) throw new Error("Site access or collector scope is invalid.");
  const collectedAt = Math.floor(Date.now() / 1000), runId = crypto.randomUUID();
  const headers = { "OAI-Sites-Authorization": "Bearer " + access.token, "Content-Type": "application/json", Accept: "application/json" };
  async function siteJson(path, body) {
    const response = await fetch(EXPECTED_ORIGIN + path, { method: body ? "POST" : "GET", redirect: "error", headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(path + " returned HTTP " + response.status);
    return response.json();
  }
  async function refreshHistory() {
    const { HISTORY_REVISION, utcDay } = require("./monitoring");
    const { collectFireDay, collectAirArchive } = require("./history-collector");
    await siteJson("/api/history/ingest", { revision: HISTORY_REVISION, kind: "bootstrap", collectedAt });
    const before = await siteJson("/api/history/status"), errors = [], written = [], current = [];
    const dates = Array.from({ length: 31 }, (_, i) => utcDay(collectedAt - i * 86400));
    const present = new Set(before.fireDays.map(d => d.dayUtc));
    const wanted = access.historyDays ? dates.slice(0, access.historyDays + 1) : [...new Set([...dates.slice(0,3), ...dates.slice(3).filter(d => !present.has(d)).slice(0,2)])];
    for (let offset = 0; offset < wanted.length; offset += 3) {
      const results = await Promise.allSettled(wanted.slice(offset,offset+3).map(day => collectFireDay(day,collectedAt)));
      for (let i=0;i<results.length;i++) {
        const result=results[i], day=wanted[offset+i];
        if (result.status === "rejected") { errors.push({source:"inpe",day,error:result.reason instanceof Error ? result.reason.message : "Collection failed"}); continue; }
        const saved=await siteJson("/api/history/ingest",result.value);
        if (!saved.success || saved.dayUtc !== day || saved.parts !== 64) throw new Error("INPE daily writer did not confirm " + day);
        written.push(day); if (dates.slice(0,2).includes(day)) current.push(result.value);
        console.log(JSON.stringify({stage:"history_day_saved",dayUtc:day,closed:result.value.closed,parts:saved.parts}));
      }
    }
    // Detailed INPE health belongs to /api/fires/ingest. Archive failures must
    // not overwrite that attempt's diagnostics or replace its 24h snapshot.
    let archive=null;
    const needsAir=access.historyDays || before.air.length !== 8 || before.air.some(l=>l.first_at > collectedAt - 30*86400);
    if (needsAir) {
      try { archive=await collectAirArchive(collectedAt); }
      catch(error) { errors.push({source:"air-archive",error:error instanceof Error ? error.message : "Model archive failed"}); }
      if (archive) { const saved=await siteJson("/api/history/ingest",archive); if(!saved.success)throw new Error("Model archive writer failed."); console.log(JSON.stringify({stage:"model_archive_saved",places:archive.locations.length,samples:archive.locations.reduce((n,l)=>n+l.points.length,0)})); }
    }
    const after=await siteJson("/api/history/status");
    for (const day of written) if(!after.fireDays.some(d=>d.dayUtc === day && d.collectedAt >= collectedAt)) throw new Error("INPE archive readback failed: " + day);
    if(archive) for(const l of archive.locations) if(!after.air.some(a=>a.place_id === l.placeId && a.samples >= l.points.length)) throw new Error("Model archive readback failed.");
    return {verified:after.fireDays.length>0 || after.air.length === 8,partial:errors.length>0,fireDaysStored:after.fireDays.length,fireDaysWritten:written.length,modelPlaces:after.air.length,modelImportedAt:after.modelImportedAt,errors};
  }
  const [environmentResult, radarResult, historyResult,fireResult] = await Promise.allSettled([
    access.scope === "history" ? Promise.resolve(null) : require("./environment-provider").collectEnvironment(collectedAt),
    access.scope ? Promise.resolve(null) : require("./radar-collector").collectAllSources(collectedAt),
    access.scope === "environment" ? Promise.resolve(null) : refreshHistory(),
    access.scope === "history" ? Promise.resolve(null) : require("./fire-snapshot").collectFirePacket(collectedAt),
  ]);
  let inpe={verified:access.scope==="history",skipped:access.scope==="history"};
  if(access.scope!=="history")try{
    if(fireResult.status!=="fulfilled"||!fireResult.value)throw new Error("INPE collection failed before diagnostics.");
    const saved=await siteJson("/api/fires/ingest",fireResult.value),readback=await siteJson("/api/fires");
    if(!saved.success||saved.ultimaTentativa<collectedAt||readback.ultimaTentativa!==saved.ultimaTentativa||readback.ultimaAtualizacao!==saved.ultimaAtualizacao||readback.totalFocosEmCache!==saved.totalFocosEmCache)throw new Error("INPE snapshot readback does not match the saved attempt.");
    inpe={verified:true,partial:readback.parcial,diagnostics:readback};
    console.log(JSON.stringify({stage:"inpe_snapshot_saved",...inpe}));
  }catch(error){inpe={verified:false,error:error instanceof Error?error.message:"INPE writer failed."};}
  let environment = { verified: access.scope === "history", skipped: access.scope === "history", errors: {} };
  if(access.scope !== "history") try {
    if (environmentResult.status !== "fulfilled" || !environmentResult.value) throw new Error("Environmental collection failed.");
    const packet = environmentResult.value;
    const saved = await siteJson("/api/environment/ingest", packet);
    if (!saved.success) throw new Error("Environmental writer did not confirm the collection.");
    if (!packet.air && !packet.weather) { environment.errors = packet.failures; throw new Error("Neither environmental source responded; failures recorded."); }
    const readback = await siteJson("/api/environment");
    for (const source of ["air", "weather"]) if (packet[source] && (readback[source]?.attemptedAt < collectedAt || readback[source]?.places < packet[source].length)) throw new Error("Environmental readback does not match the collection.");
    environment = { verified: true, partial: !packet.air || !packet.weather || packet.air.length !== 8 || packet.weather.length !== 8 || Object.keys(readback.air?.failures ?? {}).length > 0 || Object.keys(readback.weather?.failures ?? {}).length > 0, sources: readback, errors: packet.failures };
    console.log(JSON.stringify({ stage: "environment_saved", ...environment }));
  } catch (error) { environment = { ...environment, error: error instanceof Error ? error.message : "Environmental update failed." }; }
  let radar = null;
  if (!access.scope) {
    if (radarResult.status !== "fulfilled" || !radarResult.value) throw new Error("Radar collection failed.");
    const result = radarResult.value;
    const saved = await siteJson("/api/radar/ingest", { revision: REVISION, runId, collectedAt, ...result });
    if (!saved.success || saved.run?.id !== runId) throw new Error("Site did not confirm the Radar collection.");
    const readback = await siteJson("/api/radar");
    if (readback.run?.id !== runId || readback.sources?.length !== 20) throw new Error("Radar readback does not match the collection.");
    radar = { run: readback.run, storedItems: readback.items.length, sources: readback.sources.map(s => ({ id: s.sourceId, status: s.status, accepted: s.accepted })) };
  }
  const history=historyResult.status === "fulfilled" ? historyResult.value : {verified:false,error:historyResult.reason instanceof Error ? historyResult.reason.message : "History failed"};
  const alertWrite=await siteJson("/api/alerts",{action:"evaluate"});
  const alertReadback=await siteJson("/api/alerts");
  const alerts={verified:alertWrite.success===true && (alertWrite.evaluation.enabled===0 || alertReadback.evaluatedAt>=alertWrite.evaluation.evaluatedAt),enabled:alertWrite.evaluation.enabled,created:alertWrite.evaluation.created,evaluatedAt:alertReadback.evaluatedAt};
  if(!alerts.verified)throw new Error("In-panel alert readback failed.");
  const verified=alerts.verified && inpe.verified && environment.verified && (access.scope === "environment" || history?.verified === true);
  console.log(JSON.stringify({ revision: REVISION, verified, environment,inpe,history,alerts,...(radar ?? {}) }));
  if (!verified) process.exitCode = 1;
}
main().catch(error => { console.error(JSON.stringify({ verified: false, error: error instanceof Error ? error.message : "Collector failed." })); process.exitCode = 1; });
