export type RadarSource = { id: string; name: string; domain: string; url: string; category: "local" | "regional" | "official"; coverage: string; feeds?: string[] };
export const RADAR_SOURCES: RadarSource[] = [
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
export type Locality = { id: string; name: string; axis: string; municipality: string; aliases: string[] };
export const RADAR_LOCALITIES: Locality[] = [
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
export const RADAR_AXES = [
  { id: "itaituba", name: "Itaituba / Miritituba" }, { id: "jacareacanga", name: "Jacareacanga" }, { id: "novo-progresso", name: "Novo Progresso / Moraes Almeida / Castelo dos Sonhos" },
  { id: "ruropolis-placas", name: "Rurópolis / Placas" }, { id: "aveiro", name: "Aveiro" }, { id: "trairao", name: "Trairão" }, { id: "santarem", name: "Santarém e entorno" },
];
export function sourceIndexUrl(source: RadarSource) {
  const query = `site:${source.domain} (incêndio OR queimadas OR queimada OR fumaça OR "focos de calor" OR "pega fogo") when:30d`;
  return "https://news.google.com/rss/search?" + new URLSearchParams({ q: query, hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" });
}
