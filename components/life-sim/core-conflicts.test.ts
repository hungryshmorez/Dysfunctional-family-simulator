import {expect,it} from 'vitest';
import {coreConflictCatalog,conflictChoiceError,newConflicts,parseConflicts} from './core-conflicts';
import {newLife,chooseDirectedStory,parseLife,passTime} from './engine';
import {startStoryCard,rankStoryActions} from './story-director';
import {importStoryCard} from './story-workshop';
function ready(key:string,money=2000){const pack=coreConflictCatalog().find(e=>e.key===`core-${key}`)!.pack;return startStoryCard(importStoryCard({...newLife(),stage:3,money},pack),pack.rootId);}
it('charges a loan once, rejects unaffordable loans, and preserves the delayed obligation',()=>{
  let s=ready('bailout');const id=s.director.active!.id;
  s=chooseDirectedStory(s,id,'answer-a');expect(s.money).toBe(1500);expect(s.director.conflicts.pressure.dependence).toBe(30);
  expect(s.director.conflicts.decisions.bailout?.resolved).toBe(false);
  expect(chooseDirectedStory(s,id,'answer-a')).toBe(s);
  s=parseLife(JSON.parse(JSON.stringify(s)))!;s=passTime(s,45);
  expect(s.director.active?.card?.question).toContain('not been repaid');
  s=chooseDirectedStory(s,s.director.active!.id,'answer-b');expect(s.money).toBe(1500);expect(s.director.conflicts.decisions.bailout?.resolved).toBe(true);expect(s.director.conflicts.pressure.dependence).toBe(40);
  const poor=ready('bailout',499);expect(conflictChoiceError(poor,poor.director.active!.card,0)).toContain('$500');expect(chooseDirectedStory(poor,poor.director.active!.id,'answer-a')).toBe(poor);
  expect(chooseDirectedStory(poor,poor.director.active!.id,'answer-b').money).toBe(499);
});
it('applies cancellation costs once without treating a possible emergency as a proven bluff',()=>{
  const s=ready('medical');expect(s.director.active!.card!.question).toContain('do not know');
  const n=chooseDirectedStory(s,s.director.active!.id,'answer-b');expect(n.money).toBe(1850);expect(n.director.conflicts.pressure.dependence).toBe(25);
  const poor=ready('medical',149);expect(chooseDirectedStory(poor,poor.director.active!.id,'answer-b')).toBe(poor);
});
it('makes pressure affect NPC action scores and the severity of the next fallout',()=>{
  const cool=ready('holiday');const hot=structuredClone(cool);hot.director.conflicts.pressure.secrecy=50;
  const coldScore=rankStoryActions(cool).find(a=>a.actor==='older'&&a.target==='younger'&&a.kind==='argument')!.score;
  const hotScore=rankStoryActions(hot).find(a=>a.actor==='older'&&a.target==='younger'&&a.kind==='argument')!.score;expect(hotScore).toBeGreaterThan(coldScore);
  function finish(s:typeof cool){s=chooseDirectedStory(s,s.director.active!.id,'answer-a');s=passTime(s,45);return chooseDirectedStory(s,s.director.active!.id,'answer-b');}
  const mild=finish(cool),severe=finish(hot);expect(severe.family.bonds.older.self!.resentment).toBeGreaterThan(mild.family.bonds.older.self!.resentment);expect(severe.director.lastOutcome).toContain('Earlier conflicts');
});
it('keeps sibling trust and parent approval distinct in the will conflict',()=>{
  const s=ready('will'),n=chooseDirectedStory(s,s.director.active!.id,'answer-a');
  expect(n.family.bonds.older.self!.trust).toBeGreaterThan(s.family.bonds.older.self!.trust);
  expect(n.family.bonds['parent-a'].self!.trust).toBeLessThan(s.family.bonds['parent-a'].self!.trust);expect(n.money).toBe(s.money);
});
it('prevents skipping directly to fallout and prevents playing the unchosen branch',()=>{
  const entry=coreConflictCatalog()[0]!,s=importStoryCard({...newLife(),stage:3},entry.pack);
  expect(startStoryCard(s,entry.pack.cards[1]!.id)).toBe(s);
  const started=startStoryCard(s,entry.pack.rootId);const n=chooseDirectedStory(started,started.director.active!.id,'answer-a');
  expect(startStoryCard(n,entry.pack.cards[2]!.id)).toBe(n);
});
it('migrates saves without pattern state and rejects malformed meters and records',()=>{
  const raw=JSON.parse(JSON.stringify(newLife()));delete raw.director.conflicts;expect(parseLife(raw)!.director.conflicts).toEqual(newConflicts());
  expect(parseConflicts({pressure:{scapegoating:101,secrecy:0,dependence:0},decisions:{}})).toBeNull();
  expect(parseConflicts({pressure:newConflicts().pressure,decisions:{bailout:{answer:0,minute:1,resolved:'yes'}}})).toBeNull();
});
it('does not let an altered imported card masquerade as a built-in financial effect',()=>{
  const pack=structuredClone(coreConflictCatalog().find(e=>e.key==='core-bailout')!.pack);pack.cards[0]!.question='A different question that reuses a known identifier?';
  const s={...newLife(),stage:3,money:2000};
  expect(importStoryCard(s,pack)).toBe(s);
});

