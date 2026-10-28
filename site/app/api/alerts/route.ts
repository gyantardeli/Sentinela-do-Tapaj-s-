import { evaluateAlerts, markAlertsRead, readAlerts, saveAlertConfig } from "../../../lib/alerts-store";
export async function GET() {
  try { return Response.json(await readAlerts(),{headers:{"Cache-Control":"private, no-store"}}); }
  catch {return Response.json({error:"Não foi possível ler os alertas."},{status:503});}
}
export async function POST(request:Request) {
  const origin=request.headers.get("origin");
  if((origin&&origin!==new URL(request.url).origin)||!request.headers.get("content-type")?.includes("application/json"))return Response.json({error:"Requisição inválida."},{status:403});
  try {
    const text=await request.text();if(text.length>16000)return Response.json({error:"Configuração muito grande."},{status:413});
    const body=JSON.parse(text),now=Math.floor(Date.now()/1000);
    if(body.action==="save")await saveAlertConfig(body,now);
    else if(body.action==="read")await markAlertsRead(now);
    else if(body.action!=="evaluate")return Response.json({error:"Ação inválida."},{status:400});
    const evaluation=body.action==="read"?null:await evaluateAlerts(now);
    return Response.json({success:true,evaluation,...await readAlerts()},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"Não foi possível atualizar os alertas."},{status:400});}
}
