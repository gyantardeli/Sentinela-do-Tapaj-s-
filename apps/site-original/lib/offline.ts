import { BULLETIN_KEY, validBulletin, type Bulletin } from "./bulletin";
export function readSavedBulletin():Bulletin|null {try{const text=localStorage.getItem(BULLETIN_KEY);if(!text||text.length>15_000_000)return null;const value=JSON.parse(text);return validBulletin(value)?value:null;}catch{return null;}}
export function downloadFile(content:BlobPart,mime:string,name:string){const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export type OfflineStatus={revision:string;hasBulletin:boolean;hasPdf:boolean;capturedAt:number|null;savedAt:number|null;shellReady:boolean};
export async function preparePwa(){if(!("serviceWorker"in navigator)||!isSecureContext)return null;const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});await registration.update().catch(()=>{});const updating=registration.installing??registration.waiting;if(updating&&updating.state!=="activated")await new Promise<void>(resolve=>{const finish=()=>{clearTimeout(timer);updating.removeEventListener("statechange",changed);resolve();};const changed=()=>{if(updating.state==="activated"||updating.state==="redundant")finish();};const timer=setTimeout(finish,8000);updating.addEventListener("statechange",changed);changed();});const ready=registration.active?registration:await Promise.race([navigator.serviceWorker.ready,new Promise<null>(resolve=>setTimeout(()=>resolve(null),12000))]);return ready?.active?ready:null;}
export async function offlineStatus():Promise<OfflineStatus|null>{try{const ready=await preparePwa();if(!ready?.active)return null;const channel=new MessageChannel();return await new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),10000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};ready.active!.postMessage({type:"GET_STATUS"},[channel.port2]);});}catch{return null;}}
export async function saveOfflineShell(html:string,pdf:Uint8Array,capturedAt?:number){
  if(!("serviceWorker" in navigator)||!isSecureContext)return false;
  try{
    const ready=await preparePwa();
    if(!ready?.active)return false;
    const channel=new MessageChannel();
    return await new Promise<boolean>(resolve=>{const timer=setTimeout(()=>resolve(false),20000);channel.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data?.saved===true&&event.data.hasBulletin===true&&event.data.hasPdf===true);channel.port1.close();};ready.active!.postMessage({type:"SAVE_BULLETIN",html,pdf,capturedAt},[channel.port2]);});
  }catch{return false;}
}
export async function clearSavedBulletin(){localStorage.removeItem(BULLETIN_KEY);if("caches"in window)await caches.delete("sentinela-offline-v1");}
