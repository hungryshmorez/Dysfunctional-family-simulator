import {expect,it} from 'vitest';
import {dialogueAt,dialogueDuration} from './dialogue-timing';
import {chooseDirectedStory,newLife,parseLife,passTime,resolveHouseholdMoment,stageRequirement} from './engine';
import {episodeEnding,rankStoryActions,setStoryDirection,tickStoryDirector} from './story-director';
import {AGENT_IDS,type StoryResponse} from './story-director-state';
import {FAMILY_EPISODES} from './story-episodes';

const child=()=>({...newLife(),stage:1});
it('gives longer dialogue enough caption time and ends cleanly',()=>{
  const lines=[{speaker:'older' as const,text:'I hear you.'},{speaker:'younger' as const,text:'This takes time to explain. '.repeat(10)}];
  expect(dialogueAt(lines,0)?.speaker).toBe('older');expect(dialogueAt(lines,4)?.speaker).toBe('younger');
  expect(dialogueDuration(lines)).toBeGreaterThan(18);expect(dialogueAt(lines,dialogueDuration(lines))).toBeNull();
});
it('starts a real scene and keeps it synchronized with household staging',()=>{
  const s=setStoryDirection(child(),true),scene=s.director.active!;
  expect(scene.lines).toHaveLength(4);expect(scene.actor).not.toBe(scene.target);
  expect(s.family.moment).toMatchObject({actor:scene.actor,target:scene.target,minute:scene.minute});
  expect(resolveHouseholdMoment(s,'leave')).toBe(s);
  expect(tickStoryDirector(s)).toBe(s);
  expect(parseLife(JSON.parse(JSON.stringify(s)))?.director).toEqual(s.director);
});
it('branches subsequent dialogue, applies consequences once, and remembers only what agents witnessed',()=>{
  const s=setStoryDirection(child(),true),scene=s.director.active!;
  const n=chooseDirectedStory(s,scene.id,'repair');
  expect(n.family.bonds[scene.actor][scene.target]!.trust).toBe(s.family.bonds[scene.actor][scene.target]!.trust+6);
  expect(n.director.active).toBeNull();expect(n.family.moment).toBeNull();expect(n.minute).toBe(s.minute+15);
  expect(chooseDirectedStory(n,scene.id,'escalate')).toBe(n);
  for(const id of AGENT_IDS)expect(n.director.agents[id].memories.length).toBe([scene.actor,scene.target].includes(id)?2:0);
  const next=passTime(n,45);expect(next.director.active!.step).toBe(1);
  expect(next.director.active!.lines[0]!.text).toContain('asked us to listen');
  expect(next.director.active!.recalled).toBeTruthy();
  expect(chooseDirectedStory(next,scene.id,'repair')).toBe(next);
});
it('tone and existing grudges change scored action selection',()=>{
  const s=child();const tender=rankStoryActions(setStoryDirection(s,false,'tender'))[0]!;
  const chaotic=rankStoryActions(setStoryDirection(s,false,'chaotic'))[0]!;
  expect(tender.kind).toBe('support');expect(chaotic.kind).toBe('argument');
  s.family.bonds.older.younger!.resentment=100;s.family.bonds.older.younger!.trust=0;
  expect(rankStoryActions(s)[0]).toMatchObject({actor:'older',target:'younger',kind:'argument'});
});
it('finishes all six episodes with persistent, distinct endings for three response routes',()=>{
  const endings=new Set<string>();
  for(let stage=1;stage<=6;stage++)for(const response of ['repair','escalate','avoid'] as StoryResponse[]){
    let s=setStoryDirection({...newLife(),stage},true);
    for(let beat=0;beat<3;beat++){
      const scene=s.director.active!;expect(scene.step).toBe(beat);
      s=chooseDirectedStory(s,scene.id,response);
      expect(parseLife(JSON.parse(JSON.stringify(s)))).not.toBeNull();
      if(beat<2)s=passTime(s,45);
    }
    const expected=FAMILY_EPISODES[stage]!.endings[episodeEnding(s.director.chapters[stage]!)];
    expect(s.director.lastOutcome).toContain(expected);endings.add(expected);
    expect(tickStoryDirector(s).director.active).toBeNull();
  }
  expect(endings.size).toBe(18);
});
it('pauses without losing a scene and yields to an already pending household moment',()=>{
  const s=setStoryDirection(child(),true),paused=setStoryDirection(s,false);
  expect(chooseDirectedStory(paused,s.director.active!.id,'repair')).toBe(paused);
  expect(passTime(paused,300).director.active).toEqual(s.director.active);
  expect(stageRequirement(paused)).toContain('open family story');
  const resumed=setStoryDirection(paused,true);expect(resumed.director.active).toEqual(s.director.active);
  const occupied=child();occupied.family.lastMomentMinute=occupied.minute;occupied.family.moment={kind:'support',actor:'older',target:'younger',minute:occupied.minute};
  const enabled=setStoryDirection(occupied,true);expect(enabled.director.active).toBeNull();
  const cleared=resolveHouseholdMoment(enabled,'join');expect(cleared.director.active).not.toBeNull();
});
it('migrates older saves and rejects malformed or inconsistent director state',()=>{
  const raw=JSON.parse(JSON.stringify(child()));delete raw.director;expect(parseLife(raw)!.director.enabled).toBe(false);
  const started=setStoryDirection(child(),true);
  for(const corrupt of [
    {...started,director:{...started.director,chapters:[[]]}},
    {...started,director:{...started.director,active:{...started.director.active,actor:'intruder'}}},
    {...started,family:{...started.family,moment:null}},
    {...started,director:{...started.director,active:{...started.director.active,step:2}}},
  ])expect(parseLife(corrupt)).toBeNull();
});
it('does not start or resolve scenes for infancy, ended lives or invalid responses',()=>{
  expect(setStoryDirection(newLife(),true).director.active).toBeNull();
  const s=setStoryDirection(child(),true),dead={...s,health:0};
  expect(chooseDirectedStory(dead,s.director.active!.id,'repair')).toBe(dead);
  expect(chooseDirectedStory(s,s.director.active!.id,'invented' as StoryResponse)).toBe(s);
  const completed={...s,completed:true};expect(tickStoryDirector(completed)).toBe(completed);
});
