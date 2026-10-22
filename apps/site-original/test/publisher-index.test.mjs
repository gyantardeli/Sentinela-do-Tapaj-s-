import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublisherIndex,declaredPublisherFeeds} from '../lib/publisher-index.mjs';
const base='https://www.regional.example/noticias';
test('extrai apenas artigos publicos datados com links do mesmo dominio',()=>{
 const html='<html><article><h2><a href="/incendios-no-para">Incêndios no Pará mobilizam equipes de resposta</a></h2><time datetime="2026-10-22T14:05:00-03:00">22/10</time></article><article><h2><a href="https://malicioso.example/test">Incêndios no Tapajós exigem cuidado</a></h2><time datetime="2026-10-22">hoje</time></article><article><h2><a href="/sem-data">Queimada em Itaituba é noticiada</a></h2></article></html>';
 const rows=parsePublisherIndex(html,base);
 assert.equal(rows.length,1);assert.equal(rows[0].url,'https://www.regional.example/incendios-no-para');
 assert.equal(rows[0].date,'2026-10-22T17:05:00.000Z');
});
test('suporta metadados estruturados schema.org sem inventar data',()=>{
 const html='<html><script type="application/ld+json">{"@graph":[{"@type":"NewsArticle","headline":"Fumaça atinge comunidades do Tapajós nesta quinta-feira","url":"https://www.regional.example/alerta","datePublished":"2026-10-22T12:00:00Z"},{"@type":"NewsArticle","headline":"Outras notícias sem confirmação de data","url":"https://www.regional.example/indefinido"}]}</script></html>';
 assert.equal(parsePublisherIndex(html,base).length,1);
});
test('descobre RSS declarado, mas nunca inventa /feed nem usa dominio externo',()=>{
 const h='<html><link rel="alternate" type="application/rss+xml" href="/rss/atualizacoes.xml"><link type="application/rss+xml" rel="alternate" href="https://evil.example/rss"></html>';
 assert.deepEqual(declaredPublisherFeeds(h,base),['https://www.regional.example/rss/atualizacoes.xml']);
 assert.deepEqual(declaredPublisherFeeds('<html></html>',base),[]);
});
