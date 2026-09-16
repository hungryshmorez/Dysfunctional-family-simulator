import { describe,expect,it } from 'vitest';
import { blocked } from './navigation';
import { blankDesign } from './properties';
import { conversationPath } from './social-navigation';

describe('walking to people',()=>{
  it('stops beside a person instead of occupying their position',()=>{
    const h=blankDesign(),f=h.floors[0]!,person={x:2,z:2};
    const path=conversationPath({x:0,z:0},person,f,h.width,h.height)!;
    expect(path.length).toBeGreaterThan(0);const end=path.at(-1)!;
    expect(Math.hypot(end.x-person.x,end.z-person.z)).toBeGreaterThan(.7);
    expect(Math.hypot(end.x-person.x,end.z-person.z)).toBeLessThan(1.4);
    expect(path.every(point=>!blocked(point,f,h.width,h.height))).toBe(true);
  });
  it('does not start a conversation through a closed dividing wall',()=>{
    const h=blankDesign(),f=h.floors[0]!;
    f.interiorWalls=[{id:'closed',x1:0,z1:-5,x2:0,z2:5}];
    expect(conversationPath({x:-2,z:0},{x:.5,z:0},f,h.width,h.height)).toBeNull();
  });
});
