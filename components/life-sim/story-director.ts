import {isCoreConflictCard,applyConflictChoice,conflictChoiceError,conflictContext,conflictStartError} from './core-conflicts';
import {FAMILY_MEMBERS} from './family';
import {recall} from './memory';
import {AGENT_IDS,type AgentId,type DirectedResponse,type DirectedScene,type StoryResponse,type StoryTone} from './story-director-state';
import {FAMILY_EPISODES} from './story-episodes';
import type {LifeState,Memory} from './engine';

export const PERSONAS:Record<AgentId,{want:string;fear:string;voice:string;warmth:number;assertiveness:number}>={
  'parent-a':{want:'Keep the family together and feel appreciated',fear:'Being remembered only for mistakes',voice:'I thought keeping everything running was how I showed I cared.',warmth:70,assertiveness:65},
  'parent-b':{want:'Protect the family and feel useful',fear:'Losing control when someone needs help',voice:'I keep trying to solve things before I have listened.',warmth:55,assertiveness:80},
  older:{want:'Be valued without having to be the example',fear:'Disappointing everyone by needing help',voice:'Everyone expects me to know what to do. Sometimes I am just guessing.',warmth:55,assertiveness:70},
  younger:{want:'Be taken seriously and included',fear:'Being treated as a problem to manage',voice:'You can ask me what I think. I am right here.',warmth:80,assertiveness:50},
};
export interface AgentAction {skill:'converse_with';actor:AgentId;target:AgentId;kind:'argument'|'support';score:number;goal:string;reason:string}
const SCENE_TOPICS:Record<number,[string,string,string]>={
  1:['We said everyone would get a turn to choose our afternoon. Then somehow the day filled up without asking you.','Casey remembers a celebration. Riley remembers needing help. You remember nobody noticing you were waiting.','If we promise another afternoon, I want a date and a plan. Otherwise it is just something we say to end an argument.'],
  2:['The rule was one thing when Casey asked and another when you asked. We need to explain that.','Calling it protection does not answer why one child gets freedom and another gets a lecture.','A boundary should still make sense tomorrow, when someone else is the one asking.'],
  3:['A paycheck should mean you have more choices. I can see how our expectations made it feel like another obligation.','Helping the family cannot mean you are never allowed to keep anything for yourself.','We need to agree what help means before the next request becomes a test of whether you love us.'],
  4:['Nobody noticed the work until the appointment was missed. Now everyone has an opinion about who should have remembered.','There is planning the task, remembering the task, and actually doing it. We keep counting only the last part.','Let us decide who owns each task. Being helpful should not mean being permanently on call.'],
  5:['We need a plan for helping a parent. I can already hear us slipping into the same old roles.','The child who gets asked first is not always the child with the most time. Sometimes they are just the one who has trouble saying no.','A schedule we can sustain matters more than a dramatic promise we will resent next week.'],
  6:['I opened the keepsake box expecting happy memories. I did not expect us to disagree about what the same photograph means.','We were all in that house, but apparently we were not all living in the same story.','What do we want someone finding this box years from now to understand about us?'],
};
const cap=(n:number)=>Math.max(0,Math.min(100,n));
const name=(id:AgentId)=>FAMILY_MEMBERS.find(m=>m.id===id)!.name;
const addMemory=(memories:Memory[],text:string,minute:number,topic:string):Memory[]=>[{text,minute,topic,importance:8},...memories].slice(0,20);

