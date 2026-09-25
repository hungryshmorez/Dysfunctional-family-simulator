import * as THREE from 'three';
import type { Appearance } from './appearance';
import type { FamilyMood } from './family-mood';

/**
 * Original articulated characters; dimensions are in metres.
 * `look` is either a shirt colour (family/NPCs, fixed look) or a full
 * {@link Appearance} (the player), which drives build, hair style, accessory,
 * and the bottoms/shoes colours as well.
 */
export function createCharacter(name: string, look: string | Appearance): THREE.Group {
  const custom = typeof look !== 'string' ? look : null;
  const shirt = typeof look === 'string' ? look : look.shirt;
  const root = new THREE.Group();
  root.name = name;
  const skin = new THREE.MeshStandardMaterial({color: custom ? custom.skin : name === 'Jules' ? '#a96746' : '#d6a27d', roughness: .85});
  const fabric = new THREE.MeshStandardMaterial({color: shirt, roughness: .95});
  const denim = new THREE.MeshStandardMaterial({color: custom ? custom.bottoms : '#354252', roughness: 1});
  const hair = new THREE.MeshStandardMaterial({color: custom ? custom.hair : name === 'Rowan' ? '#8a5030' : '#352b2b', roughness: 1});
  const shoe = new THREE.MeshStandardMaterial({color: custom ? custom.shoes : '#f0e9df', roughness: .9});
  root.userData.appearance={skin,fabric,hair,denim,shoe};
  const build = custom ? Math.max(.8, Math.min(1.3, custom.build)) : 1;
  const hairStyle = custom ? custom.hairStyle : name === 'You' ? 'short' : 'long';
  const accessory = custom ? custom.accessory : 'none';

  function ellipsoid(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); mesh.castShadow = true;
    parent.add(mesh); return mesh;
  }
  const torso=new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(.17,0),new THREE.Vector2(.18,.10),new THREE.Vector2(.195,.27),
    new THREE.Vector2(.235,.40),new THREE.Vector2(.21,.46),new THREE.Vector2(.08,.50),
  ],24),fabric);
  torso.position.y=.89;torso.scale.set(build,1,.67*build);torso.castShadow=true;root.add(torso);
  ellipsoid(root,denim,0,.84,0,.20*build,.15,.14*build);
  const head=new THREE.Group();head.position.y=1.43;root.add(head);root.userData.head=head;
  const face=(material:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>ellipsoid(head,material,x,y-1.43,z,sx,sy,sz);
  face(skin,0,1.43,0,.075,.10,.075);
  face(skin,0,1.61,0,.15,.195,.14);
  if(hairStyle!=='bald')face(hair,0,hairStyle==='buzz'?1.70:1.72,-.025,.155,hairStyle==='buzz'?.06:.10,.145);
  if(hairStyle==='long')face(hair,0,1.57,-.105,.155,.19,.075);
  if(hairStyle==='curly')for(const [dx,dz] of [[-.12,0],[.12,0],[0,-.12],[-.09,-.09],[.09,-.09]] as const)face(hair,dx,1.74,dz-.02,.07,.07,.07);
  if(hairStyle==='ponytail')face(hair,0,1.55,-.16,.06,.13,.06);
  if(hairStyle==='bun')face(hair,0,1.79,-.11,.075,.075,.075);
  const eye = new THREE.MeshStandardMaterial({color:'#394e50',roughness:.3});
  const white = new THREE.MeshStandardMaterial({color:'#fffaf0'});
  const lip = new THREE.MeshStandardMaterial({color:'#9b5e55',roughness:.85});
  face(lip,0,1.535,.127,.043,.009,.009);
  const brows:THREE.Object3D[]=[];root.userData.brows=brows;
  for(const side of [-1,1]) {
    face(skin,side*.151,1.6,0,.028,.048,.035);
    face(white,side*.052,1.64,.13,.027,.017,.012);
    face(eye,side*.052,1.64,.141,.012,.013,.005);
    const brow=face(hair,side*.053,1.675,.126,.031,.008,.008);brow.rotation.z=-side*.1;brows.push(brow);
    const arm = new THREE.Group(); arm.name = side < 0 ? 'leftArm' : 'rightArm'; arm.position.set(side*.255,1.34,0); root.add(arm);
    ellipsoid(arm,fabric,side*.012,-.10,0,.075,.15,.08);
    const elbow=new THREE.Group();elbow.name=side<0?'leftElbow':'rightElbow';elbow.position.set(side*.015,-.23,0);arm.add(elbow);
    ellipsoid(elbow,skin,0,-.105,0,.05,.125,.055);
    ellipsoid(elbow,skin,0,-.25,0,.05,.06,.03);
    for(let finger=0;finger<4;finger++)ellipsoid(elbow,skin,(finger-1.5)*.022,-.30,0,.012,.037,.013);
    ellipsoid(elbow,skin,-side*.052,-.25,.018,.019,.036,.019);
    const leg = new THREE.Group(); leg.name = side < 0 ? 'leftLeg' : 'rightLeg'; leg.position.set(side*.105,.83,0); root.add(leg);
    ellipsoid(leg,denim,0,-.19,0,.087,.22,.09);
    const knee=new THREE.Group();knee.name=side<0?'leftKnee':'rightKnee';knee.position.y=-.39;leg.add(knee);
    ellipsoid(knee,denim,0,-.15,0,.065,.19,.07);
    ellipsoid(knee,shoe,0,-.35,.055,.085,.065,.15);
    for(let lace=0;lace<3;lace++)ellipsoid(knee,white,0,-.305,.07+lace*.025,.055,.008,.007);
  }
  face(skin,0,1.59,.14,.025,.032,.03);
  // Optional accessories, parented to the head so they track head motion.
  if(accessory==='glasses'){
    const lens=new THREE.MeshStandardMaterial({color:'#14151c',roughness:.35,metalness:.3});
    for(const s of [-1,1])face(lens,s*.052,1.64,.152,.032,.03,.012);
    face(lens,0,1.64,.152,.022,.006,.01);
  } else if(accessory==='cap'){
    const capMat=new THREE.MeshStandardMaterial({color:'#20222c',roughness:.8});
    face(capMat,0,1.75,-.02,.168,.095,.16);
    face(capMat,0,1.715,.115,.15,.022,.13);
  } else if(accessory==='beard'){
    // Jaw-line beard in the hair colour, parented to the head so it tracks.
    face(hair,0,1.52,.085,.11,.075,.085);
    face(hair,0,1.48,.055,.075,.055,.07);
  }
  // Cache the articulated joints; avoid scene-graph searches every frame.
  root.userData.joints=Object.fromEntries(['leftArm','rightArm','leftLeg','rightLeg','leftKnee','rightKnee','leftElbow','rightElbow'].map(key=>[key,root.getObjectByName(key)]));
  const body=new THREE.Group();body.name='body';
  for(const child of [...root.children])body.add(child);
  root.add(body);root.userData.body=body;
  const hand=root.userData.joints.rightElbow as THREE.Group;
  const book=new THREE.Mesh(new THREE.BoxGeometry(.19,.025,.25),new THREE.MeshStandardMaterial({color:'#457b78'}));
  book.name='activityBook';book.position.set(0,-.30,.07);hand.add(book);
  const food=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshStandardMaterial({color:'#da8b47'}));
  food.name='activityFood';food.position.set(0,-.3,.015);hand.add(food);
  root.userData.book=book;root.userData.food=food;book.visible=false;food.visible=false;
  return root;
}

