import {FAMILY_MEMBERS,type FamilyId,type FamilyMoment,type FamilyState} from './family';
export type MomentResponse='mediate'|'side'|'join'|'leave';
const cap=(n:number)=>Math.max(0,Math.min(100,n));
const name=(id:FamilyId)=>FAMILY_MEMBERS.find(m=>m.id===id)!.name;
export function momentText(moment:FamilyMoment):string{
  return moment.kind==='argument'?`${name(moment.actor)} and ${name(moment.target)} are arguing about who gets heard in this family.`:`${name(moment.actor)} notices ${name(moment.target)} having a rough day and makes time to listen.`;
}
/** One unresolved moment at a time; skipped hours never generate a backlog. */
export function tickFamily(f:FamilyState,minute:number,stage:number):{family:FamilyState;text?:string}{
  if(stage<1||f.moment)return {family:f};
  if(f.lastMomentMinute===null)return {family:{...f,lastMomentMinute:minute}};
  if(minute-f.lastMomentMinute<180)return {family:f};
  const ids=FAMILY_MEMBERS.filter(m=>m.id!=='self').map(m=>m.id) as FamilyMoment['actor'][];
  const pairs=ids.flatMap(actor=>ids.filter(target=>target!==actor).map(target=>({actor,target})));
  const tense=pairs.reduce((best,pair)=>f.bonds[pair.actor][pair.target]!.resentment>f.bonds[best.actor][best.target]!.resentment?pair:best,pairs[0]!);
  let pair=pairs[Math.floor(minute/180)%pairs.length]!,kind:FamilyMoment['kind']='support';
  if(f.bonds[tense.actor][tense.target]!.resentment>=25){pair=tense;kind='argument';}
  else if(Math.floor(minute/180)%3===0){
    const parent=Math.floor(minute/180)%2===0?'parent-a':'parent-b';
    const target=f.favorites[parent]==='older'?'younger':'older';
    if(f.bonds[parent][f.favorites[parent]]!.affection-f.bonds[parent][target]!.affection>=10){pair={actor:parent,target};kind='argument';}
  }
  const family=structuredClone(f),moment:FamilyMoment={...pair,kind,minute};
  family.lastMomentMinute=minute;family.moment=moment;
  for(const [from,to] of [[pair.actor,pair.target],[pair.target,pair.actor]] as const){
    const b=family.bonds[from][to]!;b.trust=cap(b.trust+(kind==='argument'?-3:3));b.resentment=cap(b.resentment+(kind==='argument'?6:-2));if(kind==='support')b.affection=cap(b.affection+2);
  }
  return {family,text:momentText(moment)};
}
export function respondToMoment(f:FamilyState,response:MomentResponse,minute:number):{family:FamilyState;text?:string}{
  const moment=f.moment;if(!moment||!['leave',...(moment.kind==='argument'?['mediate','side']:['join'])].includes(response))return {family:f};
  const family=structuredClone(f),{actor,target}=moment;family.moment=null;family.lastMomentMinute=minute;
  let outcome='You give them space. What happened still matters to their relationship.';
  if(response==='mediate'){
    const receptive=(family.bonds[actor].self!.trust+family.bonds[target].self!.trust)/2>=40;
    if(receptive){for(const [from,to] of [[actor,target],[target,actor]] as const){const b=family.bonds[from][to]!;b.resentment=cap(b.resentment-8);b.trust=cap(b.trust+3);}outcome='You help each person finish their sentence. The argument eases, though old hurts remain.';}
    else{for(const id of [actor,target])family.bonds[id].self!.resentment=cap(family.bonds[id].self!.resentment+3);outcome='Neither trusts your intervention yet. They ask you to stay out of it.';}
  }else if(response==='side'){
    family.bonds[actor].self!.trust=cap(family.bonds[actor].self!.trust+5);family.bonds[target].self!.resentment=cap(family.bonds[target].self!.resentment+8);
    outcome=`You back ${name(actor)}. They appreciate it; ${name(target)} feels outnumbered.`;
  }else if(response==='join'){
    for(const id of [actor,target])for(const [from,to] of [[id,'self'],['self',id]] as [FamilyId,FamilyId][]){const b=family.bonds[from][to]!;b.trust=cap(b.trust+3);b.affection=cap(b.affection+3);}
    outcome='You join them for a quiet moment. All three of you feel a little closer.';
  }
  return {family,text:`${momentText(moment)} ${outcome}`};
}
