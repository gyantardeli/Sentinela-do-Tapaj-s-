import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto as crypto } from 'node:crypto';
import { accessSettings, verifyAccessJwt, withVerifiedIdentity } from '../lib/external-access.mjs';

const env={ ACCESS_TEAM_DOMAIN:'https://sentinela-team.cloudflareaccess.com', ACCESS_AUD:'a2345678901234567890123456789012' };
const now=Date.UTC(2026,9,22,12);
const b64url=bytes=>Buffer.from(bytes).toString('base64url');
const encode=object=>b64url(JSON.stringify(object));
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);
const fetchKeys=async url=> { assert.equal(url,env.ACCESS_TEAM_DOMAIN+'/cdn-cgi/access/certs'); return {ok:true,json:async()=>({keys:[{...jwk,kid:'test-key',alg:'RS256'}]})}; };
const payload=()=>({iss:env.ACCESS_TEAM_DOMAIN,aud:[env.ACCESS_AUD],iat:now/1000-50,exp:now/1000+3600,sub:'user-123',email:'operador@example.com',name:'Operador'});
async function sign(claims=payload()) {const head=encode({alg:'RS256',kid:'test-key',typ:'JWT'}),body=encode(claims);const data=`${head}.${body}`;return `${data}.${b64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(data))))}`;}

test('configuração incompleta ou host inseguro bloqueados',()=>{
  assert.equal(accessSettings({}),null);
  assert.equal(accessSettings({ ...env,ACCESS_TEAM_DOMAIN:'http://example.com'}),null);
  assert.equal(accessSettings({ ...env,ACCESS_TEAM_DOMAIN:'https://evil.com'}),null);
  assert.deepEqual(accessSettings(env),{teamDomain:env.ACCESS_TEAM_DOMAIN,audience:env.ACCESS_AUD});
});
test('JWT Cloudflare Access íntegro é aceito',async()=>{
  assert.deepEqual(await verifyAccessJwt(await sign(),env,fetchKeys,now),{id:'user-123',email:'operador@example.com',name:'Operador'});
});
test('JWT incorreto, vencido e forjado são rejeitados',async()=>{
  assert.equal(await verifyAccessJwt(null,env,fetchKeys,now),null);
  assert.equal(await verifyAccessJwt(await sign({...payload(),aud:'outra-app'}),env,fetchKeys,now),null);
  assert.equal(await verifyAccessJwt(await sign({...payload(),iss:'https://evil.com'}),env,fetchKeys,now),null);
  assert.equal(await verifyAccessJwt(await sign({...payload(),exp:now/1000-1}),env,fetchKeys,now),null);
  assert.equal(await verifyAccessJwt(await sign({...payload(),email:''}),env,fetchKeys,now),null);
  const original=await sign();const parts=original.split('.');const forged=parts[0]+'.'+encode({...payload(),email:'intruso@example.com'})+'.'+parts[2];
  assert.equal(await verifyAccessJwt(forged,env,fetchKeys,now),null);
  assert.equal(await verifyAccessJwt(original,env,async()=>({ok:false}),now),null);
});
test('headers oai fornecidos pelo cliente não são confiados',()=>{
 const req=new Request('https://sentinela.example.com/api/areas',{headers:{'oai-authenticated-user-id':'invasor','oai-authenticated-user-email':'invasor@example.com','oai-sites-authorization':'Bearer segredo','Cf-Access-Jwt-Assertion':'token'}});
 const forwarded=withVerifiedIdentity(req,{id:'user-123',email:'operador@example.com',name:'Responsável'});
 assert.equal(forwarded.headers.get('oai-authenticated-user-id'),'cloudflare:user-123');
 assert.equal(forwarded.headers.get('oai-authenticated-user-email'),'operador@example.com');
 assert.equal(forwarded.headers.get('oai-sites-authorization'),null);
 assert.equal(forwarded.headers.get('cf-access-jwt-assertion'),null);
});
