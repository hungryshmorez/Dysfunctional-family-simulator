import config from '@/config/game.json';
import { FAMILY_MEMBERS,familyPresent,newFamily,parseFamily,spendFamilyTime,type FamilyState } from './family';
import { respondToMoment,tickFamily,type MomentResponse } from './family-moments';
import {newNeighborhood,parseNeighborhood,tickNeighborhood,type NeighborhoodState} from './neighborhood';
import { STAGES, type Skill } from './story';
import { finishDirectedScene,tickStoryDirector } from './story-director';
import {newDirector,parseDirector,type DirectedResponse,type DirectorState} from './story-director-state';

export type Need = 'energy' | 'hunger' | 'hygiene' | 'fun' | 'social';
export type Activity = 'eat' | 'sleep' | 'wash' | 'play' | 'study' | 'talk' | 'work' | 'create';
export interface Memory { text: string; topic: string; minute: number; importance: number }
export interface LifeState {
  version: 1; name: string; minute: number; stage: number; chapter: number;
  money: number; needs: Record<Need, number>; skills: Record<Skill, number>;
  job: string | null; shifts: number; stageActions: number; relationships: Record<string, number>;
  memories: Memory[]; unlocks: string[]; completed: boolean;
  city: { wellbeing: number; investment: number }; houseCost: number | null;
  health: number; partner: string | null; dates: Record<string, number>;
  alarmDay: number;
  /** Count of fights the player started. Aggression leaves a record the story answers for. */
  record: number;
  /** Life traits chosen at creation. They shape starting skills and family dynamics. */
  traits: string[];
  family:FamilyState;
  gender:'boy'|'girl'|null;
  director:DirectorState;
  neighborhood:NeighborhoodState;
}
export const JOBS = [
  { id: 'story-editor', name: 'Story editor', wage: 120, skill: 'creativity' as Skill, level: 0 },
  { id: 'cafe', name: 'Café assistant', wage: 70, skill: 'kindness' as Skill, level: 0 },
  { id: 'developer', name: 'Junior developer', wage: 130, skill: 'learning' as Skill, level: 6 },
  { id: 'designer', name: 'Studio designer', wage: 120, skill: 'creativity' as Skill, level: 6 },
  { id: 'architect', name: 'House designer', wage: 220, skill: 'creativity' as Skill, level: 0 },
  { id: 'planner', name: 'City planner', wage: 150, skill: 'learning' as Skill, level: 0 },
  { id: 'creator', name: 'YourSpace creator', wage: 180, skill: 'creativity' as Skill, level: 8 }
];
export const ACTIVITIES: Record<Activity, { label: string; types: string[]; need?: Need; gain?: number; minutes: number; cost: number; minStage: number }> = {
  eat: { label: 'Have a meal', types: ['fridge','stove','kitchen-sink'], need: 'hunger', gain: 45, minutes: 25, cost: 8, minStage: 0 },
  sleep: { label: 'Rest', types: ['bed','sofa'], need: 'energy', gain: 65, minutes: 180, cost: 0, minStage: 0 },
  wash: { label: 'Wash up', types: ['shower','bathtub','bathroom-sink'], need: 'hygiene', gain: 60, minutes: 20, cost: 0, minStage: 0 },
  play: { label: 'Make some music', types: ['tv','sofa','computer'], need: 'fun', gain: 40, minutes: 30, cost: 0, minStage: 0 },
  study: { label: 'Study', types: ['bookshelf','desk','computer'], minutes: 60, cost: 0, minStage: 1 },
  talk: { label: 'Spend time together', types: ['sofa','dining-table'], need: 'social', gain: 40, minutes: 35, cost: 0, minStage: 0 },
  work: { label: 'Work a shift', types: ['computer','desk'], minutes: 240, cost: 0, minStage: 3 },
  create: { label: 'Create a new project', types: ['computer','desk'], need: 'fun', gain: 25, minutes: 60, cost: 0, minStage: 2 }
};
export const NEED_NAMES: Record<Need, string> = { energy:'Energy', hunger:'Fullness', hygiene:'Hygiene', fun:'Fun', social:'Connection' };
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function newLife(name = 'Alex'): LifeState {
  return { version:1, gender:null, record:0, traits:[], family:newFamily(), director:newDirector(), neighborhood:newNeighborhood(480), name, minute:480, stage:0, chapter:0, money:config.startingMoney,
    needs:{energy:85,hunger:85,hygiene:90,fun:70,social:80}, skills:{creativity:0,learning:0,kindness:0},
    job:null, shifts:0, stageActions:0, relationships:{Rowan:20,Jules:15}, memories:[], unlocks:[],
    completed:false, city:{wellbeing:55,investment:0}, houseCost:null, health:100, partner:null, dates:{Rowan:0,Jules:0}, alarmDay:-1 };
}
export function remember(s: LifeState, text: string, topic: string, importance = 5): LifeState {
  return {...s, memories:[{text,topic,minute:s.minute,importance},...s.memories].slice(0,150)};
}
export function passTime(s: LifeState, minutes: number): LifeState {
  if (s.completed || s.health<=0 || !Number.isFinite(minutes) || minutes <= 0) return s;
  const next = s.minute + minutes;
  const days = Math.floor(next/1440)-Math.floor(s.minute/1440);
  const needs={...s.needs};
  // Infancy: the family feeds, washes and carries you — your needs are their job,
  // not yours, so nothing decays while you are a baby.
  if(s.stage>0)for (const k of Object.keys(needs) as Need[]) needs[k]=clamp(needs[k]-minutes*(k==='hunger'?.045:k==='energy'?.028:.02));
  const guided=s.director.enabled&&s.stage>=1&&(s.director.chapters[s.stage]!.length<3||!!s.director.queuedCard);
  const event=guided?{family:s.family}:tickFamily(s.family,next,s.stage);
  const hood=tickNeighborhood(s.neighborhood,next);
  let n={...s,family:event.family,minute:next,needs,money:s.money-(s.stage>=3?days*config.dailyBills:0),neighborhood:hood.state};
  if(event.text)n=remember(n,event.text,'family-moment',event.family.moment?.kind==='argument'?8:6);
  for(const ev of hood.events)n=remember(n,ev.text,'neighborhood',ev.importance);
  return tickStoryDirector(n);
}
export function chooseDirectedStory(s:LifeState,id:string,response:DirectedResponse):LifeState{
  const n=finishDirectedScene(s,id,response);return n===s?s:passTime(n,15);
}
export function resolveHouseholdMoment(s:LifeState,response:MomentResponse):LifeState{
  if(s.completed||s.health<=0||s.stage<1||s.director.active)return s;
  const result=respondToMoment(s.family,response,s.minute+15);
  if(!result.text)return s;
  return remember(passTime({...s,family:result.family,stageActions:s.stageActions+1},15),result.text,'family-moment',8);
}
export function activityError(s: LifeState, id: Activity): string | null {
  const a=ACTIVITIES[id];
  if(s.health<=0) return 'Your life has ended. Restore your safe checkpoint to try again.';
  if(s.completed) return 'This life is complete. You can still explore your home and read your memories.';
  if(s.stage<a.minStage) return `Available in ${STAGES[a.minStage]?.name}.`;
  if(s.money<a.cost) return `You need $${a.cost}.`;
  if(id==='work'&&!s.job) return 'Apply for a job on your computer first.';
  if((id==='work'||id==='study')&&s.needs.energy<15) return 'Rest before taking this on.';
  return null;
}
export function finishActivity(s: LifeState, id: Activity, person='Rowan'): LifeState {
  if(id==='work'&&s.job==='story-editor')return s;
  if(activityError(s,id)) return s;
  const relative=FAMILY_MEMBERS.find(member=>'family:'+member.id===person&&member.id!=='self');
  if(id==='talk'&&relative&&!familyPresent(relative.id,s.stage))return s;
  const a=ACTIVITIES[id]; let n=passTime(s,a.minutes);
  n={...n,money:n.money-a.cost,needs:{...n.needs},skills:{...n.skills},stageActions:n.stageActions+1};
  if(a.need)n.needs[a.need]=clamp(n.needs[a.need]+(a.gain??0));
  if(id==='study')n.skills.learning+=1;
  if(id==='create'||id==='play')n.skills.creativity+=1;
  if(id==='sleep')n.health=clamp(n.health+30);
  if(id==='talk'){n.skills.kindness+=1;if(relative)n.family=spendFamilyTime(n.family,relative.id);else n.relationships={...n.relationships,[person]:clamp((n.relationships[person]??0)+10)};}
  if(id==='work') { const job=JOBS.find(j=>j.id===n.job); if(job){n.money+=Math.round(job.wage*(1+n.city.wellbeing/500)+Math.floor(n.shifts/3)*10);n.shifts+=1;n.skills[job.skill]+=1;} }
  return remember(n,id==='talk'?`Spent time with ${relative?relative.name+' ('+relative.label.toLowerCase()+')':person}.`:a.label+'.',relative?'family':id,id==='work'?7:4);
}
export function applyForJob(s: LifeState, id: string): LifeState {
  const job=JOBS.find(j=>j.id===id);
  if(!job||s.stage<3||s.completed||s.health<=0||s.skills[job.skill]<job.level||(id==='creator'&&!s.unlocks.includes(config.websiteRewardId)))return s;
  return remember({...s,job:id},`Started work as ${job.name}.`,'career',9);
}
export function chooseStory(s: LifeState,index:number):LifeState {
  const event=STAGES[s.stage]?.events[s.chapter];const c=event?.choices[index];
  if(!c||s.completed||s.health<=0)return s;
  return remember({...s,chapter:s.chapter+1,skills:{...s.skills,[c.skill]:s.skills[c.skill]+c.amount},money:s.money+(c.cash??0)},c.consequence,'story',9);
}
export function stageRequirement(s: LifeState):string|null {
  if(s.director.enabled&&s.director.queuedCard)return 'Finish the linked story scene, or pause Story mode before growing older.';
  if(s.director.active)return 'Finish the open family story scene before growing older.';
  if(s.director.enabled&&s.stage>=1&&s.director.chapters[s.stage]!.length<3)return 'Finish this chapter’s three family story scenes, or pause Story mode.';
  if(s.chapter<(STAGES[s.stage]?.events.length??3)) return 'Live this chapter’s story moments to the end.';
  if(s.stage===3&&!s.job)return 'Find your first job using the computer.';
  if(s.stage===3&&s.shifts<1)return 'Complete your first paid shift.';
  if(s.stage===4&&s.shifts<3)return 'Complete three paid shifts across your life.';
  return null;
}
export function advanceStage(s:LifeState):LifeState {
  if(stageRequirement(s)||s.completed||s.health<=0)return s;
  if(s.stage===6)return remember({...s,completed:true},'Finished a life. The memories and the home remain.','legacy',10);
  return remember({...s,stage:s.stage+1,chapter:0,stageActions:0},`Began ${STAGES[s.stage+1]?.name}.`,'milestone',10);
}
export function claimVisit(s:LifeState):LifeState {
  if(s.unlocks.includes(config.websiteRewardId))return s;
  return remember({...s,unlocks:[...s.unlocks,config.websiteRewardId]},'Visited YourSpace. Founder room styling and the creator career are unlocked.','website',10);
}
export function investInCity(s:LifeState):LifeState {
  if(s.money<100||s.stage<3||s.completed||s.health<=0)return s;
  return remember({...s,money:s.money-100,city:{wellbeing:clamp(s.city.wellbeing+5),investment:s.city.investment+100}},'Contributed $100 to the neighborhood workshop. Local wellbeing and wages improved.','community',8);
}
export function parseLife(raw:unknown):LifeState|null {
  if(!raw||typeof raw!=='object')return null; const s=raw as LifeState;
  const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);
  if(s.version!==1||typeof s.name!=='string'||s.name.length>40||!finite(s.minute)||s.minute<0||!Number.isInteger(s.stage)||s.stage<0||s.stage>6||!Number.isInteger(s.chapter)||s.chapter<0||s.chapter>(STAGES[s.stage]?.events.length??3)||!finite(s.money)||!finite(s.shifts)||!finite(s.stageActions)||typeof s.completed!=='boolean')return null;
  if(!s.needs||!Object.keys(NEED_NAMES).every(k=>finite(s.needs[k as Need])&&s.needs[k as Need]>=0&&s.needs[k as Need]<=100))return null;
  if(!s.skills||!['learning','creativity','kindness'].every(k=>finite(s.skills[k as Skill])&&s.skills[k as Skill]>=0))return null;
  if(s.job!==null&&!JOBS.some(j=>j.id===s.job))return null;
  if(s.shifts<0||!Number.isInteger(s.shifts)||s.stageActions<0||!Number.isInteger(s.stageActions))return null;
  if(!s.city||!finite(s.city.wellbeing)||s.city.wellbeing<0||s.city.wellbeing>100||!finite(s.city.investment)||s.city.investment<0||!s.relationships||!['Rowan','Jules'].every(k=>finite(s.relationships[k])&&s.relationships[k]!>=0&&s.relationships[k]!<=100))return null;
  if(!Array.isArray(s.unlocks)||!s.unlocks.every(x=>typeof x==='string')||!Array.isArray(s.memories)||s.memories.length>150||!s.memories.every(m=>m&&typeof m.text==='string'&&m.text.length<2000&&typeof m.topic==='string'&&finite(m.minute)&&finite(m.importance)))return null;
  if(s.houseCost!==null&&!finite(s.houseCost))return null;
  const health=s.health??100, partner=s.partner??null, dates=s.dates??{Rowan:0,Jules:0};
  if(!finite(health)||health<0||health>100||(partner!==null&&!['Rowan','Jules'].includes(partner))||!dates||!Object.values(dates).every(n=>finite(n)&&n>=0))return null;
  const alarmDay=s.alarmDay??-1;if(!Number.isInteger(alarmDay)||alarmDay< -1)return null;
  const family=s.family===undefined?newFamily():parseFamily(s.family);if(!family)return null;
  const gender=s.gender??null;if(gender!==null&&gender!=='boy'&&gender!=='girl')return null;
  const director=parseDirector(s.director);if(!director)return null;
  if(director.active){const a=director.active,m=family.moment;if(a.stage!==s.stage||a.minute>s.minute||!m||m.actor!==a.actor||m.target!==a.target||m.minute!==a.minute||m.kind!==a.kind)return null;}
  const neighborhood=parseNeighborhood(s.neighborhood)??newNeighborhood(s.minute);
  const record=s.record??0;if(!Number.isInteger(record)||record<0)return null;
  const traits=Array.isArray(s.traits)?s.traits.filter(t=>typeof t==='string').slice(0,4):[];
  return {...s,health,partner,dates,alarmDay,family,gender,director,neighborhood,record,traits};
}

