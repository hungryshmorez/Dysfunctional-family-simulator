import {expect,it} from 'vitest';
import {newLife,chooseDirectedStory,parseLife,passTime} from './engine';
import {blankStoryCard,exportStoryPack,storyLinkError,type StoryCard} from './story-cards';
import {startStoryCard} from './story-director';
import {approveStoryDraft,importStoryCard,saveStoryDraft,storyImportError} from './story-workshop';
function card(id:string):StoryCard{const c=blankStoryCard('Alex',id);c.title=id;c.status='approved';c.choices[0].consequence='The family learns to trust one another.';c.choices[1].consequence='The family keeps the disagreement to itself.';return c;}
function library(){const root=card('root'),left=card('left'),right=card('right');root.choices[0].nextId=left.id;root.choices[1].nextId=right.id;return [root,left,right];}
it('follows only the selected answer and resumes the queued path after save/load',()=>{
  for(const [answer,target] of [['answer-a','left'],['answer-b','right']] as const){
    let s={...newLife(),stage:3};s.director.cards=library();s.director.chapters[3]=['repair','repair','repair'];
    s=startStoryCard(s,'root');s=chooseDirectedStory(s,s.director.active!.id,answer);
    expect(s.director.queuedCard).toBe(target);expect(s.director.active).toBeNull();
    const loaded=parseLife(JSON.parse(JSON.stringify(s)))!;expect(loaded).not.toBeNull();
    const next=passTime(loaded,45);expect(next.director.active?.card?.id).toBe(target);expect(next.director.queuedCard).toBeNull();
    const done=chooseDirectedStory(next,next.director.active!.id,'answer-a');expect(done.director.queuedCard).toBeNull();expect(done.director.playedCards).toEqual(['root',target]);
  }
});
it('exports complete branches and imports them atomically without wages',()=>{
  const cards=library(),pack=exportStoryPack(cards,'root'),s=newLife();
  expect(pack.cards).toHaveLength(3);const imported=importStoryCard(s,pack);expect(imported.director.cards).toHaveLength(3);expect(imported.money).toBe(s.money);
  expect(importStoryCard(imported,pack)).toBe(imported);
  const conflict={...imported,director:{...imported.director,cards:[{...cards[0]!,title:'My existing version'}]}};
  expect(storyImportError(conflict,pack)).toContain('different story');expect(importStoryCard(conflict,pack)).toBe(conflict);
  const partial={...s,director:{...s.director,cards:[cards[1]!]}};
  expect(importStoryCard(partial,pack).director.cards).toHaveLength(3);
});
it('rejects missing scenes and cycles without changing the library',()=>{
  const cards=library();expect(storyLinkError([cards[0]!])).toContain('missing');
  const s=newLife();expect(importStoryCard(s,{format:'family-story-card-v1',card:cards[0]})).toBe(s);
  cards[1]!.choices[0].nextId='root';expect(storyLinkError(cards)).toContain('loop');
  expect(importStoryCard(s,{format:'family-story-pack-v1',rootId:'root',cards})).toBe(s);
  expect(parseLife({...s,director:{...s.director,cards}})).toBeNull();
});
it('review saves valid branch links and requires approved follow-ups',()=>{
  const s={...newLife(),stage:3,job:'story-editor'};s.director.cards=[card('ending')];
  const root=card('beginning');root.status='draft';const saved=saveStoryDraft(s,root);
  const choices=structuredClone(root.choices);choices[0].nextId='missing';expect(approveStoryDraft(saved,root.id,'Alex',choices)).toBe(saved);
  choices[0].nextId='ending';const approved=approveStoryDraft(saved,root.id,'Alex',choices);
  expect(approved.director.cards.find(c=>c.id===root.id)!.choices[0].nextId).toBe('ending');expect(approved.money).toBe(s.money+120);
  expect(parseLife(JSON.parse(JSON.stringify(approved)))).not.toBeNull();
});
it('migrates old saves and rejects invalid queued targets',()=>{
  const raw=JSON.parse(JSON.stringify(newLife()));delete raw.director.queuedCard;
  expect(parseLife(raw)!.director.queuedCard).toBeNull();
  raw.director.queuedCard='missing';expect(parseLife(raw)).toBeNull();
});
it('accepts a returned review of the same draft without paying the original author again',()=>{
  const draft=card('review-me');draft.status='draft';draft.reviewMode='peer';draft.reviewer='';
  const s=newLife();s.director.cards=[draft];
  const approved={...draft,status:'approved' as const,reviewer:'Jordan'};
  const merged=importStoryCard(s,{format:'family-story-card-v1',card:approved});
  expect(merged.director.cards).toHaveLength(1);expect(merged.director.cards[0]!.status).toBe('approved');expect(merged.money).toBe(s.money);
  const changed={...approved,question:'A replacement question from a different author?'};
  expect(importStoryCard(s,{format:'family-story-card-v1',card:changed})).toBe(s);
});
