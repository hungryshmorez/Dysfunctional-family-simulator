import { STORAGE_KEY } from '@/components/room-organizer/lib/constants';
import { parseStoredLayout } from '@/components/room-organizer/lib/schema';
import { parseLife, type LifeState } from './engine';
import { parseProperties, PROPERTY_KEY, type Properties } from './properties';
import type { RoomLayout } from '@/components/room-organizer/lib/types';

export const LIFE_KEY='yourspace-life-v1';
export interface SaveBundle { life:LifeState; home:RoomLayout; properties?:Properties }
export function parseBundle(raw:unknown):SaveBundle|null {
  if(!raw||typeof raw!=='object')return null;
  const value=raw as Record<string,unknown>,life=parseLife(value.life),home=parseStoredLayout(value.home);
  const properties=value.properties===undefined?undefined:parseProperties(value.properties);
  if(!life||!home||properties===null)return null;
  return {life,home,...(properties?{properties}:{})};
}
// Roll back every changed key if an import hits the browser's storage limit.
export function writeBundle(storage:Storage,bundle:SaveBundle):void {
  const entries:[string,string][]=[[LIFE_KEY,JSON.stringify(bundle.life)],[STORAGE_KEY,JSON.stringify(bundle.home)]];
  if(bundle.properties)entries.push([PROPERTY_KEY,JSON.stringify(bundle.properties)]);
  const originals=entries.map(([key])=>[key,storage.getItem(key)] as const);
  try{for(const [key,value] of entries)storage.setItem(key,value);}
  catch(error){for(const [key,value] of originals){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{/* The recovery bundle is saved before imports. */}}throw error;}
}
export function downloadJson(value:unknown,name:string):void {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
