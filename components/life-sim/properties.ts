import { saveLayout } from '@/components/room-organizer/lib/persistence';
import { parseStoredLayout } from '@/components/room-organizer/lib/schema';
import { newNonce } from './bridge';
import { homeCost } from './home';
import { findPath } from './navigation';
import type { RoomLayout } from '@/components/room-organizer/lib/types';

export const PROPERTY_KEY='yourspace-properties-v1', DRAFT_KEY='yourspace-design-draft';
export interface Blueprint { id:string; name:string; layout:RoomLayout; savedAt:number }
export interface Properties { blueprints:Blueprint[]; lots:(Blueprint|null)[]; contract:{id:string;submitted:boolean}|null }
export function emptyProperties():Properties {return {blueprints:[],lots:[null,null,null,null],contract:null};}
export function parseProperties(raw:unknown):Properties|null {
  if(!raw||typeof raw!=='object')return null;const p=raw as Properties;
  const valid=(b:Blueprint)=>b&&typeof b.id==='string'&&typeof b.name==='string'&&b.name.length<=80&&Number.isFinite(b.savedAt)&&!!parseStoredLayout(b.layout);
  if(!Array.isArray(p.blueprints)||p.blueprints.length>100||!p.blueprints.every(valid)||!Array.isArray(p.lots)||p.lots.length!==4||!p.lots.every(b=>b===null||valid(b)))return null;
  if(p.contract!==null&&(!p.contract||typeof p.contract.id!=='string'||typeof p.contract.submitted!=='boolean'))return null;
  return {blueprints:p.blueprints.map(b=>({...b,layout:parseStoredLayout(b.layout)!})),lots:p.lots.map(b=>b?{...b,layout:parseStoredLayout(b.layout)!}:null),contract:p.contract};
}
export function loadProperties():Properties {
  const raw=localStorage.getItem(PROPERTY_KEY);if(!raw)return emptyProperties();
  const p=parseProperties(JSON.parse(raw));if(!p)throw new Error('Your saved designs could not be read. Export your browser data before starting a new design.');return p;
}
export function saveProperties(p:Properties):void {localStorage.setItem(PROPERTY_KEY,JSON.stringify(p));}
export function blankDesign():RoomLayout {return {name:'My house design',width:10,height:10,roof:{style:'gable',color:'#344d48'},floors:[{id:'ground',name:'Ground floor',floorColor:'#bca582',floorPattern:'wood',items:[]}]};}
export function beginDesign():void {
  const p=loadProperties();if(!p.contract||p.contract.submitted){if(!saveLayout(blankDesign(),DRAFT_KEY))throw new Error('Could not save the design draft.');saveProperties({...p,contract:{id:newNonce(),submitted:false}});}
}
export function saveBlueprint(p:Properties,layout:RoomLayout,name:string):Properties {
  if(p.blueprints.length>=100)throw new Error('Your shelf is full (100 designs). Export and remove a design first.');
  const clean=parseStoredLayout(layout);if(!clean)throw new Error('This design is not a valid house.');
  const title=name.trim().slice(0,80)||'Untitled house';
  return {...p,blueprints:[{id:newNonce(),name:title,layout:structuredClone({...clean,name:title}),savedAt:Date.now()},...p.blueprints]};
}
export function placeBlueprint(p:Properties,id:string,lot:number):Properties {
  const b=p.blueprints.find(x=>x.id===id);if(!b||lot<0||lot>3||!Number.isInteger(lot))return p;
  return {...p,lots:p.lots.map((x,i)=>i===lot?structuredClone(b):x)};
}
export function renameBlueprint(p:Properties,id:string,name:string):Properties {
  const title=name.trim().slice(0,80);if(!title)throw new Error('Give your house a name.');
  return {...p,blueprints:p.blueprints.map(b=>b.id===id?{...b,name:title,layout:{...b.layout,name:title}}:b)};
}
export function editBlueprint(id:string):void {
  const p=loadProperties(),blueprint=p.blueprints.find(b=>b.id===id);
  if(!blueprint)throw new Error('Choose a saved house first.');
  const previous=localStorage.getItem(DRAFT_KEY);
  if(previous)localStorage.setItem(DRAFT_KEY+'-before-edit',previous);
  if(!saveLayout(structuredClone(blueprint.layout),DRAFT_KEY))throw new Error('Could not open this design.');
  try{saveProperties({...p,contract:{id:newNonce(),submitted:false}});}
  catch(error){if(previous===null)localStorage.removeItem(DRAFT_KEY);else localStorage.setItem(DRAFT_KEY,previous);throw error;}
}
export function contractErrors(layout:RoomLayout):string[] {
  const errors:string[]=[];const floor=layout.floors[0];if(!floor)return ['Add a ground floor.'];
  if(layout.width*layout.height>120)errors.push('Keep the footprint at 120 m² or less.');
  if(homeCost(layout)>8000)errors.push('Keep furnishings within the $8,000 client budget.');
  for(const type of ['bed','fridge','shower','computer']){const items=floor.items.filter(i=>i.type===type&&i.position);if(!items.length)errors.push(`Place a ${type} on the ground floor.`);else if(!items.some(i=>findPath({x:0,z:0},i.position!,floor,layout.width,layout.height,i)))errors.push(`Leave a clear path to the ${type}.`);}
  return errors;
}
