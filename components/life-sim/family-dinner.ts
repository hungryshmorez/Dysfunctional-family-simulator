import {passTime,remember,type LifeState} from './engine';
import {FAMILY_MEMBERS,type FamilyId} from './family';
import {recall} from './memory';
import type {RoomLayout} from '@/components/room-organizer/lib/types';

export type DinnerChoice='include'|'sides';
export const DEFAULT_SEATS:FamilyId[]=['parent-a','older','self','younger','parent-b'];
const cap=(n:number)=>Math.max(0,Math.min(100,n));
export function validSeats(seats:FamilyId[]):boolean{return seats.length===5&&new Set(seats).size===5&&seats.every(id=>FAMILY_MEMBERS.some(m=>m.id===id));}
export function dinnerTension(s:LifeState,seats:FamilyId[]):number{
  if(!validSeats(seats))return 100;let tension=0;
  seats.forEach((id,index)=>{const next=seats[(index+1)%5]!;tension+=(s.family.bonds[id][next]!.resentment+s.family.bonds[next][id]!.resentment)/10;
    if(id==='parent-a'||id==='parent-b'){const favorite=s.family.favorites[id];if(next===favorite||seats[(index+4)%5]===favorite)tension+=8;}
  });return Math.round(cap(tension));
}
export function dinnerError(s:LifeState,home:RoomLayout):string|null{
  if(s.completed||s.health<=0)return 'This life has ended.';
  if(s.stage<1)return 'Family dinners become playable in childhood.';
  if(s.family.lastDinnerDay===Math.floor(s.minute/1440)+1)return 'You already shared dinner today.';
  if(!home.floors[0]?.items.some(item=>['table','dining-table'].includes(item.type)&&item.position))return 'Place a table on the ground floor first.';
  if(s.money<20)return 'Dinner for the family costs $20.';
  return null;
}
export function dinnerMemory(s:LifeState):string|null{return recall(s.memories.filter(m=>m.topic==='family'),'family support resentment Casey Riley',s.minute,1)[0]?.text??null;}
export function familyDinner(s:LifeState,home:RoomLayout,seats:FamilyId[],choice:DinnerChoice):LifeState{
  if(dinnerError(s,home)||!validSeats(seats)||!['include','sides'].includes(choice))return s;
  const before=dinnerTension(s,seats),heated=before+(choice==='sides'?18:-12)>=25;
  const n=passTime(s,60),family=structuredClone(n.family);
  // Mark the day dinner ends, including meals that cross midnight.
  family.lastDinnerDay=Math.floor(n.minute/1440)+1;
  seats.forEach((id,index)=>{const other=seats[(index+1)%5]!;for(const [from,to] of [[id,other],[other,id]] as [FamilyId,FamilyId][]){const bond=family.bonds[from][to]!;bond.resentment=cap(bond.resentment+(heated?8:choice==='include'?-6:-2));bond.trust=cap(bond.trust+(heated?-3:4));bond.affection=cap(bond.affection+(heated?-2:3));}});
  for(const parent of ['parent-a','parent-b'] as const){
    if(choice==='include'){family.bonds[parent].self!.trust=cap(family.bonds[parent].self!.trust+3);}
    else{const favorite=family.favorites[parent];family.bonds[parent][favorite]!.affection=cap(family.bonds[parent][favorite]!.affection+5);if(favorite!=='self')family.bonds.self[parent]!.resentment=cap(family.bonds.self[parent]!.resentment+5);}
  }
  const names=seats.map(id=>id==='self'?s.name:FAMILY_MEMBERS.find(m=>m.id===id)!.name).join(' → ');
  const result=heated?'Dinner turns into an argument. Neighbors at the table leave with more resentment and less trust.':choice==='include'?'You make room for everyone to speak. Neighbors at the table leave a little closer.':'Dinner stays civil, but praising the favorites leaves you feeling overlooked.';
  const memory=dinnerMemory(s);
  return remember({...n,family,money:n.money-20,stageActions:n.stageActions+1,needs:{...n.needs,hunger:cap(n.needs.hunger+40),social:cap(n.needs.social+(heated?5:25))}},`Family dinner. Seating: ${names}. ${result}${memory?' Still on your mind: '+memory.slice(0,220):''}`,'family-dinner',heated?9:7);
}
