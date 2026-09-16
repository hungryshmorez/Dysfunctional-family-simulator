import * as THREE from 'three';
import { describe,expect,it } from 'vitest';
import { animateCharacter,createCharacter,poseAtFurniture } from './character';

describe('furniture activity poses',()=>{
  it('aligns sleep with a rotated bed without moving the navigation root',()=>{
    const person=createCharacter('You','#ffaa55');person.position.set(1,0,2);person.rotation.y=.8;person.scale.setScalar(.68);
    const position=person.position.clone();
    poseAtFurniture(person,'sleep',{type:'bed',position:{x:3,z:4},rotation:Math.PI/2,height:.6,depth:1.6});
    person.updateMatrixWorld(true);
    const body=person.userData.body as THREE.Group;
    const anchor=body.getWorldPosition(new THREE.Vector3());
    expect(anchor.x).toBeCloseTo(3.64);expect(anchor.y).toBeCloseTo(.68);expect(anchor.z).toBeCloseTo(4);
    expect(person.position.equals(position)).toBe(true);
    poseAtFurniture(person,'');expect(body.position.length()).toBe(0);expect(body.rotation.x).toBe(0);
  });
  it('clears activity props and arm poses when walking resumes',()=>{
    const person=createCharacter('You','#ffaa55');
    animateCharacter(person,1,false,false,'study');expect(person.userData.book.visible).toBe(true);
    animateCharacter(person,0,true);expect(person.userData.book.visible).toBe(false);expect(person.userData.joints.rightArm.rotation.x).toBe(0);
    animateCharacter(person,1,false,false,'eat');expect(person.userData.food.visible).toBe(true);
    animateCharacter(person,1,false);expect(person.userData.food.visible).toBe(false);
  });
});
