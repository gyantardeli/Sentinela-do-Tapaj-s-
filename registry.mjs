// Fontes oficiais monitoradas. O URL de cada veículo é usado como ponto de
// descoberta; nenhum RSS suposto é registrado como confirmado antecipadamente.
export const MUNICIPIOS = [
  { id:'itaituba', nome:'Itaituba', lat:-4.2637, lon:-55.9916 },
  { id:'jacareacanga', nome:'Jacareacanga', lat:-6.222, lon:-57.754 },
  { id:'novo-progresso', nome:'Novo Progresso', lat:-7.143, lon:-55.379 },
  { id:'ruropolis', nome:'Rurópolis', lat:-4.096, lon:-54.906 },
  { id:'placas', nome:'Placas', lat:-3.868, lon:-54.218 },
  { id:'aveiro', nome:'Aveiro', lat:-3.608, lon:-55.332 },
  { id:'trairao', nome:'Trairão', lat:-4.574, lon:-55.944 },
  { id:'santarem', nome:'Santarém', lat:-2.443, lon:-54.708 }
];

export const SOURCES = [
  ['giro','Giro Portal','https://www.giroportal.com.br/'],
  ['plantao','Plantão 24Horas News','https://plantao24horasnews.com.br/'],
  ['folha','Folha do Progresso','https://news.folhadoprogresso.com.br/'],
  ['tapajos','Tapajós de Fato','https://www.tapajosdefato.com.br/'],
  ['impacto','Jornal O Impacto','https://oimpacto.com.br/'],
  ['estadon','O EstadoNet','https://oestadonet.com.br/'],
  ['jeso','Blog do Jeso','https://www.jesocarneiro.com.br/'],
  ['roma','Roma News','https://www.romanews.com.br/'],
  ['g1','G1 Santarém e Região','https://g1.globo.com/pa/santarem-regiao/'],
  ['liberal','O Liberal','https://www.oliberal.com/'],
  ['dol','DOL','https://dol.com.br/'],
  ['agencia','Agência Pará','https://www.agenciapara.com.br/'],
  ['bombeiros','Bombeiros / Defesa Civil do Pará','https://www.bombeiros.pa.gov.br/'],
  ['semas','SEMAS Pará','https://www.semas.pa.gov.br/'],
  ['pref_itaituba','Prefeitura de Itaituba','https://www.itaituba.pa.gov.br/'],
  ['pref_santarem','Prefeitura de Santarém','https://santarem.pa.gov.br/noticias'],
  ['ibama','IBAMA / Prevfogo','https://www.gov.br/ibama/pt-br'],
  ['icmbio','ICMBio','https://www.gov.br/icmbio/pt-br'],
  ['censipam','Censipam','https://www.gov.br/censipam/pt-br'],
  ['mppa','Ministério Público do Pará','https://www2.mppa.mp.br/']
].map(([id,nome,url]) => ({id,nome,url,dominio:new URL(url).hostname.replace(/^www\./,'')}));

// Estes são links para consulta humana, NÃO APIs de coleta automática.
export const CONSULTAS_MANUAIS = {
  selva:'https://www.appselva.com.br/',
  windy:'https://www.windy.com/',
  accuweather:'https://www.accuweather.com/',
  climaRadar:'https://www.climaeradar.com.br/'
};