export function hurt(s:LifeState,amount:number):LifeState {
  if(s.completed||s.health<=0||!Number.isFinite(amount)||amount<=0)return s;
  const n={...s,health:clamp(s.health-amount)};
  return n.health===0?remember(n,'A prowler ended this life. Your safe checkpoint offers another chance.','danger',10):n;
}
export function dateError(s:LifeState,person:string):string|null {
  if(s.stage<3)return 'Dating begins in young adulthood.';
  if(s.completed||s.health<=0)return 'This life has ended.';
  if(!['Rowan','Jules'].includes(person))return 'Meet this person first.';
  if(s.partner&&s.partner!==person)return 'End your current relationship before dating someone else.';
  if((s.relationships[person]??0)<30)return 'Become friends first (30 connection).';
  if(s.money<20)return 'A date costs $20.';
  return null;
}
export function goOnDate(s:LifeState,person:string,idea:'music'|'museum'):LifeState {
  if(dateError(s,person))return s;
  const matches=person==='Rowan'?idea==='music':idea==='museum';
  const n=passTime(s,60);
  return remember({...n,money:n.money-20,stageActions:n.stageActions+1,dates:{...s.dates,[person]:(s.dates[person]??0)+1},relationships:{...s.relationships,[person]:clamp((s.relationships[person]??0)+(matches?15:8))},needs:{...n.needs,social:clamp(n.needs.social+30),fun:clamp(n.needs.fun+25)}},`${person} ${matches?'loved':'enjoyed'} your ${idea==='music'?'live music':'museum'} date.`,'romance',8);
}
export function askPartner(s:LifeState,person:string):LifeState {
  if(partnerError(s,person))return s;
  return remember({...s,partner:person},`${person} said yes! You are now in a relationship.`,'romance',10);
}
export function partnerError(s:LifeState,person:string):string|null {
  if(s.stage<3||s.completed||s.health<=0)return 'Dating begins in a living adult chapter.';
  if(!['Rowan','Jules'].includes(person))return 'Meet this person first.';
  if(s.partner)return 'You are already in a relationship.';
  if((s.dates[person]??0)<3||(s.relationships[person]??0)<65)return 'Build 65 connection and share 3 dates first.';
  return null;
}
export function soundAlarm(s:LifeState):LifeState {
  const day=Math.floor(s.minute/1440)+1;
  return s.health<=0||s.completed||s.alarmDay===day?s:{...s,alarmDay:day};
}
export const HOSPITAL_COST=60;
/** Why a clinic visit can't happen, or null when it can. */
export function hospitalError(s:LifeState):string|null {
  if(s.completed||s.health<=0)return 'This life has ended.';
  if(s.health>=100)return 'You are not hurt.';
  if(s.money<HOSPITAL_COST)return `A clinic visit costs $${HOSPITAL_COST}.`;
  return null;
}
/** Pay to get patched up: costs money and time, restores health. */
export function hospitalVisit(s:LifeState):LifeState {
  if(hospitalError(s))return s;
  const n=passTime(s,120);
  return remember({...n,money:n.money-HOSPITAL_COST,health:clamp(n.health+55)},'Got patched up at the clinic. Costly, but you can stand straight again.','health',7);
}
