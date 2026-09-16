export interface VisitChallenge { nonce:string; origin:string; expires:number }
export function websiteUrl(value:string,base:string):URL|null {
  try{const u=new URL(value,base);if(u.username||u.password)return null;
    const relative=value.startsWith('/')&&!value.startsWith('//')&&u.origin===new URL(base).origin;
    if(u.protocol==='https:'||(u.protocol==='http:'&&(relative||['localhost','127.0.0.1'].includes(u.hostname))))return u;
  }catch{}return null;
}
export function newNonce():string {
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]!&15)|64;bytes[8]=(bytes[8]!&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function validVisit(event:{origin:string;source:unknown;data:unknown},expectedSource:unknown,challenge:VisitChallenge|null,now=Date.now()):boolean {
  if(!challenge||!expectedSource||event.source!==expectedSource||event.origin!==challenge.origin||now>challenge.expires)return false;
  const d=event.data as {type?:unknown;nonce?:unknown}|null;
  return !!d&&typeof d==='object'&&d.type==='yourspace:visit'&&d.nonce===challenge.nonce;
}