it('locks core repair responses after choosing the coercive inheritance route',()=>{
  let s=ready('will-sabotage');s=chooseDirectedStory(s,s.director.active!.id,'answer-b');
  expect(s.director.conflicts.villain).toBe(true);s=parseLife(JSON.parse(JSON.stringify(s)))!;s=passTime(s,45);
  expect(chooseDirectedStory(s,s.director.active!.id,'answer-a')).toBe(s);
  expect(chooseDirectedStory(s,s.director.active!.id,'answer-b').director.conflicts.decisions['will-sabotage']!.resolved).toBe(true);
});
it('collects the short-term loan repayment once at its delayed fallout',()=>{
  let s=ready('bailout-discrepancy');s=chooseDirectedStory(s,s.director.active!.id,'answer-b');expect(s.money).toBe(2000);
  s=passTime(s,45);const id=s.director.active!.id;s=chooseDirectedStory(s,id,'answer-a');expect(s.money).toBe(1350);expect(chooseDirectedStory(s,id,'answer-a')).toBe(s);
});
it('uses existing partner trust to change the in-law support outcome',()=>{
  function finish(trust:number){let s=ready('unwanted-advice');s.partner='Rowan';s.relationships.Rowan=trust;s=chooseDirectedStory(s,s.director.active!.id,'answer-b');s=passTime(s,45);return chooseDirectedStory(s,s.director.active!.id,'answer-a');}
  expect(finish(80).director.lastOutcome).toContain('speaks up');expect(finish(10).director.lastOutcome).toContain('stays silent');
});

it('rejects forged completion records that disagree with the played path',()=>{
  let s=ready('holiday');s=chooseDirectedStory(s,s.director.active!.id,'answer-a');
  const raw=JSON.parse(JSON.stringify(s));raw.director.conflicts.decisions.holiday.resolved=true;expect(parseLife(raw)).toBeNull();
  raw.director.conflicts.decisions.holiday.resolved=false;raw.director.conflicts.villain=true;expect(parseLife(raw)).toBeNull();
});
it('allows low cash to become debt only for an explicitly deferred obligation',()=>{
  let s=ready('uninsured',100);s=chooseDirectedStory(s,s.director.active!.id,'answer-b');expect(s.money).toBe(100);
  s=passTime(s,45);s=chooseDirectedStory(s,s.director.active!.id,'answer-a');expect(s.money).toBe(-1400);expect(parseLife(JSON.parse(JSON.stringify(s)))).not.toBeNull();
});
