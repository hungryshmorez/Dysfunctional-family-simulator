import {conflictLibraryError} from './core-conflicts';
import {passTime,remember,type LifeState} from './engine';
import {parseStoryCard,storyLinkError,type StoryCard} from './story-cards';

export function saveStoryDraft(s:LifeState,raw:unknown):LifeState{
  const card=parseStoryCard(raw);
  if(!card||card.status!=='draft'||s.job!=='story-editor'||s.stage<3||s.completed||s.health<=0||s.director.cards.length>=512||s.director.cards.some(c=>c.id===card.id))return s;
  if(storyLinkError([...s.director.cards,card])||conflictLibraryError([...s.director.cards,card]))return s;
  return {...s,director:{...s.director,cards:[...s.director.cards,card]}};
}
export function approveStoryDraft(s:LifeState,id:string,reviewer:string,consequences:StoryCard['choices']):LifeState{
  const stored=s.director.cards.find(c=>c.id===id);
  if(!stored||stored.status!=='draft'||s.job!=='story-editor'||s.stage<3||s.completed||s.health<=0||s.needs.energy<15||s.director.paidCards.includes(id))return s;
  if(!Array.isArray(consequences)||consequences.length!==2)return s;
  // Review changes consequences, never silently replaces another author's answers.
  const card=parseStoryCard({...stored,status:'approved',reviewer,choices:stored.choices.map((c,i)=>({...c,consequence:consequences[i]?.consequence,impact:consequences[i]?.impact,nextId:consequences[i]?.nextId}))});
  if(!card)return s;
  if(storyLinkError(s.director.cards.map(c=>c.id===id?card:c))||conflictLibraryError(s.director.cards.map(c=>c.id===id?card:c)))return s;
  const n=passTime(s,60);
  return remember({...n,money:n.money+120,shifts:n.shifts+1,stageActions:n.stageActions+1,skills:{...n.skills,creativity:n.skills.creativity+1},director:{...n.director,cards:n.director.cards.map(c=>c.id===id?card:c),paidCards:[...n.director.paidCards,id]}},`Completed a story-editor assignment: ${card.title}. ${card.author} wrote the answers; ${card.reviewer} reviewed their consequences. Earned $120.`,'career',8);
}
export function importStoryCard(s:LifeState,raw:unknown):LifeState{
  const incoming=readStoryImport(raw);if(!incoming||storyImportError(s,raw))return s;
  const fresh=incoming.filter(card=>!s.director.cards.some(c=>c.id===card.id));
  const updated=s.director.cards.map(card=>incoming.find(c=>c.id===card.id&&reviewedSuccessor(card,c))??card);
  return {...s,director:{...s.director,cards:[...updated,...fresh]}};
}
function reviewedSuccessor(before:StoryCard,after:StoryCard):boolean{
  return before.status==='draft'&&after.status==='approved'&&before.id===after.id&&before.minStage===after.minStage&&before.title===after.title&&before.question===after.question&&before.author===after.author&&before.reviewMode===after.reviewMode&&before.choices.every((choice,i)=>choice.answer===after.choices[i]!.answer);
}
export function readStoryImport(raw:unknown):StoryCard[]|null{
  if(!raw||typeof raw!=='object')return null;
  const data=raw as {format?:unknown;card?:unknown;cards?:unknown;rootId?:unknown};
  const values=data.format==='family-story-card-v1'?[data.card]:data.format==='family-story-pack-v1'&&Array.isArray(data.cards)?data.cards:null;
  if(!values||!values.length||values.length>512)return null;
  const cards=values.map(parseStoryCard);if(cards.some(c=>!c))return null;
  const valid=cards as StoryCard[];
  if(new Set(valid.map(c=>c.id)).size!==valid.length||data.format==='family-story-pack-v1'&&!valid.some(c=>c.id===data.rootId))return null;
  return valid;
}
export function storyImportError(s:LifeState,raw:unknown):string|null{
  const cards=readStoryImport(raw);if(!cards)return 'This is not a valid story card or episode pack.';
  for(const card of cards){const existing=s.director.cards.find(c=>c.id===card.id);if(existing&&!reviewedSuccessor(existing,card)&&JSON.stringify(parseStoryCard(existing))!==JSON.stringify(card))return 'A different story already uses one of these IDs. Your saved version was kept.';}
  const fresh=cards.filter(c=>!s.director.cards.some(existing=>existing.id===c.id));
  const updated=s.director.cards.map(card=>cards.find(c=>c.id===card.id&&reviewedSuccessor(card,c))??card);
  if(!fresh.length&&!updated.some((card,i)=>card!==s.director.cards[i]))return 'These stories are already in your library.';
  if(s.director.cards.length+fresh.length>512)return 'This episode will not fit in your 512-story library.';
  return conflictLibraryError([...updated,...fresh])??storyLinkError([...updated,...fresh]);
}
