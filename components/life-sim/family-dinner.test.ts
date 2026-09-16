import {expect,it} from 'vitest';
import {newLife,parseLife} from './engine';
import {DEFAULT_SEATS,dinnerTension,familyDinner} from './family-dinner';
import {starterHome} from './home';
it('seating changes whether favoritism starts an argument',()=>{
  const s={...newLife(),stage:1},home=starterHome();
  expect(dinnerTension(s,DEFAULT_SEATS)).toBeGreaterThan(dinnerTension(s,['parent-a','self','parent-b','older','younger']));
  expect(familyDinner(s,home,DEFAULT_SEATS,'sides').memories[0]!.text).toContain('argument');
  expect(familyDinner(s,home,['parent-a','self','parent-b','older','younger'],'sides').memories[0]!.text).toContain('stays civil');
});
it('changes relationships between relatives and persists the daily limit',()=>{
  const s={...newLife(),stage:1},home=starterHome(),n=familyDinner(s,home,DEFAULT_SEATS,'include');
  expect(n.family.bonds['parent-a'].older!.trust).toBeGreaterThan(s.family.bonds['parent-a'].older!.trust);
  expect(n.money).toBe(s.money-20);expect(n.minute).toBe(s.minute+60);expect(s.family.lastDinnerDay).toBe(-1);
  const loaded=parseLife(JSON.parse(JSON.stringify(n)))!;expect(familyDinner(loaded,home,DEFAULT_SEATS,'sides')).toBe(loaded);
});
it('rejects invalid seating and unaffordable dinners without mutating progress',()=>{
  const s={...newLife(),stage:1},home=starterHome();expect(familyDinner(s,home,['self','self','older','younger','parent-a'],'include')).toBe(s);
  const poor={...s,money:0};expect(familyDinner(poor,home,DEFAULT_SEATS,'include')).toBe(poor);
  const midnight=familyDinner({...s,minute:1430},home,DEFAULT_SEATS,'include');expect(midnight.family.lastDinnerDay).toBe(2);
});
