// Suporte voluntário — desligado por padrão. Não cria cobranças nem processa pagamentos.
// Dados só são apresentados quando o responsável ativar e conferir o Pix empresarial.
export function validarCNPJ(valor) {
  const cnpj=String(valor||'').replace(/[.\/\-\s]/g,'');
  if(!/^\d{14}$/.test(cnpj)||/^(\d)\1{13}$/.test(cnpj)) return false;
  for(const tamanho of [12,13]){
    const pesos=tamanho===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];
    const soma=pesos.reduce((s,p,i)=>s+Number(cnpj[i])*p,0);
    const resto=soma%11;
    const digito=resto<2?0:11-resto;
    if(digito!==Number(cnpj[tamanho])) return false;
  }
  return true;
}
export function obterConfiguracaoApoio(env=process.env){
  const cnpj=String(env.SENTINELA_PIX_CNPJ||'').trim().replace(/[.\/\-\s]/g,'');
  const beneficiario=String(env.SENTINELA_PIX_BENEFICIARIO||'').trim();
  const ativo=env.SENTINELA_PIX_ENABLED==='true'
    && validarCNPJ(cnpj)
    && beneficiario.length>=2 && beneficiario.length<=100;
  return {
    tipo:'contribuicao_voluntaria',
    modalidade:'pix_empresarial',
    ativo,
    chavePix:ativo?cnpj:null,
    beneficiario:ativo?beneficiario:null,
    mensagem:ativo
      ?'Confira o nome do favorecido em seu banco antes de confirmar a transferência.'
      :'A opção de apoio está em preparação. Não há pagamento habilitado nesta prévia.'
  };
}
