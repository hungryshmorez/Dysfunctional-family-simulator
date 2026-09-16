import {newConflicts,parseConflicts,conflictLibraryError,conflictSaveError,type ConflictState} from './core-conflicts';
import {parseStoryCard,storyLinkError,type StoryCard} from './story-cards';
import type {Memory} from './engine';
import type {FamilyMoment} from './family';
export const AGENT_IDS=['parent-a','parent-b','older','younger'] as const;
export type AgentId=typeof AGENT_IDS[number];
export type StoryResponse='repair'|'escalate'|'avoid';
export type DirectedResponse=StoryResponse|'answer-a'|'answer-b';
export type StoryTone='grounded'|'tender'|'chaotic';
export interface DialogueLine {speaker:AgentId;text:string}
export interface DirectedScene extends FamilyMoment {
  id:string;stage:number;step:number;goal:string;reason:string;recalled:string|null;lines:DialogueLine[];
  card?:StoryCard;
}
export interface AgentMind {memories:Memory[];reflection:string}
export interface DirectorState {
  version:1;enabled:boolean;tone:StoryTone;nextAt:number;chapters:StoryResponse[][];
  agents:Record<AgentId,AgentMind>;active:DirectedScene|null;lastOutcome:string;
  cards:StoryCard[];playedCards:string[];paidCards:string[];
  queuedCard:string|null;conflicts:ConflictState;
}
export function newDirector():DirectorState{
  const mind=():AgentMind=>({memories:[],reflection:''});
  return {version:1,enabled:false,tone:'grounded',nextAt:0,chapters:Array.from({length:7},()=>[]),agents:{'parent-a':mind(),'parent-b':mind(),older:mind(),younger:mind()},active:null,lastOutcome:'',cards:[],playedCards:[],paidCards:[],queuedCard:null,conflicts:newConflicts()};
}
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const short=(x:unknown,max=1200):x is string=>typeof x==='string'&&x.length<=max;
const nonnegative=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const agent=(x:unknown):x is AgentId=>AGENT_IDS.includes(x as AgentId);
export function parseDirector(raw:unknown):DirectorState|null{
  if(raw===undefined)return newDirector();
  if(!record(raw)||raw.version!==1||typeof raw.enabled!=='boolean'||!['grounded','tender','chaotic'].includes(raw.tone as string)||!nonnegative(raw.nextAt)||!short(raw.lastOutcome))return null;
  if(!Array.isArray(raw.chapters)||raw.chapters.length!==7||!raw.chapters.every((c,i)=>Array.isArray(c)&&c.length<=(i===0?0:3)&&c.every(r=>['repair','escalate','avoid'].includes(r))))return null;
  if(!record(raw.agents))return null;
  for(const id of AGENT_IDS){const mind=raw.agents[id];if(!record(mind)||!short(mind.reflection)||!Array.isArray(mind.memories)||mind.memories.length>20||!mind.memories.every(m=>record(m)&&short(m.text)&&short(m.topic,80)&&nonnegative(m.minute)&&nonnegative(m.importance)&&m.importance<=10))return null;}
  const conflicts=parseConflicts(raw.conflicts);if(!conflicts)return null;
  const a=raw.active;
  const cards=raw.cards??[],playedCards=raw.playedCards??[],paidCards=raw.paidCards??[];
  if(!Array.isArray(cards)||cards.length>512||cards.some(c=>!parseStoryCard(c))||new Set(cards.map(c=>c.id)).size!==cards.length)return null;
  if(![playedCards,paidCards].every(ids=>Array.isArray(ids)&&ids.length<=512&&new Set(ids).size===ids.length&&ids.every(id=>cards.some(c=>c.id===id&&c.status==='approved'))))return null;
  if(conflictSaveError(conflicts,cards,playedCards as string[]))return null;
  const queuedCard=raw.queuedCard??null;
  if(conflictLibraryError(cards)||storyLinkError(cards)||queuedCard!==null&&(typeof queuedCard!=='string'||!cards.some(c=>c.id===queuedCard&&c.status==='approved')||(playedCards as string[]).includes(queuedCard)||a!==null))return null;
  if(a!==null){
    if(!record(a)||!short(a.id,100)||!Number.isInteger(a.stage)||Number(a.stage)<1||Number(a.stage)>6||!Number.isInteger(a.step)||Number(a.step)<0||Number(a.step)>2||!agent(a.actor)||!agent(a.target)||a.actor===a.target||!nonnegative(a.minute)||!['argument','support'].includes(a.kind as string)||!short(a.goal)||!short(a.reason)||!(a.recalled===null||short(a.recalled))||!Array.isArray(a.lines)||a.lines.length!==4||!a.lines.every(l=>record(l)&&(l.speaker===a.actor||l.speaker===a.target)&&short(l.text,600)))return null;
    if(a.card!==undefined){const card=parseStoryCard(a.card);if(!card||card.status!=='approved'||a.step!==0||a.id!==`card:${card.id}:${a.minute}`||!cards.some(c=>JSON.stringify(parseStoryCard(c))===JSON.stringify(card))||(playedCards as string[]).includes(card.id))return null;}
    else if(raw.chapters[Number(a.stage)].length!==a.step||a.id!==`${a.stage}:${a.step}:${a.minute}`)return null;
  }
  return structuredClone({...raw,cards,playedCards,paidCards,queuedCard,conflicts}) as unknown as DirectorState;
}
