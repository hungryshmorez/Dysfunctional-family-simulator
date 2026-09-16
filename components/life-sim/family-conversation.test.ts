import {expect,it} from 'vitest';
import {newLife,parseLife} from './engine';
import {familyConversation,resolveFamilyConversation} from './family-conversation';
import {familyDinner,DEFAULT_SEATS} from './family-dinner';
import {starterHome} from './home';

it('recalls dinner and changes parent treatment of both overlooked children',()=>{
  const s=familyDinner({...newLife(),stage:1},starterHome(),DEFAULT_SEATS,'sides');
  expect(familyConversation(s,'parent-a')!.memory).toContain('argument');
  const n=resolveFamilyConversation(s,'parent-a','confront');
  expect(n.family.bonds['parent-a'].self!.affection).toBe(s.family.bonds['parent-a'].self!.affection+5);
  expect(n.family.bonds['parent-a'].younger!.affection).toBe(s.family.bonds['parent-a'].younger!.affection+5);
  expect(n.family.bonds['parent-a'].older).toEqual(s.family.bonds['parent-a'].older);
  expect(n.minute).toBe(s.minute+30);
});
it('guarded relatives resist confrontation and recover slowly',()=>{
  const s={...newLife(),stage:1};s.family.bonds.older.self!.resentment=50;
  const challenged=resolveFamilyConversation(s,'older','confront');
  expect(challenged.family.bonds.older.self!.resentment).toBe(55);
  const repaired=resolveFamilyConversation(s,'older','repair');
  expect(repaired.family.bonds.older.self!.resentment).toBe(48);
  expect(s.family.bonds.older.self!.resentment).toBe(50);
  expect(resolveFamilyConversation(s,'older','withdraw').family.bonds.self.older!.resentment).toBe(4);
});
it('persists per-relative cooldowns, allows other relatives and handles midnight',()=>{
  const s=resolveFamilyConversation({...newLife(),stage:1,minute:1430},'older','repair');
  const loaded=parseLife(JSON.parse(JSON.stringify(s)))!;
  expect(loaded.family.conversationDays.older).toBe(2);
  expect(resolveFamilyConversation(loaded,'older','repair')).toBe(loaded);
  expect(resolveFamilyConversation(loaded,'parent-a','repair')).not.toBe(loaded);
  const tomorrow={...loaded,minute:2880};expect(resolveFamilyConversation(tomorrow,'older','repair')).not.toBe(tomorrow);
});
it('migrates older saves and rejects invalid cooldown records and ineligible actions',()=>{
  const raw=JSON.parse(JSON.stringify(newLife()));delete raw.family.conversationDays;
  expect(parseLife(raw)!.family.conversationDays).toEqual({});
  raw.family.conversationDays={older:-1};expect(parseLife(raw)).toBeNull();
  raw.family.conversationDays={intruder:1};expect(parseLife(raw)).toBeNull();
  const infant=newLife();expect(resolveFamilyConversation(infant,'older','repair')).toBe(infant);
  const dead={...infant,stage:1,health:0};expect(resolveFamilyConversation(dead,'older','repair')).toBe(dead);
  const adult={...infant,stage:3};expect(resolveFamilyConversation(adult,'self','repair')).toBe(adult);
});
