export const PANELS = [
  { id: "overview", label: "Visão geral", hash: "#visao-geral", title: "Sentinela Tapajós", description: "Queimadas, qualidade do ar, vento e notícias para acompanhar a região." },
  { id: "fire3d", label: "Mapa 3D · evolução", hash: "#mapa-3d", title: "O fogo no tempo e no terreno.", description: "Explore detecções em 3D, reproduza as observações e acompanhe possíveis eventos." },
  { id: "maps", label: "Comparar mapas", hash: "#comparar-mapas", title: "Duas perspectivas. Uma região.", description: "Compare as detecções de calor com a circulação do vento e os poluentes no Windy." },
  { id: "purpleair", label: "Qualidade do ar", hash: "#qualidade-do-ar", title: "Qualidade do ar no Tapajós", description: "Mapa PurpleAir de sensores de qualidade do ar, com legendas em português e referências." },
  { id: "weather", label: "Previsão do tempo", hash: "#previsao", title: "Previsão do tempo no Tapajós", description: "AccuWeather, Clima & Radar e Windy para acompanhar o tempo na região." },
  { id: "inpe", label: "INPE · Queimadas", hash: "#inpe", title: "Queimadas com a referência do INPE", description: "Dados ambientais, risco de fogo e acesso ao monitoramento oficial do Programa Queimadas." },
  { id: "radar", label: "Radar regional", hash: "#radar-regional", title: "Radar de notícias da região", description: "Notícias e comunicados sobre queimadas e incêndios, classificados por local e relevância." },
  { id: "history", label: "Histórico regional", hash: "#historico", title: "A região ao longo do tempo.", description: "Histórico de 7 e 30 dias para comparar detecções, modelo de partículas e notícias." },
  { id: "intelligence", label: "Inteligência Ambiental", hash: "#inteligencia-ambiental", title: "Inteligência Ambiental", description: "Indicadores, tendências, comparação de municípios e homologação da integração Power BI." },
  { id: "health", label: "Saúde das fontes", hash: "#saude-das-fontes", title: "Acompanhe a qualidade das fontes.", description: "Confira respostas, atrasos, falhas e a cobertura real de cada canal monitorado." },
  { id: "areas", label: "Áreas de interesse", hash: "#areas", title: "Suas áreas de interesse.", description: "Defina coordenadas, polígonos e corredores para acompanhar focos dentro da área selecionada." },
  { id: "alerts", label: "Alertas da operação", hash: "#alertas", title: "Acompanhe o que pede atenção.", description: "Defina limites para detecções, partículas e interrupções da coleta. Consulte os avisos no painel." },
  { id: "collection", label: "Coleta", hash: "#coleta", title: "Coleta de informações", description: "Acompanhe as verificações, os horários e as falhas da coleta." },
  { id: "sources", label: "Fontes e método", hash: "#fontes", title: "Cada dado tem uma origem.", description: "Entenda o que foi observado, o que foi calculado e os limites de cada fonte." },
  { id: "diary", label: "Diário do Explorador", hash: "#diario", title: "Diário do Explorador", description: "Histórias, povos e expedições pela região do Tapajós." },
] as const;

export type PanelId = (typeof PANELS)[number]["id"];

const aliases: Record<string, PanelId> = {
  "#overview": "overview", "#mapa": "fire3d", "#windy": "maps",
  "#previsao-do-tempo": "weather", "#historico-regional": "history",
  "#radar": "radar", "#fontes-e-metodo": "sources",
};

export function panelFromLocation(hash: string, search = ""): PanelId {
  const known = PANELS.find(panel => panel.hash === hash);
  if (known) return known.id;
  if (aliases[hash]) return aliases[hash];
  if (!hash && new URLSearchParams(search).get("tab") === "diario") return "diary";
  return "overview";
}

export function panelHash(id: PanelId): string {
  return PANELS.find(panel => panel.id === id)!.hash;
}
