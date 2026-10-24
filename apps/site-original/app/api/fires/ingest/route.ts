import { validateFirePacket, fireDiagnostics } from "../../../../lib/fire-snapshot";
import { saveFireSnapshot } from "../../../../lib/fire-store";
const MAX_BYTES=8_000_000;
export async function POST(request:Request){
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin||request.headers.get("sec-fetch-site")==="cross-site")return Response.json({success:false,error:"Origem não autorizada."},{status:403});
  if(!request.headers.get("content-type")?.includes("application/json"))return Response.json({success:false,error:"Envie JSON."},{status:415});
  if(Number(request.headers.get("content-length")??0)>MAX_BYTES)return Response.json({success:false,error:"Snapshot excessivo."},{status:413});
  let packet;
  try{
    const reader=request.body?.getReader(),decoder=new TextDecoder();let bytes=0,text="";
    if(!reader)throw new Error("Corpo ausente.");
    try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>MAX_BYTES){await reader.cancel();return Response.json({success:false,error:"Snapshot excessivo."},{status:413});}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
    packet=validateFirePacket(JSON.parse(text),Math.floor(Date.now()/1000));
  }catch{return Response.json({success:false,error:"Snapshot INPE inválido: confira arquivos, horários GMT, coordenadas e satélite."},{status:400});}
  try{const result=await saveFireSnapshot(packet);return Response.json({success:true,accepted:result.accepted,...fireDiagnostics(result.state,Math.floor(Date.now()/1000))},{headers:{"Cache-Control":"private, no-store"}});}
  catch{return Response.json({success:false,error:"Não foi possível gravar o snapshot INPE. A cópia anterior foi preservada."},{status:502});}
}
