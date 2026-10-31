"use client";
import { LockKeyhole } from "lucide-react";
import { useSnapshot } from "./use-snapshot";
export default function SiteAccessNotice() {
  const {data}=useSnapshot<{canManage:boolean;publicRead:boolean}>("/api/access");
  if(!data?.publicRead)return null;
  return <div className="site-access-notice"><LockKeyhole size={13}/><span>{data.canManage?"Administrador":"Consulta pública"}</span>{!data.canManage&&<a href="/admin" target="_top">Acesso administrativo</a>}</div>;
}
