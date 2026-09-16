import {expect,it} from 'vitest';
import {newLife,chooseDirectedStory,parseLife,passTime} from './engine';
import {parseStoryCard,storyLinkError} from './story-cards';
import {startStoryCard} from './story-director';
import {storyEpisodeCatalog} from './story-samples';
import {importStoryCard,storyImportError} from './story-workshop';
it('ships valid self-contained episodes and unique scene content',()=>{
  const entries=storyEpisodeCatalog();expect(entries).toHaveLength(105);
  for(const entry of entries){expect(storyLinkError(entry.pack.cards)).toBeNull();for(const card of entry.pack.cards)expect(parseStoryCard(card)).not.toBeNull();}
});
it('runs both branches of every episode and persists each consequence',()=>{
  for(const entry of storyEpisodeCatalog())for(const answer of ['answer-a','answer-b'] as const){
    let s=importStoryCard({...newLife(),stage:3,money:10000},entry.pack);s=startStoryCard(s,entry.pack.rootId);
    expect(s.director.active?.card?.id).toBe(entry.pack.rootId);
    let count=0;
    while(s.director.active){
      const scene=s.director.active;const choice=scene.card!.choices[answer==='answer-a'?0:1];
      s=chooseDirectedStory(s,scene.id,answer);expect(s.director.lastOutcome).toContain(choice.consequence);
      s=parseLife(JSON.parse(JSON.stringify(s)))!;expect(s).not.toBeNull();count++;
      if(!s.director.queuedCard)break;
      expect(count).toBeLessThan(5);s=passTime(s,45);expect(s.director.active).not.toBeNull();
    }
    expect(count).toBe(entry.key==='job-loss'?4:2);
  }
});
it('keeps mature scenes gated after import and save/load, with no sample wage',()=>{
  const s=newLife();const entry=storyEpisodeCatalog().find(e=>e.key==='party')!;
  const imported=importStoryCard({...s,stage:1},entry.pack);
  expect(imported.money).toBe(s.money);const restored=parseLife(JSON.parse(JSON.stringify(imported)))!;
  expect(startStoryCard(restored,entry.pack.rootId)).toBe(restored);
  expect(startStoryCard({...restored,stage:3,money:10000},entry.pack.rootId).director.active).not.toBeNull();
});
it('reuses housing scenes shared by job loss and refuses over-capacity imports atomically',()=>{
  const entries=storyEpisodeCatalog();let s=importStoryCard(newLife(),entries.find(e=>e.key==='housing')!.pack);
  s=importStoryCard(s,entries.find(e=>e.key==='job-loss')!.pack);expect(s.director.cards).toHaveLength(6);
  for(const entry of entries){const before=s;const error=storyImportError(s,entry.pack);s=importStoryCard(s,entry.pack);if(error)expect(s).toBe(before);}
  expect(s.director.cards).toHaveLength(315);
  expect(parseLife(JSON.parse(JSON.stringify(s)))).not.toBeNull();
  const filler={...s.director.cards.find(c=>c.choices.every(a=>!a.nextId))!,id:'overflow'};
  while(s.director.cards.length<512)s.director.cards.push({...filler,id:`filler-${s.director.cards.length}`});
  const pack={format:'family-story-card-v1',card:filler};
  expect(storyImportError(s,pack)).toContain('512-story');
  expect(importStoryCard(s,pack)).toBe(s);
});

it('rejects links that would strand a younger player at an adult follow-up',()=>{
  const pack=storyEpisodeCatalog().find(e=>e.key==='party')!.pack;
  pack.cards[0]!.minStage=1;
  expect(storyLinkError(pack.cards)).toContain('too young');
  expect(importStoryCard(newLife(),pack).director.cards).toHaveLength(0);
});
