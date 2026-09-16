import {EXTRA_CONFLICTS} from './conflict-packs';
import {parseStoryCard,type StoryCard} from './story-cards';
import type {LifeState} from './engine';

export const CONFLICT_KEYS=['holiday','will','bailout','wedding','medical',...EXTRA_CONFLICTS.map(c=>c.key)];
export type ConflictKey=typeof CONFLICT_KEYS[number];
export interface ConflictState {
  pressure:{scapegoating:number;secrecy:number;dependence:number};
  strain:number;allegiances:{parents:number;siblings:number;partner:number;extended:number};villain:boolean;
  decisions:Partial<Record<ConflictKey,{answer:0|1;minute:number;resolved:boolean}>>;
}
export function newConflicts():ConflictState{return {pressure:{scapegoating:0,secrecy:0,dependence:0},strain:0,allegiances:{parents:50,siblings:50,partner:50,extended:50},villain:false,decisions:{}};}
export function parseConflicts(raw:unknown):ConflictState|null{
  if(raw===undefined)return newConflicts();
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const c=raw as ConflictState;
  if(!c.pressure||!c.decisions||typeof c.decisions!=='object'||Array.isArray(c.decisions))return null;
  if(!(['scapegoating','secrecy','dependence'] as const).every(k=>Number.isFinite(c.pressure[k])&&c.pressure[k]>=0&&c.pressure[k]<=100))return null;
  for(const [key,v] of Object.entries(c.decisions))if(!CONFLICT_KEYS.includes(key as ConflictKey)||!v||![0,1].includes(v.answer)||!Number.isFinite(v.minute)||v.minute<0||typeof v.resolved!=='boolean')return null;
  const strain=c.strain??0,allegiances=c.allegiances??newConflicts().allegiances,villain=c.villain??false;
  if(!Number.isFinite(strain)||strain<0||strain>100||typeof villain!=='boolean'||!allegiances||!['parents','siblings','partner','extended'].every(k=>{const n=allegiances[k as keyof typeof allegiances];return Number.isFinite(n)&&n>=0&&n<=100;}))return null;
  return structuredClone({...c,strain,allegiances,villain});
}
type Choice={answer:string;benefit:string;fallout:string;impact:'repair'|'escalate'|'avoid';pressure:Partial<ConflictState['pressure']>;cost?:number};
const DEFINITIONS:Record<ConflictKey,{title:string;question:string;pack?:string;choices:[Choice,Choice]}>={
  holiday:{title:'The holiday eruption',question:'At dinner, your uncle revives a decade-old feud. The two sides are shouting over each other. Do you intervene or stay out of it?',choices:[
    {answer:'Defuse the argument.',benefit:'The yelling stops and dinner can continue for now.',fallout:'Both sides blame you for taking the other side. Being the peacemaker has made you the new scapegoat.',impact:'repair',pressure:{scapegoating:25}},
    {answer:'Pass the gravy and ignore it.',benefit:'You avoid being pulled into the argument for the moment.',fallout:'The argument becomes a physical altercation off-screen. Dinner ends early, and the siblings argue about who should have intervened.',impact:'avoid',pressure:{scapegoating:15,secrecy:10}}
  ]},
  will:{title:'The secret will',question:'You discover that your parents have written Casey out of their will. Casey has no idea. Do you share what you found?',choices:[
    {answer:'Tell Casey about the will.',benefit:'Casey trusts you for sharing the truth instead of protecting your own position.',fallout:'Your parents call it betrayal and threaten to disinherit you as well. Future inheritance is uncertain, not money you already own.',impact:'repair',pressure:{scapegoating:15}},
    {answer:'Keep the will a secret.',benefit:'You avoid an immediate confrontation and remain in your parents’ good graces.',fallout:'Casey discovers the will and learns you knew. The secret becomes a lasting breach of trust rather than a quiet financial advantage.',impact:'avoid',pressure:{secrecy:30}}
  ]},
  bailout:{title:'The bailout',question:'A relative asks for $500 to prevent eviction after another financial crisis. This would come out of your own money. What do you do?',choices:[
    {answer:'Lend $500.',benefit:'You pay $500. The relative keeps their home this month and the family praises your generosity.',fallout:'The money has not been repaid. Another request arrives, and the family treats your first loan as a standing commitment.',impact:'repair',pressure:{dependence:30}},
    {answer:'Refuse the loan.',benefit:'You keep your money and state a limit on what you can provide.',fallout:'The family calls you selfish and organizes a guilt trip. A financial boundary has become a test of loyalty.',impact:'avoid',pressure:{scapegoating:20}}
  ]},
  wedding:{title:'The uninvited guest',question:'Casey brings an ex with a history of cruel behavior to an expensive family wedding. The couple getting married looks distressed. What do you do?',choices:[
    {answer:'Ask Casey and the ex to leave.',benefit:'The couple knows someone is taking their discomfort seriously.',fallout:'Casey refuses quietly leaving and starts a loud scene at the reception. The couple feels supported but the family blames you for the spectacle.',impact:'repair',pressure:{scapegoating:25}},
    {answer:'Let them stay.',benefit:'You avoid an immediate confrontation at the reception.',fallout:'Tension follows the guest through the evening. The couple is unhappy with the photos, and the siblings disagree about the price of avoiding a scene.',impact:'avoid',pressure:{secrecy:15}}
  ]},
  medical:{title:'The emergency before the vacation',question:'Just before your vacation, a parent reports a medical emergency and demands that you cancel. Similar calls have involved pressure before, but you do not know what is happening this time. What do you do?',choices:[
    {answer:'Take the report seriously, arrange appropriate help, and keep my travel boundary.',benefit:'You avoid dismissing a possible emergency while refusing to be the only person who can respond.',fallout:'After the immediate concern is addressed, the parent says you abandoned them and reports struggling emotionally. Casey wants you permanently on call; Riley questions that expectation.',impact:'repair',pressure:{scapegoating:20}},
    {answer:'Cancel the vacation and stay.',benefit:'The parent is reassured for now. Cancellation costs you $150.',fallout:'Another demand arrives once the immediate concern is over. Your presence has become an expectation, and the lost money and time feed resentment.',impact:'avoid',pressure:{dependence:25}}
  ]}
};
for(const entry of EXTRA_CONFLICTS){
  DEFINITIONS[entry.key]={title:entry.title,question:entry.question,pack:entry.pack,choices:[entry.a,entry.b].map((row,i)=>({answer:row[0]+(entry.cost?.[i]?` · $${entry.cost[i]}`:''),benefit:row[1],fallout:row[2],impact:(i===0?'escalate':'avoid') as Choice['impact'],cost:entry.cost?.[i]??0,pressure:i===0?{scapegoating:20}:{secrecy:15,dependence:10}})) as [Choice,Choice]};
}
const prefix=(key:ConflictKey)=>`core-${key}-v1`;
function buildCoreCatalog(){return CONFLICT_KEYS.map(key=>{
  const d=DEFINITIONS[key]!,rootId=prefix(key);
  const base={version:1 as const,minStage:3,author:'Family Simulator',reviewer:'Family Simulator',reviewMode:'self' as const,status:'approved' as const};
  const cards:StoryCard[]=[{...base,id:rootId,title:d.title,question:d.question,choices:d.choices.map((c,i)=>({answer:c.answer,consequence:c.benefit,impact:c.impact,nextId:`${rootId}-${i}`})) as StoryCard['choices']},...d.choices.map((c,i)=>({...base,id:`${rootId}-${i}`,title:`${d.title}: the fallout`,question:c.fallout,choices:[
    {answer:'Name what happened and set a limit on what I will carry next.',consequence:'The original cost remains. You acknowledge the hurt while challenging the expectation that one person must absorb every family crisis.',impact:'repair' as const},
    {answer:'Keep the peace by accepting the family’s version.',consequence:'The conversation ends without agreement about what was fair. The pattern stays available for the next family conflict.',impact:'avoid' as const}
  ] as StoryCard['choices']}))];
  return {key:`core-${key}`,minStage:3,group:d.pack??'Core conflicts',description:'An immediate benefit, a delayed cost, and consequences shaped by earlier family decisions.',pack:{format:'family-story-pack-v1',rootId,cards}};
});}
const BUILTINS=buildCoreCatalog();
export function coreConflictCatalog(){return BUILTINS;}
const KNOWN=new Map(BUILTINS.flatMap(entry=>entry.pack.cards.map(card=>[card.id,{key:entry.key.slice(5),root:card.id===entry.pack.rootId,fingerprint:JSON.stringify(parseStoryCard(card))}] as const)));
function identify(card:StoryCard){const known=KNOWN.get(card.id);return known&&JSON.stringify(parseStoryCard(card))===known.fingerprint?known:null;}
export function conflictChoiceError(s:LifeState,card:StoryCard|undefined,index:number):string|null{
  if(!card)return null;const known=identify(card);if(!known)return null;
  if(!known.root)return s.director.conflicts.villain&&index===0?'The Villain route has closed this repair response.':null;
  const cost=DEFINITIONS[known.key]!.choices[index as 0|1].cost??0;
  if(s.money<cost)return `You need $${cost} available for this choice.`;
  if(known.key==='bailout'&&index===0&&s.money<500)return 'You need $500 available to make this loan.';
  if(known.key==='medical'&&index===1&&s.money<150)return 'You need $150 available for the cancellation cost.';
  return null;
}
const cap=(n:number)=>Math.max(0,Math.min(100,n));
/** Runs once after a validated scene choice. Mutates only the cloned result. */
export function applyConflictChoice(s:LifeState,card:StoryCard,index:0|1):LifeState{
  const known=identify(card);if(!known)return s;
  const core=structuredClone(s.director.conflicts),family=structuredClone(s.family);
  let money=s.money;const {key,root}=known;
  const change=(id:'parent-a'|'parent-b'|'older'|'younger',trust:number,resentment:number)=>{const b=family.bonds[id].self!;b.trust=cap(b.trust+trust);b.resentment=cap(b.resentment+resentment);};
  let report='';
  if(root){
    if(core.decisions[key])return s;
    const definition=DEFINITIONS[key]!.choices[index];
    for(const [meter,value] of Object.entries(definition.pressure))core.pressure[meter as keyof ConflictState['pressure']]=cap(core.pressure[meter as keyof ConflictState['pressure']]+value!);
    core.decisions[key]={answer:index,minute:s.minute,resolved:false};
    if(key==='bailout'&&index===0)money-=500;
    if(key==='medical'&&index===1)money-=150;
    money-=definition.cost??0;
    core.strain=cap(core.strain+(index===0?6:10));
    const group=DEFINITIONS[key]!.pack;
    const allegiance=group==='In-law boundaries'?'partner':group==='Sibling rivalries'?'siblings':group==='Deep secrets'?'parents':'extended';
    core.allegiances[allegiance]=cap(core.allegiances[allegiance]+(index===0?-5:3));
    if(key==='second-family'&&index===0){change('parent-a',10,0);change('parent-b',-10,10);}
    if(key==='will-sabotage'&&index===1)core.villain=true;
    if(key==='will'){change('older',index===0?8:-2,0);change('parent-a',index===0?-6:3,index===0?8:0);change('parent-b',index===0?-6:3,index===0?8:0);}
    report='The immediate outcome is recorded. Its aftermath will follow.';
  }else{
    const decision=core.decisions[key];if(!decision||decision.resolved)return s;
    const heated=Math.max(core.pressure.scapegoating,core.pressure.secrecy,core.pressure.dependence)>=40||Math.min(...Object.values(core.allegiances))<30;
    const strain=heated?12:6;
    core.strain=cap(core.strain+(heated?15:8));
    const group=DEFINITIONS[key]!.pack;
    const allegiance=group==='In-law boundaries'?'partner':group==='Sibling rivalries'?'siblings':group==='Deep secrets'?'parents':'extended';
    core.allegiances[allegiance]=cap(core.allegiances[allegiance]-(heated?14:7));
    if(key==='bailout-discrepancy'&&decision.answer===1)money-=650;
    if(key==='uninsured'&&decision.answer===1)money-=1500;
    if(group==='In-law boundaries'&&s.partner) {
      const support=key==='unwanted-advice'&&decision.answer===1&&s.relationships[s.partner]!>=50;
      s={...s,relationships:{...s.relationships,[s.partner]:cap(s.relationships[s.partner]!+(support?4:-strain))}};
    }
    if(key==='will'&&decision.answer===1)change('older',-18,20);
    else if(key==='will'||key==='medical'){change('parent-a',-strain,strain);change('parent-b',-strain,strain);}
    else {change('older',-strain,strain);change('younger',-strain,strain);}
    if(index===0){for(const meter of Object.keys(core.pressure) as (keyof ConflictState['pressure'])[])core.pressure[meter]=cap(core.pressure[meter]-8);}
    else core.pressure.dependence=cap(core.pressure.dependence+10);
    decision.resolved=true;
    report=heated?'Earlier conflicts make this fallout harder: the family brings accumulated pressure into the conversation.':'This fallout is recorded in the family’s relationships.';
    if(key==='uninsured'&&decision.answer===1)report+=' The fictional $1500 contract payment is deducted.';
    if(key==='bailout-discrepancy'&&decision.answer===1)report+=' The $650 loan repayment is deducted, including its $150 fee.';
    if(key==='unwanted-advice'&&decision.answer===1)report+=s.partner&&s.relationships[s.partner]!>=50?' Your partner speaks up for you.':' Your partner stays silent, adding to the strain.';
    if(index===0)report+=' Your boundary eases some pressure, but does not undo the cost.';
  }
  if(core.villain)report+=' Villain route: repair responses in core-conflict aftermaths are locked for this life.';
  const outcome=s.director.lastOutcome+' '+report;
  return {...s,money,family,needs:{...s.needs,fun:cap(s.needs.fun-(core.strain>=60?10:0))},director:{...s.director,conflicts:core,lastOutcome:outcome},memories:[{text:report,topic:'family-pattern',minute:s.minute,importance:8},...s.memories].slice(0,150)};
}
export function conflictContext(s:LifeState,card:StoryCard):string|null{
  const known=identify(card);if(!known||known.root||!s.director.conflicts.decisions[known.key])return null;
  const pressure=s.director.conflicts.pressure;
  return Math.max(pressure.scapegoating,pressure.secrecy,pressure.dependence)>=40?'Earlier arguments have left the family ready to assign blame. This conversation carries more than today’s problem.':'The immediate benefit has passed. Now the family is living with what followed.';
}
export function conflictStartError(s:LifeState,card:StoryCard):string|null{
  const known=identify(card);if(!known)return null;
  const decision=s.director.conflicts.decisions[known.key];
  if(known.root)return decision?'This decision has already been made.':null;
  return !decision||decision.resolved||card.id!==`${prefix(known.key)}-${decision.answer}`?'Play this episode’s opening and follow the chosen path first.':null;
}
export function isCoreConflictCard(card:StoryCard):boolean{return !!identify(card);}
export function conflictLibraryError(cards:StoryCard[]):string|null{
  for(const card of cards){
    if(KNOWN.has(card.id)&&!identify(card))return 'A built-in conflict was changed. Use a new ID for your own adaptation.';
    for(const choice of card.choices){const target=choice.nextId&&KNOWN.get(choice.nextId);if(target&&!target.root&&card.id!==prefix(target.key))return 'Built-in aftermaths must follow their original opening.';}
  }
  return null;
}
export function conflictSaveError(core:ConflictState,cards:StoryCard[],played:string[]):boolean{
  for(const [key,decision] of Object.entries(core.decisions)){
    if(!decision)return true;const root=prefix(key),follow=`${root}-${decision.answer}`;
    if(!cards.some(c=>c.id===root&&identify(c))||!played.includes(root)||decision.resolved!==played.includes(follow)||played.includes(`${root}-${1-decision.answer}`))return true;
  }
  for(const id of played){const known=KNOWN.get(id);if(known&&!core.decisions[known.key])return true;}
  return core.villain!==(core.decisions['will-sabotage']?.answer===1);
}
