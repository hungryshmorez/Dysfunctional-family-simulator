export const FAMILY_MEMBERS=[
  {id:'parent-a',name:'Dana',role:'parent',label:'Parent'},
  {id:'parent-b',name:'Morgan',role:'parent',label:'Parent'},
  {id:'older',name:'Casey',role:'sibling',label:'Older sibling'},
  {id:'self',name:'You',role:'self',label:'Middle child'},
  {id:'younger',name:'Riley',role:'sibling',label:'Younger sibling'},
] as const;
export type FamilyId=typeof FAMILY_MEMBERS[number]['id'];
export interface FamilyMoment {kind:'argument'|'support';actor:Exclude<FamilyId,'self'>;target:Exclude<FamilyId,'self'>;minute:number}
export interface FamilyBond { affection:number;trust:number;resentment:number }
export interface FamilyState { version:1;birthOrder:['older','self','younger'];resolvedStages:number[];bonds:Record<FamilyId,Partial<Record<FamilyId,FamilyBond>>> }
export interface FamilyState { favorites:Record<'parent-a'|'parent-b','older'|'self'|'younger'>;lastDinnerDay:number }
export interface FamilyState { conversationDays:Partial<Record<FamilyId,number>> }
export interface FamilyState { lastMomentMinute:number|null;moment:FamilyMoment|null }
export function newFamily():FamilyState{
  const bonds={} as FamilyState['bonds'];
  for(const from of FAMILY_MEMBERS){bonds[from.id]={};for(const to of FAMILY_MEMBERS){if(from.id===to.id)continue;bonds[from.id][to.id]={affection:from.role==='parent'?70:55,trust:60,resentment:0};}}
  bonds['parent-a'].older!.affection=85;bonds['parent-b'].younger!.affection=85;
  return {version:1,birthOrder:['older','self','younger'],resolvedStages:[],bonds,favorites:{'parent-a':'older','parent-b':'younger'},lastDinnerDay:-1,conversationDays:{},lastMomentMinute:null,moment:null};
}
export function parseFamily(raw:unknown):FamilyState|null{
  if(!raw||typeof raw!=='object')return null;const f=raw as FamilyState;
  if(f.version!==1||!Array.isArray(f.birthOrder)||f.birthOrder.join('|')!=='older|self|younger'||!f.bonds)return null;
  for(const from of FAMILY_MEMBERS)for(const to of FAMILY_MEMBERS){if(from.id===to.id)continue;const bond=f.bonds[from.id]?.[to.id];if(!bond||![bond.affection,bond.trust,bond.resentment].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100))return null;}
  const resolved=f.resolvedStages??[];if(!Array.isArray(resolved)||!resolved.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||new Set(resolved).size!==resolved.length)return null;
  const favorites=f.favorites??{'parent-a':'older','parent-b':'younger'},lastDinnerDay=f.lastDinnerDay??-1;
  if(!favorites||!['parent-a','parent-b'].every(id=>['older','self','younger'].includes(favorites[id as 'parent-a']))||!Number.isInteger(lastDinnerDay)||lastDinnerDay< -1)return null;
  const conversationDays=f.conversationDays??{};
  if(typeof conversationDays!=='object'||Array.isArray(conversationDays)||Object.entries(conversationDays).some(([id,day])=>!FAMILY_MEMBERS.some(m=>m.id===id&&id!=='self')||!Number.isInteger(day)||day<1))return null;
  const lastMomentMinute=f.lastMomentMinute??null,moment=f.moment??null;
  if(lastMomentMinute!==null&&(!Number.isFinite(lastMomentMinute)||lastMomentMinute<0))return null;
  if(moment!==null){
    if(typeof moment!=='object'||Array.isArray(moment)||!['argument','support'].includes(moment.kind)||!['actor','target'].every(key=>FAMILY_MEMBERS.some(m=>m.id!=='self'&&m.id===moment[key as 'actor']))||moment.actor===moment.target||!Number.isFinite(moment.minute)||moment.minute<0||moment.minute!==lastMomentMinute)return null;
  }
  return {...structuredClone(f),resolvedStages:[...resolved],favorites:{...favorites},lastDinnerDay,conversationDays:{...conversationDays},lastMomentMinute,moment:moment?{...moment}:null};
}
export function spendFamilyTime(f:FamilyState,id:FamilyId):FamilyState{
  if(id==='self')return f;const n=structuredClone(f);
  for(const [from,to] of [['self',id],[id,'self']] as [FamilyId,FamilyId][]){const bond=n.bonds[from][to]!;bond.affection=Math.min(100,bond.affection+8);bond.trust=Math.min(100,bond.trust+4);bond.resentment=Math.max(0,bond.resentment-2);}
  return n;
}
/** The opposite of spending time: a fight scars the bond both ways. */
export function fightFamilyMember(f:FamilyState,id:FamilyId):FamilyState{
  if(id==='self')return f;const n=structuredClone(f);
  for(const [from,to] of [['self',id],[id,'self']] as [FamilyId,FamilyId][]){const bond=n.bonds[from][to]!;bond.affection=Math.max(0,bond.affection-15);bond.trust=Math.max(0,bond.trust-12);bond.resentment=Math.min(100,bond.resentment+24);}
  return n;
}
export function familyPresent(id:FamilyId,stage:number):boolean{return id!=='younger'||stage>=1;}
