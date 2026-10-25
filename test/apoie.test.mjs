import test from 'node:test';
import assert from 'node:assert/strict';
import {obterConfiguracaoApoio,validarCNPJ} from '../support.mjs';
import {readFile} from 'node:fs/promises';

test('recurso de apoio começa inativo sem dados de pagamento',()=>{
  assert.deepEqual(obterConfiguracaoApoio({}).chavePix,null);
  assert.equal(obterConfiguracaoApoio({}).ativo,false);
  assert.equal(obterConfiguracaoApoio({}).beneficiario,null);
});
test('não ativa com CNPJ ausente, sintaticamente inválido ou fictício',()=>{
  for(const cnpj of ['', '123', '00000000000000','11111111111111','12345678000100']){
    assert.equal(validarCNPJ(cnpj),false);
    const config=obterConfiguracaoApoio({SENTINELA_PIX_ENABLED:'true',SENTINELA_PIX_CNPJ:cnpj,SENTINELA_PIX_BENEFICIARIO:'Empresa de teste'});
    assert.equal(config.ativo,false);
    assert.equal(config.chavePix,null);
  }
});
test('configuração não ativa apenas por adicionar chave sem autorização explícita',()=>{
  const config=obterConfiguracaoApoio({SENTINELA_PIX_ENABLED:'false',SENTINELA_PIX_CNPJ:'',SENTINELA_PIX_BENEFICIARIO:'Empresa de teste'});
  assert.equal(config.ativo,false);
});
test('página informa que contribuição não concede acesso exclusivo',async()=>{
  const html=await readFile(new URL('../public/apoie.html',import.meta.url),'utf8');
  assert.match(html,/continuam <strong>gratuitos<\/strong>/i);
  assert.match(html,/Me paga um café\?/i);
  assert.match(html,/cafezinho simbólico/i);
  assert.match(html,/não é campanha beneficente/i);
  assert.match(html,/Pagamentos desativados nesta prévia/i);
  assert.doesNotMatch(html,/https:\/\/.*?(?:checkout|pix)/i);
});
