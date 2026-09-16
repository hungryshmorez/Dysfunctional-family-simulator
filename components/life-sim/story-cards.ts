export type StoryImpact='repair'|'escalate'|'avoid';
export interface StoryCard {
  version:1;minStage?:number;id:string;title:string;question:string;author:string;reviewer:string;reviewMode:'self'|'peer';
  status:'draft'|'approved';choices:[{answer:string;consequence:string;impact:StoryImpact;nextId?:string},{answer:string;consequence:string;impact:StoryImpact;nextId?:string}];
}
export function parseStoryCard(raw:unknown):StoryCard|null{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;const c=raw as StoryCard;
  const text=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
  if(c.minStage!==undefined&&(!Number.isInteger(c.minStage)||c.minStage<1||c.minStage>6))return null;
  if(c.version!==1||!text(c.id,1,80)||!/^[a-zA-Z0-9_-]+$/.test(c.id)||!text(c.title,1,100)||!text(c.question,10,500)||!text(c.author,1,40)||!text(c.reviewer,0,40)||!['self','peer'].includes(c.reviewMode)||!['draft','approved'].includes(c.status)||!Array.isArray(c.choices)||c.choices.length!==2)return null;
  if(!c.choices.every(o=>o&&typeof o==='object'&&text(o.answer,2,180)&&text(o.consequence,c.status==='approved'?10:0,500)&&['repair','escalate','avoid'].includes(o.impact)))return null;
  if(c.choices[0].answer.trim().toLowerCase()===c.choices[1].answer.trim().toLowerCase())return null;
  if(c.choices.some(o=>o.nextId!==undefined&&(!text(o.nextId,1,80)||!/^[a-zA-Z0-9_-]+$/.test(o.nextId)||o.nextId===c.id)))return null;
  if(c.status==='approved'&&(!c.reviewer.trim()||c.reviewMode==='peer'&&c.reviewer.trim().toLowerCase()===c.author.trim().toLowerCase()))return null;
  return {version:1,...(c.minStage!==undefined?{minStage:c.minStage}:{}),id:c.id,title:c.title,question:c.question,author:c.author,reviewer:c.reviewer,reviewMode:c.reviewMode,status:c.status,choices:c.choices.map(o=>({answer:o.answer,consequence:o.consequence,impact:o.impact,...(o.nextId?{nextId:o.nextId}:{})})) as StoryCard['choices']};
}
export function storyLinkError(cards:StoryCard[]):string|null{
  const byId=new Map(cards.map(c=>[c.id,c]));
  for(const c of cards)for(const choice of c.choices)if(choice.nextId&&byId.get(choice.nextId)?.status!=='approved')return `The follow-up for “${c.title}” is missing or not approved.`;
  for(const c of cards)for(const choice of c.choices)if(choice.nextId&&(byId.get(choice.nextId)!.minStage??1)>(c.minStage??1))return `“${c.title}” starts too young for its follow-up. Set its earliest life stage to match.`;
  const visiting=new Set<string>(),done=new Set<string>();
  function cycle(id:string):boolean{if(visiting.has(id))return true;if(done.has(id))return false;visiting.add(id);for(const choice of byId.get(id)!.choices)if(choice.nextId&&cycle(choice.nextId))return true;visiting.delete(id);done.add(id);return false;}
  return cards.some(c=>cycle(c.id))?'Follow-up links must not form a loop.':null;
}
export function exportStoryPack(cards:StoryCard[],rootId:string){
  const selected:StoryCard[]=[],seen=new Set<string>();
  function visit(id:string){if(seen.has(id))return;seen.add(id);const card=cards.find(c=>c.id===id);if(!card)throw new Error('A linked scene is missing.');selected.push(card);for(const choice of card.choices)if(choice.nextId)visit(choice.nextId);}
  visit(rootId);const error=storyLinkError(selected);if(error)throw new Error(error);
  return {format:'family-story-pack-v1',rootId,cards:selected};
}
export function blankStoryCard(author:string,id:string):StoryCard{
  return {version:1,id,title:'A difficult favor',question:'Your sibling asks you to cover for a mistake. What do you do?',author,reviewer:author,reviewMode:'self',status:'draft',choices:[{answer:'Help them tell the truth',consequence:'',impact:'repair'},{answer:'Cover it up this time',consequence:'',impact:'avoid'}]};
}
