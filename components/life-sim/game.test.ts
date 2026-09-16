import { describe, expect, it } from 'vitest';
import { validVisit, websiteUrl } from './bridge';
import { advanceStage, applyForJob, askPartner, chooseStory, claimVisit, finishActivity, goOnDate, hurt, newLife, parseLife, passTime } from './engine';
import { starterHome } from './home';
import { blocked, findPath } from './navigation';
import { blankDesign, contractErrors, emptyProperties, parseProperties, placeBlueprint, saveBlueprint } from './properties';

describe('life progression',()=>{
  it('plays all seven chapters with activities and paid work',()=>{
    let s=newLife();
    for(let stage=0;stage<7;stage++){
      expect(s.stage).toBe(stage);
      for(let i=0;i<3;i++)s=chooseStory(s,0);
      s=finishActivity(s,'sleep');s=finishActivity(s,'eat');
      if(stage===3){s=applyForJob(s,'cafe');s=finishActivity(s,'work');}
      if(stage===4){s=finishActivity(s,'sleep');s=finishActivity(s,'work');s=finishActivity(s,'sleep');s=finishActivity(s,'work');}
      s=advanceStage(s);
    }
    expect(s.completed).toBe(true);expect(s.shifts).toBe(3);expect(s.memories.some(m=>m.topic==='legacy')).toBe(true);
  });
  it('freezes a dead life and caps recovery',()=>{const s=hurt(newLife(),150);expect(s.health).toBe(0);expect(passTime(s,60)).toBe(s);expect(finishActivity(s,'sleep')).toBe(s);expect(chooseStory(s,0)).toBe(s);expect(finishActivity({...newLife(),health:85},'sleep').health).toBe(100);});
  it('migrates old saves and rejects malformed health',()=>{const {health,partner,dates,...old}=newLife();expect([health,partner,dates]).toHaveLength(3);expect(parseLife(old)?.health).toBe(100);expect(parseLife({...old,health:-1})).toBeNull();});
  it('keeps social targets separate and requires friendship before dating',()=>{let s={...newLife(),stage:3};expect(goOnDate(s,'Jules','museum')).toBe(s);s=finishActivity(s,'talk','Jules');s=finishActivity(s,'talk','Jules');expect(s.relationships.Rowan).toBe(20);for(let i=0;i<3;i++)s=goOnDate(s,'Jules','museum');expect(askPartner(s,'Jules').partner).toBe('Jules');expect(goOnDate({...s,stage:2},'Jules','museum').dates.Jules).toBe(3);});
});
describe('website receipts',()=>{
  it('requires exact origin, frame, nonce and unexpired challenge',()=>{const source={},c={origin:'https://example.com',nonce:'123',expires:200};const e={source,origin:c.origin,data:{type:'yourspace:visit',nonce:'123'}};expect(validVisit(e,source,c,100)).toBe(true);expect(validVisit({...e,source:{}},source,c,100)).toBe(false);expect(validVisit({...e,origin:'https://evil.example'},source,c,100)).toBe(false);expect(validVisit({...e,data:{type:'yourspace:visit',nonce:'wrong'}},source,c,100)).toBe(false);expect(validVisit(e,source,c,201)).toBe(false);});
  it('rejects executable URLs and awards a visit only once',()=>{expect(websiteUrl('javascript:alert(1)','https://example.com')).toBeNull();const s=claimVisit(newLife());expect(claimVisit(s)).toBe(s);});
});
describe('houses',()=>{
  it('keeps essential furniture reachable across the starter home room entrances',()=>{const h=starterHome(),f=h.floors[0]!;for(const item of f.items.filter(i=>['bed','shower','toilet','fridge','stove','sofa','computer','bookshelf'].includes(i.type))){const path=findPath({x:0,z:1},item.position!,f,h.width,h.height,item);expect(path?.length,item.type).toBeGreaterThan(0);expect(path?.every(point=>!blocked(point,f,h.width,h.height)),item.type).toBe(true);}});
  it('keeps placed snapshots independent from original and shelf edits',()=>{const h=starterHome();let p=saveBlueprint(emptyProperties(),h,'My home');p=placeBlueprint(p,p.blueprints[0]!.id,0);h.floors[0]!.items=[];p.blueprints[0]!.layout.name='Edited';expect(p.lots[0]!.layout.name).toBe('My home');expect(p.lots[0]!.layout.floors[0]!.items.length).toBeGreaterThan(0);expect(parseProperties(JSON.parse(JSON.stringify(p)))).not.toBeNull();});
  it('enforces the client budget and accepts an affordable usable home',()=>{expect(contractErrors(blankDesign()).length).toBe(4);const h=starterHome();expect(contractErrors(h)).toContain('Keep furnishings within the $8,000 client budget.');h.floors[0]!.items=h.floors[0]!.items.filter(i=>['bed','fridge','shower','computer'].includes(i.type));expect(contractErrors(h)).toEqual([]);});
  it('blocks walls and furniture while providing a path to the computer',()=>{const h=starterHome(),floor=h.floors[0]!,computer=floor.items.find(i=>i.type==='computer')!;expect(blocked({x:9,z:0},floor,h.width,h.height)).toBe(true);expect(blocked(computer.position!,floor,h.width,h.height)).toBe(true);const path=findPath({x:0,z:1},computer.position!,floor,h.width,h.height,computer);expect(path?.length).toBeGreaterThan(0);expect(path?.every(p=>!blocked(p,floor,h.width,h.height))).toBe(true);});
});
