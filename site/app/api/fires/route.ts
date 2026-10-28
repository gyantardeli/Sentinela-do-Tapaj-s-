import { readFireSnapshot } from "../../../lib/fire-store";
import { FIRE_REVISION, fireDiagnostics } from "../../../lib/fire-snapshot";
export async function GET(){
  try{return Response.json({revision:FIRE_REVISION,...fireDiagnostics(await readFireSnapshot(),Math.floor(Date.now()/1000))},{headers:{"Cache-Control":"private, no-store"}});}
  catch{return Response.json({error:"Snapshot INPE temporariamente indisponível."},{status:503,headers:{"Cache-Control":"private, no-store"}});}
}
