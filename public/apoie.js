// A página consulta o servidor. Nenhum dado de pagamento é fixado no frontend.
const $=id=>document.getElementById(id);
function indisponivel(mensagem){
  $('apoio-status').textContent=mensagem;
  $('apoio-dados').hidden=true;
  $('apoio-pendente').hidden=false;
}
async function carregar(){
  try{
    const resposta=await fetch('/api/apoie',{cache:'no-store',headers:{Accept:'application/json'}});
    if(!resposta.ok) throw new Error('indisponível');
    const info=await resposta.json();
    if(!info.ativo||!/^\d{14}$/.test(info.chavePix||'')||!info.beneficiario){
      indisponivel(info.mensagem||'Contribuições indisponíveis.');
      return;
    }
    $('apoio-beneficiario').textContent=info.beneficiario;
    $('apoio-cnpj').textContent=info.chavePix;
    $('apoio-status').textContent=info.mensagem;
    $('apoio-pendente').hidden=true;
    $('apoio-dados').hidden=false;
    $('apoio-copiar').addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(info.chavePix);
        $('apoio-copiar').textContent='Chave copiada';
      }catch{
        $('apoio-copiar').textContent='Cópia indisponível: selecione a chave acima';
      }
    },{once:false});
  }catch{
    indisponivel('A função de apoio não está disponível neste ambiente.');
  }
}
void carregar();
