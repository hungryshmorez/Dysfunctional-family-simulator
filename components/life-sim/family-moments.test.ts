import {expect,it} from 'vitest';
import {newLife,parseLife,passTime,resolveHouseholdMoment} from './engine';
import {resolveFamilyConversation} from './family-conversation';
import {familyDinner,DEFAULT_SEATS} from './family-dinner';
import {familyMood} from './family-mood';
import {starterHome} from './home';

const child=()=>({...newLife(),stage:1});
it('starts independent moments on the game clock and never queues a backlog',()=>{
  const s=passTime(child(),1);expect(s.family.moment).toBeNull();
  const n=passTime(s,180);expect(n.family.moment).not.toBeNull();
  const later=passTime(n,1440);expect(later.family.moment).toEqual(n.family.moment);
  expect(later.memories.filter(m=>m.topic==='family-moment')).toHaveLength(1);
  const loaded=parseLife(JSON.parse(JSON.stringify(later)))!;expect(loaded.family.moment).toEqual(n.family.moment);
  expect(s.family.moment).toBeNull();
});
it('tension starts arguments and taking sides has asymmetric consequences',()=>{
  const s=child();s.family.lastMomentMinute=480;s.family.bonds.older.younger!.resentment=40;
  const n=passTime(s,180);expect(n.family.moment).toMatchObject({kind:'argument',actor:'older',target:'younger'});
  expect(n.family.bonds.older.younger!.resentment).toBe(46);
  expect(familyMood(n.family,'older',1)).toBe('angry');
  const ended=resolveHouseholdMoment(n,'side');expect(ended.family.moment).toBeNull();
  expect(ended.family.bonds.older.self!.trust).toBe(65);expect(ended.family.bonds.younger.self!.resentment).toBe(8);
  expect(ended.minute).toBe(n.minute+15);expect(resolveHouseholdMoment(ended,'side')).toBe(ended);
  expect(passTime(ended,179).family.moment).toBeNull();
});
it('support improves relatives without input and can include the player',()=>{
  const s=child();s.family.lastMomentMinute=480;const n=passTime(s,240),moment=n.family.moment!;
  expect(moment.kind).toBe('support');expect(n.family.bonds[moment.actor][moment.target]!.trust).toBe(63);
  const joined=resolveHouseholdMoment(n,'join');expect(joined.family.bonds[moment.actor].self!.trust).toBe(63);
  expect(familyMood(n.family,moment.actor,1)).toBe('warm');
  expect(resolveHouseholdMoment(n,'side')).toBe(n);
});
it('mediation needs trust and leaving preserves the autonomous consequences',()=>{
  const s=child();s.family.lastMomentMinute=480;s.family.bonds.older.younger!.resentment=40;
  const n=passTime(s,180);expect(resolveHouseholdMoment(n,'mediate').family.bonds.older.younger!.resentment).toBe(38);
  expect(resolveHouseholdMoment(n,'leave').family.bonds.older.younger).toEqual(n.family.bonds.older.younger);
  n.family.bonds.older.self!.trust=10;n.family.bonds.younger.self!.trust=10;
  expect(resolveHouseholdMoment(n,'mediate').family.bonds.older.self!.resentment).toBe(3);
});
it('unequal parental attention can start conflict before grudges build',()=>{
  const s={...child(),minute:900};s.family.lastMomentMinute=900;
  expect(passTime(s,180).family.moment).toMatchObject({kind:'argument',actor:'parent-a',target:'younger'});
  s.family.bonds['parent-a'].younger!.affection=85;
  expect(passTime(s,180).family.moment!.kind).toBe('support');
});
it('preserves moments when dinner and conversation skip across their due time',()=>{
  const s=child();s.family.lastMomentMinute=320;
  expect(familyDinner(s,starterHome(),DEFAULT_SEATS,'include').family.moment).not.toBeNull();
  expect(resolveFamilyConversation(s,'older','repair').family.moment).not.toBeNull();
});
it('migrates old saves, validates moment records and excludes ended or infant lives',()=>{
  const raw=JSON.parse(JSON.stringify(child()));delete raw.family.lastMomentMinute;delete raw.family.moment;
  expect(parseLife(raw)!.family.moment).toBeNull();
  raw.family.moment={kind:'argument',actor:'self',target:'older',minute:480};expect(parseLife(raw)).toBeNull();
  raw.family.moment=false;expect(parseLife(raw)).toBeNull();
  expect(passTime(newLife(),1000).family.moment).toBeNull();
  const dead={...child(),health:0};expect(passTime(dead,1000)).toBe(dead);
  const ended={...child(),completed:true};expect(passTime(ended,1000)).toBe(ended);
});
