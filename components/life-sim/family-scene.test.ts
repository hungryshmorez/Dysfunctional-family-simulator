import {expect,it} from 'vitest';
import {stagingFamilyScene,updateFamilyScene} from './family-scene';
import {blocked} from './navigation';
import {blankDesign} from './properties';
import type {FamilyMoment} from './family';
const home=blankDesign();
const moment:FamilyMoment={kind:'argument',actor:'older',target:'younger',minute:600};
const input=()=>({moment,actor:{x:-2,z:0},target:{x:2,z:0},interrupted:false,dt:.1,floor:structuredClone(home.floors[0]!),width:home.width,depth:home.height});

it('approaches without occupying the other relative or crossing obstacles',()=>{
  const i=input(),scene=updateFamilyScene(null,i)!;
  expect(scene.phase).toBe('approaching');expect(stagingFamilyScene(scene)).toBe(true);
  expect(scene.path.every(p=>!blocked(p,i.floor,i.width,i.depth))).toBe(true);
  const end=scene.path.at(-1)!;expect(Math.hypot(end.x-i.target.x,end.z-i.target.z)).toBeGreaterThan(.7);
  expect(Math.hypot(end.x-i.target.x,end.z-i.target.z)).toBeLessThan(1.4);
});
it('finishes once after arrival without replaying the same unresolved event',()=>{
  const i=input(),walking=updateFamilyScene(null,i)!;
  // The world consumes this route before the speaking timer starts.
  const talking=updateFamilyScene({...walking,path:[]},i)!;expect(talking.phase).toBe('talking');
  expect(updateFamilyScene(talking,{...i,dt:0})!.elapsed).toBe(0);
  const finished=updateFamilyScene(talking,{...i,dt:18})!;expect(finished.phase).toBe('finished');
  expect(stagingFamilyScene(finished)).toBe(false);expect(updateFamilyScene(finished,i)).toBe(finished);
  expect(updateFamilyScene(finished,{...i,moment:{...moment,minute:900}})!.phase).toBe('approaching');
});
it('yields to player conversation and replans from current positions',()=>{
  const i=input(),initial=updateFamilyScene(null,i)!;
  const interrupted=updateFamilyScene(initial,{...i,interrupted:true})!;
  expect(interrupted.phase).toBe('interrupted');expect(interrupted.path).toEqual([]);
  const target={x:-1,z:2},resumed=updateFamilyScene(interrupted,{...i,target})!;
  expect(resumed.phase).toBe('approaching');
  const end=resumed.path.at(-1)!;expect(Math.hypot(end.x-target.x,end.z-target.z)).toBeLessThan(1.4);
  expect(updateFamilyScene(resumed,{...i,moment:null})).toBeNull();
});
it('leaves inaccessible scenes unstaged rather than talking through walls',()=>{
  const i=input();i.floor.interiorWalls=[{id:'closed',x1:0,z1:-5,x2:0,z2:5}];
  const scene=updateFamilyScene(null,i)!;expect(scene.phase).toBe('blocked');expect(scene.path).toEqual([]);
  expect(stagingFamilyScene(scene)).toBe(false);expect(updateFamilyScene(scene,i)).toBe(scene);
});