export function animateCharacter(root: THREE.Group, time: number, moving: boolean, running = false, activity = '', mood:FamilyMood='neutral'): void {
  const head=root.userData.head as THREE.Group;
  head.rotation.set(mood==='guarded'?.14:mood==='angry'?-.08:0,mood==='guarded'?.22:0,mood==='warm'?Math.sin(time*1.8)*.04:0);
  (root.userData.brows as THREE.Object3D[]).forEach((brow,i)=>{brow.rotation.z=(i===0?-1:1)*(mood==='angry'?.3:mood==='guarded'?-.25:-.1);});
  (root.userData.book as THREE.Object3D).visible=!moving&&activity==='study';
  (root.userData.food as THREE.Object3D).visible=!moving&&activity==='eat';
  const swing = moving ? Math.sin(time * (running ? 14 : 9)) * (running ? .8 : .48) : 0;
  for(const [name, direction] of [['leftArm',-1],['rightArm',1],['leftLeg',1],['rightLeg',-1]] as const) {
    const limb = root.userData.joints[name] as THREE.Object3D|undefined;
    if(limb) limb.rotation.set(swing * direction,0,0);
  }
  const joints=root.userData.joints as Record<string,THREE.Object3D>;
  joints.leftKnee!.rotation.x=moving?Math.max(0,-swing)*1.5:0;
  joints.rightKnee!.rotation.x=moving?Math.max(0,swing)*1.5:0;
  for(const side of ['left','right'])joints[side+'Elbow']!.rotation.set(running&&moving?-.85:-.12,0,0);
  if(!moving&&['study','create','work','eat','talk','play','wash'].includes(activity)){
    joints.rightArm!.rotation.x=-.65+Math.sin(time*3)*.18;
    joints.rightElbow!.rotation.x=-.8+Math.sin(time*4)*.12;
    if(activity==='create'||activity==='work'||activity==='wash'){
      joints.leftArm!.rotation.x=-.55;joints.leftElbow!.rotation.x=-.75;
    }
  }
  if(!moving&&(activity===''||activity==='talk')){
    if(mood==='guarded'||mood==='angry'){
      for(const [side,sign] of [['left',1],['right',-1]] as const){
        joints[side+'Arm']!.rotation.set(-.5,0,sign*-.2);
        joints[side+'Elbow']!.rotation.set(-1.25,sign*-.7,sign*.35);
      }
      if(mood==='angry'&&activity==='talk'){joints.rightArm!.rotation.x=-.9+Math.sin(time*3)*.1;joints.rightElbow!.rotation.x=-.5;}
    }else if(mood==='warm'){
      joints.leftArm!.rotation.z=.12;joints.rightArm!.rotation.z=-.12;
      if(activity==='talk'){joints.leftArm!.rotation.x=-.45;joints.leftElbow!.rotation.x=-.5;}
    }
  }
  root.position.y = moving ? Math.abs(Math.sin(time * (running ? 14 : 9))) * .035 : Math.sin(time * 2) * .006;
}

/** Move only the visible body onto furniture; navigation stays at its safe approach point. */
export function poseAtFurniture(root:THREE.Group,activity:string,item?:{type:string;position?:{x:number;z:number};rotation?:number;height:number;depth:number}):void {
  const body=root.userData.body as THREE.Group;
  body.position.set(0,0,0);body.rotation.set(0,0,0);
  if(!item?.position||activity!=='sleep'||item.type!=='bed')return;
  const angle=item.rotation??0;
  const offset=Math.min(.65,item.depth*.4);
  const anchor=new THREE.Vector3(item.position.x+Math.sin(angle)*offset,item.height+.08,item.position.z+Math.cos(angle)*offset);
  root.updateMatrixWorld(true);
  body.position.copy(root.worldToLocal(anchor));
  body.rotation.set(-Math.PI/2,0,0);
  // Euler order keeps the reclining body aligned with a rotated bed.
  body.rotation.order='YXZ';body.rotation.y=angle-root.rotation.y;
}
