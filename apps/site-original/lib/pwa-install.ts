export type PwaInstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
let pending:PwaInstallEvent|null=null;
export function pendingPwaInstall(){return pending;}
export function observePwaInstall(){const capture=(event:Event)=>{event.preventDefault();pending=event as PwaInstallEvent;};const complete=()=>{pending=null;};window.addEventListener("beforeinstallprompt",capture);window.addEventListener("appinstalled",complete);return()=>{window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",complete);};}
