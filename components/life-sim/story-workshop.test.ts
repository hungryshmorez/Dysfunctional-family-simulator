import {expect,it} from 'vitest';
import {chooseDirectedStory,finishActivity,newLife,parseLife} from './engine';
import {blankStoryCard,parseStoryCard} from './story-cards';
import {startStoryCard} from './story-director';
import {approveStoryDraft,importStoryCard,saveStoryDraft} from './story-workshop';

const editor=()=>({...newLife('Alex'),stage:3,job:'story-editor'});
const draft=()=>{const card=blankStoryCard('Alex','test-card');card.choices[0].consequence='Your sibling accepts responsibility and trusts you more.';card.choices[1].consequence='The mistake stays hidden, but your sibling now expects you to keep the secret.';return card;};
it('requires both repercussions and pays an approved assignment exactly once',()=>{
  const s=saveStoryDraft(editor(),blankStoryCard('Alex','test-card'));
  expect(approveStoryDraft(s,'test-card','Alex',s.director.cards[0]!.choices)).toBe(s);
  const n=approveStoryDraft(s,'test-card','Alex',draft().choices);
  expect(n.money).toBe(s.money+120);expect(n.minute).toBe(s.minute+60);expect(n.shifts).toBe(1);expect(n.skills.creativity).toBe(1);
  expect(approveStoryDraft(n,'test-card','Alex',draft().choices)).toBe(n);
  expect(finishActivity(n,'work')).toBe(n);expect(parseLife(JSON.parse(JSON.stringify(n)))).not.toBeNull();
});
it('supports a different reviewer without letting them replace the answers',()=>{
  const card=draft();card.reviewMode='peer';const s=saveStoryDraft(editor(),card);
  expect(approveStoryDraft(s,card.id,'alex',card.choices)).toBe(s);
  const changed=structuredClone(card.choices);changed[0].answer='An unauthorized replacement';
  const n=approveStoryDraft(s,card.id,'Jordan',changed);
  expect(n.director.cards[0]!.choices[0].answer).toBe(card.choices[0].answer);expect(n.director.cards[0]!.reviewer).toBe('Jordan');
});
it('plays approved cards through the director and preserves ordinary chapter progress',()=>{
  const approved=approveStoryDraft(saveStoryDraft(editor(),draft()),'test-card','Alex',draft().choices);
  const playing=startStoryCard(approved,'test-card');expect(playing.director.active?.card?.title).toBe(draft().title);
  expect(parseLife(JSON.parse(JSON.stringify(playing)))).not.toBeNull();
  const done=chooseDirectedStory(playing,playing.director.active!.id,'answer-a');
  expect(done.director.lastOutcome).toContain(draft().choices[0].consequence);
  expect(done.director.playedCards).toContain('test-card');expect(done.director.chapters[3]).toEqual([]);
  expect(startStoryCard(done,'test-card')).toBe(done);expect(parseLife(JSON.parse(JSON.stringify(done)))).not.toBeNull();
});
it('shares drafts and approved stories without granting an import wage',()=>{
  const s=editor(),card=draft();const imported=importStoryCard(s,{format:'family-story-card-v1',card});
  expect(imported.money).toBe(s.money);expect(importStoryCard(imported,{format:'family-story-card-v1',card})).toBe(imported);
  expect(startStoryCard(imported,card.id)).toBe(imported);
  expect(importStoryCard(s,{format:'wrong',card})).toBe(s);
});
it('rejects incomplete or unsafe-shaped cards and ineligible job actions',()=>{
  expect(parseStoryCard({...draft(),id:'../../file'})).toBeNull();
  expect(parseStoryCard({...draft(),choices:[draft().choices[0],draft().choices[0]]})).toBeNull();
  expect(parseStoryCard({...draft(),choices:[{...draft().choices[0],impact:'execute-code'},draft().choices[1]]})).toBeNull();
  const s=newLife();expect(saveStoryDraft(s,draft())).toBe(s);
  const tired={...saveStoryDraft(editor(),draft()),needs:{...editor().needs,energy:0}};expect(approveStoryDraft(tired,'test-card','Alex',draft().choices)).toBe(tired);
});