/** Original utility planner. The director sees candidate scores, not invented events. */
export function rankStoryActions(s:LifeState):AgentAction[]{
  const episode=FAMILY_EPISODES[s.stage];if(!episode)return [];
  const options:AgentAction[]=[];
  for(const actor of AGENT_IDS)for(const target of AGENT_IDS){
    if(actor===target)continue;
    const b=s.family.bonds[actor][target]!,persona=PERSONAS[actor];
    const recent=s.director.agents[actor].reflection;
    for(const kind of ['argument','support'] as const){
      const motive=kind==='argument'?b.resentment*.8+(100-b.trust)*.2+persona.assertiveness*.15:(100-b.trust)*.25+persona.warmth*.35;
      const tone=kind==='argument'?(s.director.tone==='chaotic'?24:0):(s.director.tone==='tender'?24:0);
      const reflection=recent.includes('listen')&&kind==='support'?12:recent.includes('defensive')&&kind==='argument'?12:0;
      const pressure=s.director.conflicts.pressure;
      const accumulated=kind==='argument'?(pressure.scapegoating+pressure.secrecy+pressure.dependence)*.08:0;
      const score=Math.round(motive+tone+reflection+accumulated+(episode.lead===actor?35:0));
      options.push({skill:'converse_with',actor,target,kind,score,goal:kind==='argument'?`Be heard by ${name(target)}`:`Understand what ${name(target)} needs`,reason:`${name(actor)} wants to ${PERSONAS[actor].want.toLowerCase()}. Trust toward ${name(target)} is ${Math.round(b.trust)}; resentment is ${Math.round(b.resentment)}. ${kind==='argument'?'They want to challenge the situation.':'They are looking for a way to reconnect.'}`});
    }
  }
  return options.sort((a,b)=>b.score-a.score||`${a.actor}:${a.target}:${a.kind}`.localeCompare(`${b.actor}:${b.target}:${b.kind}`));
}
export function episodeEnding(choices:StoryResponse[]):'healing'|'rift'|'uneasy'{
  return choices.filter(c=>c==='repair').length>=2?'healing':choices.includes('escalate')?'rift':'uneasy';
}
function buildScene(s:LifeState,action:AgentAction):DirectedScene{
  const episode=FAMILY_EPISODES[s.stage]!,choices=s.director.chapters[s.stage]!,step=choices.length;
  const {actor,target,kind}=action,mind=s.director.agents[actor];
  const remembered=recall(mind.memories,episode.goal,s.minute,1)[0]?.text??null;
  const last=choices.at(-1);
  const opening=step===0?PERSONAS[actor].voice:last==='repair'?'You asked us to listen. I have been trying to work out what I missed.':last==='escalate'?'What you said stayed with me. I am still deciding whether you meant to hurt me.':'We stopped talking about it. That did not make it disappear.';
  const genderContext=s.stage===2?s.gender==='boy'?'Being told to toughen up does not make asking for help easier.':s.gender==='girl'?'Being asked to keep everyone happy does not make these rules fair.':'Being the middle child does not mean having the smallest say.':PERSONAS[target].voice;
  const response=s.family.bonds[target][actor]!.resentment>=25?'I can hear the words, but I am still carrying what happened between us.':kind==='argument'?'I do not see it the same way. Can I finish explaining before you decide?':'I want us to do better than the last time.';
  return {id:`${s.stage}:${step}:${s.minute}`,stage:s.stage,step,actor,target,kind,minute:s.minute,goal:episode.goal,reason:action.reason,recalled:remembered,lines:[
    {speaker:actor,text:SCENE_TOPICS[s.stage]![step]+' '+opening},
    {speaker:target,text:response},
    {speaker:actor,text:remembered?`I remember this: ${remembered.slice(0,180)}`:s.money<100&&s.stage>=3?'Money is tight, and I know that makes every request feel heavier.':`What I need is to ${PERSONAS[actor].want.toLowerCase()}.`},
    {speaker:target,text:genderContext},
  ]};
}
export function tickStoryDirector(s:LifeState):LifeState{
  const d=s.director;
  if(d.enabled&&d.queuedCard&&!d.active&&!s.family.moment&&s.minute>=d.nextAt)return startStoryCard(s,d.queuedCard);
  if(!d.enabled||s.stage<1||s.completed||s.health<=0||d.active||s.family.moment||s.minute<d.nextAt||d.chapters[s.stage]!.length>=3)return s;
  const action=rankStoryActions(s)[0];if(!action)return s;
  const active=buildScene(s,action);
  const director={...d,active,agents:structuredClone(d.agents)};
  // Only participating agents acquire this observation; other private memories stay private.
  const observation=`${FAMILY_EPISODES[s.stage]!.beats[active.step]}: ${name(active.actor)} and ${name(active.target)} discussed ${active.goal.toLowerCase()}.`;
  for(const id of [active.actor,active.target])director.agents[id].memories=addMemory(director.agents[id].memories,observation,s.minute,'observation');
  return {...s,director,family:{...s.family,moment:{actor:active.actor,target:active.target,kind:active.kind,minute:active.minute},lastMomentMinute:s.minute},memories:[{text:observation,topic:'family-story',minute:s.minute,importance:8},...s.memories].slice(0,150)};
}
export function setStoryDirection(s:LifeState,enabled:boolean,tone:StoryTone=s.director.tone):LifeState{
  if(!['grounded','tender','chaotic'].includes(tone)||s.completed||s.health<=0)return s;
  return tickStoryDirector({...s,director:{...s.director,enabled,tone}});
}
/** Resolve only the currently presented scene ID; repeated/stale clicks are harmless. */
export function finishDirectedScene(s:LifeState,id:string,answer:DirectedResponse):LifeState{
  const scene=s.director.active;
  if(!s.director.enabled||s.completed||s.health<=0||!scene||scene.id!==id||scene.stage!==s.stage)return s;
  const card=scene.card;
  if(!(card?['answer-a','answer-b']:['repair','escalate','avoid']).includes(answer))return s;
  const selected=card?.choices[answer==='answer-a'?0:1];
  if(card&&conflictChoiceError(s,card,answer==='answer-a'?0:1))return s;
  const response:StoryResponse=selected?selected.impact:answer as StoryResponse;
  const family=structuredClone(s.family),director=structuredClone(s.director),{actor,target}=scene;
  for(const [from,to] of [[actor,target],[target,actor]] as const){const b=family.bonds[from][to]!;b.trust=cap(b.trust+(response==='repair'?6:response==='escalate'?-5:-1));b.resentment=cap(b.resentment+(response==='repair'?-8:response==='escalate'?9:2));}
  for(const member of [actor,target]){const b=family.bonds[member].self!;b.trust=cap(b.trust+(response==='repair'?4:response==='escalate'?-3:0));}
  if(card)director.playedCards.push(card.id);else director.chapters[s.stage]!.push(response);
  director.queuedCard=selected?.nextId&&!director.playedCards.includes(selected.nextId)?selected.nextId:null;
  director.active=null;director.nextAt=s.minute+60;
  family.moment=null;family.lastMomentMinute=s.minute+15;
  const episode=FAMILY_EPISODES[s.stage]!,choices=director.chapters[s.stage]!;
  const consequence=card&&isCoreConflictCard(card)?'This choice has an immediate effect and a separate cost that may surface later.':response==='repair'?'You ask for a practical change. Trust grows and resentment eases.':response==='escalate'?'You make the conflict explicit. The family gets defensive and trust suffers.':'You protect your space. The unresolved tension stays in the family.';
  const ending=!card&&choices.length===3?episode.endings[episodeEnding(choices)]:'';
  const outcome=card?`${card.title}. You chose: ${selected!.answer}. ${selected!.consequence} ${consequence}`:`${episode.title} — ${episode.beats[scene.step]}. ${episode.choices[response]}. ${consequence}${ending?' '+ending:''}`;
  director.lastOutcome=outcome;
  for(const member of [actor,target]){
    const mind=director.agents[member];mind.memories=addMemory(mind.memories,outcome,s.minute,'decision');
    mind.reflection=response==='repair'?'I can listen without surrendering everything I need.':response==='escalate'?'I feel defensive. I need to be heard before I can move on.':'The silence is not agreement. I still need to decide what to say.';
  }
  const next={...s,family,director,stageActions:s.stageActions+1,memories:[{text:outcome,topic:'family-story',minute:s.minute,importance:9},...s.memories].slice(0,150)};
  return card?applyConflictChoice(next,card,answer==='answer-a'?0:1):next;
}
export function startStoryCard(s:LifeState,id:string):LifeState{
  const card=s.director.cards.find(c=>c.id===id&&c.status==='approved');
  if(!card||s.stage<(card.minStage??1)||s.completed||s.health<=0||s.director.active||s.family.moment||s.director.playedCards.includes(id))return s;
  if(s.director.queuedCard&&s.director.queuedCard!==id)return s;
  if(conflictStartError(s,card))return s;
  const actor='older',target='younger',director=structuredClone(s.director);
  const active:DirectedScene={id:`card:${card.id}:${s.minute}`,stage:s.stage,step:0,actor,target,kind:'support',minute:s.minute,goal:'Consider the answers and what follows from them',reason:`Written by ${card.author}; consequences reviewed by ${card.reviewer}.`,recalled:conflictContext(s,card),card:structuredClone(card),lines:[{speaker:actor,text:card.question},{speaker:target,text:`One option is: ${card.choices[0].answer}`},{speaker:actor,text:`Or we could: ${card.choices[1].answer}`},{speaker:target,text:'What happens next matters as much as what we choose.'}]};
  director.enabled=true;director.active=active;director.queuedCard=null;
  for(const member of [actor,target] as const)director.agents[member].memories=addMemory(director.agents[member].memories,`We considered this dilemma: ${card.question}`,s.minute,'observation');
  return {...s,director,family:{...s.family,moment:{actor,target,kind:'support',minute:s.minute},lastMomentMinute:s.minute}};
}
/** Read-only, original diagnostic format. Not the Thistle Gulch wire protocol. */
export function storySnapshot(s:LifeState){
  return {format:'dysfunctional-family-director-v1',minute:s.minute,stage:s.stage,mode:s.director.enabled?'local-story':'free-life',tone:s.director.tone,episode:FAMILY_EPISODES[s.stage]?.title??null,active:s.director.active,conflicts:s.director.conflicts,agents:AGENT_IDS.map(id=>({id,name:name(id),...PERSONAS[id],...s.director.agents[id]})),options:rankStoryActions(s).slice(0,8),chapters:s.director.chapters};
}
