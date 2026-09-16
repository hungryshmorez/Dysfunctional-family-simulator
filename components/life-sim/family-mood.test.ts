import * as THREE from 'three';
import {expect,it} from 'vitest';
import {disposeObject} from '@/components/room-organizer/three/builder-utils';
import {animateCharacter,createCharacter} from './character';
import {newFamily} from './family';
import {familyMood} from './family-mood';

it('reflects directed tensions with relatives and switches to the player bond during conversation',()=>{
  const f=newFamily();f.bonds.older.younger!.resentment=60;
  expect(familyMood(f,'older',1)).toBe('angry');
  expect(familyMood(f,'older',1,true)).toBe('neutral');
  expect(familyMood(f,'younger',1)).toBe('neutral');
  expect(familyMood(f,'older',0)).toBe('neutral');
  f.bonds.older.younger!.resentment=0;f.bonds.older.self!.affection=75;f.bonds.older.self!.trust=75;
  expect(familyMood(f,'older',1)).toBe('warm');
  f.bonds.older['parent-a']!.trust=20;expect(familyMood(f,'older',1)).toBe('guarded');
});
it('clears defensive arm poses for walking and preserves activity props',()=>{
  const person=createCharacter('Casey','#608d9c');
  try{
    const joints=person.userData.joints as Record<string,THREE.Object3D>;
    expect(person.userData.book.visible).toBe(false);expect(person.userData.food.visible).toBe(false);
    animateCharacter(person,1,false,false,'','guarded');
    expect(joints.leftElbow!.rotation.y).not.toBe(0);
    animateCharacter(person,1,true,false,'','guarded');
    expect(joints.leftElbow!.rotation.y).toBe(0);expect(joints.leftArm!.rotation.z).toBe(0);
    animateCharacter(person,1,false,false,'study','angry');
    expect(person.userData.book.visible).toBe(true);expect(joints.rightElbow!.rotation.y).toBe(0);
    animateCharacter(person,1,false,false,'','neutral');
    expect(person.userData.book.visible).toBe(false);expect(person.userData.head.rotation.x).toBe(0);
  }finally{disposeObject(person);}
});
it('keeps the head attached to the body and mood gestures finite across transitions',()=>{
  const person=createCharacter('Dana','#8b8477');
  try{
    const head=person.userData.head as THREE.Group;
    expect(head.parent).toBe(person.userData.body);expect(head.position.y).toBe(1.43);
    for(const mood of ['warm','guarded','angry','neutral'] as const){
      animateCharacter(person,2,false,false,'talk',mood);
      person.updateMatrixWorld(true);
      person.traverse(o=>expect(o.matrixWorld.elements.every(Number.isFinite)).toBe(true));
    }
    expect(person.userData.joints.leftElbow.rotation.y).toBe(0);
  }finally{disposeObject(person);}
});
