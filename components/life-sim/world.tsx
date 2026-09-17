'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { disposeObject } from '@/components/room-organizer/three/builder-utils';
import { createFurnitureModel } from '@/components/room-organizer/three/furniture-builders';
import { renderInteriorWalls } from '@/components/room-organizer/three/interior-walls';
import { applyWallDisplay, buildRoom } from '@/components/room-organizer/three/room-builder';
import { AppearancePanel,DEFAULT_APPEARANCE,parseAppearance,structuralKey } from './appearance';
import { animateCharacter, createCharacter, poseAtFurniture } from './character';
import { clearCustomRig, hasCustomRig, loadStoredRig, storeCustomRig, type LoadedRig } from './custom-rig';
import {dialogueAt,dialogueDuration} from './dialogue-timing';
import { FAMILY_MEMBERS,familyPresent,type FamilyState } from './family';
import { familyMood,MOOD_LABELS,type FamilyMood } from './family-mood';
import {stagingFamilyScene,updateFamilyScene,type FamilyScene} from './family-scene';
import { detailFurniture } from './furniture-details';
import { startGraphics } from './graphics';
import { nameplate,updateNameplate } from './nameplate';
import { blocked, findPath } from './navigation';
import { dressNeighborhood } from './scenery';
import { conversationPath } from './social-navigation';
import { FlatWorld } from './world-flat';
import type {DirectedScene} from './story-director-state';
import type { FurnitureItem, RoomLayout, Vec2 } from '@/components/room-organizer/lib/types';

export interface MoveCommand { id:number; target:Vec2; item?:FurnitureItem; person?:string }
export interface WorldProps { storyScene?:DirectedScene|null; family?:FamilyState; minute?:number; activity?:string; sceneReview?:boolean; socialName?:string; onPerson?:(name:string)=>void }
export interface WorldProps { home:RoomLayout; stage:number; command:MoveCommand|null; paused:boolean; danger:boolean; movement:string; sprint:boolean; repel:number; onThreatState:(state:{phase:string;seconds:number})=>void; onManual:()=>void; onHurt:(amount:number)=>void; onThreat:(message:string)=>void; onSelect:(item:FurnitureItem)=>void; onWalk:(point:Vec2)=>void; onArrive:(id:number,success:boolean)=>void; onError:(message:string)=>void }
export function World(props:WorldProps):JSX.Element {
  const [fallback,setFallback]=useState(false);
  const [graphicsError,setGraphicsError]=useState('');
  const [caption,setCaption]=useState<{name:string;text:string}|null>(null);
  const [appearance,setAppearance]=useState(DEFAULT_APPEARANCE),[styling,setStyling]=useState(false);
  const [rigVersion,setRigVersion]=useState(0);
  const look=useRef(appearance);look.current=appearance;
  const styleKey=structuralKey(appearance);
  useEffect(()=>{try{const saved=parseAppearance(JSON.parse(localStorage.getItem('yourspace-appearance')??'null'));if(saved)setAppearance(saved);}catch{/* Keep the default if this optional preference is unavailable. */}},[]);
  const [view,setView]=useState<'home'|'follow'>('home'),[walls,setWalls]=useState(false);
  const presentation=useRef({view,walls}),cameraAction=useRef<(action:string)=>void>(()=>{});
  presentation.current={view,walls};
  const host=useRef<HTMLDivElement>(null),live=useRef(props);live.current=props;
  useEffect(()=>{
    if(fallback||!host.current)return;const el=host.current;let renderer:THREE.WebGLRenderer;let reducedQuality=false;
    try{const started=startGraphics();renderer=started.renderer;reducedQuality=started.reducedQuality;}catch(error){setGraphicsError(error instanceof Error?error.message:String(error));setFallback(true);live.current.onError('3D could not start. Open Graphics details for the browser’s failure reason.');return;}
    renderer.setPixelRatio(reducedQuality?1:Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=!reducedQuality;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#33313d');scene.fog=new THREE.Fog('#242230',22,68);
    const camera=new THREE.PerspectiveCamera(38,1,.1,150);const span=Math.max(props.home.width,props.home.height);camera.position.set(span*.82,span*.85,span*.98);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0.3,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2.2;controls.minDistance=5;controls.maxDistance=65;controls.update();
    const sky=new THREE.HemisphereLight('#616a78','#161520',1.4);scene.add(sky);
    const roomLights=[[-3,1.9,-3],[3.7,1.9,-3],[-3,1.9,1.5],[3,1.9,1]].map(([x,y,z])=>{const light=new THREE.PointLight('#ffdda6',0,8,2);light.position.set(x!,y!,z!);scene.add(light);return light;});
    const sun=new THREE.DirectionalLight('#cdba8f',2.1);sun.position.set(-8,16,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;sun.shadow.normalBias=.03;scene.add(sun);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({color:'#242119',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.3;ground.receiveShadow=true;scene.add(ground);
    const edging=new THREE.Mesh(new THREE.BoxGeometry(props.home.width+.55,.18,props.home.height+.55),new THREE.MeshStandardMaterial({color:'#33302a',roughness:.95}));edging.position.y=-.18;edging.receiveShadow=true;scene.add(edging);
    for(let i=0;i<10;i++){const angle=i/10*Math.PI*2,distance=span*.9+2;const tree=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,1.6,6),new THREE.MeshStandardMaterial({color:'#3d362d'}));trunk.position.y=.5;const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.2,1),new THREE.MeshStandardMaterial({color:i%2?'#3a4232':'#4a452e',roughness:1}));crown.position.y=1.9;crown.scale.set(1,1.3,1);crown.castShadow=true;tree.add(trunk,crown);tree.position.set(Math.cos(angle)*distance,-.2,Math.sin(angle)*distance);scene.add(tree);}
    const floor=props.home.floors[0]!;
    buildRoom(THREE,{scene,width:props.home.width,depth:props.home.height,floorColor:floor.floorColor,floorPattern:floor.floorPattern,wallColors:floor.wallColors,hiddenWalls:floor.hiddenWalls,floorPlanImage:null,floorPlanOpacity:0,floorPlanFitMode:'stretch',floorPlan3DEffect:false});
    renderInteriorWalls(THREE,scene,floor.interiorWalls??[],0,undefined,{openingCandidates:floor.items,roomWidth:props.home.width,roomDepth:props.home.height});
    // Low cutaway partitions expose furniture and characters inside each room.
    const partitions=scene.children.filter(o=>o.userData.type==='interior-wall');
    partitions.forEach(o=>{o.userData.fullHeightY=o.position.y;});
    dressNeighborhood(scene,props.home);
    const interactables:THREE.Object3D[]=[];
    for(const item of floor.items){if(!item.position)continue;const model=createFurnitureModel(THREE,item,false);detailFurniture(model,item);model.position.set(item.position.x,0,item.position.z);model.rotation.y=item.rotation??0;model.traverse(o=>{o.userData.lifeItem=item.id;});scene.add(model);interactables.push(model);}
    const person=(id:string,color:string)=>{const m=createCharacter(id,color);scene.add(m);return m;};
    const avatar=createCharacter('You',look.current);scene.add(avatar);const spawn=findPath({x:0,z:1},{x:0,z:1},floor,props.home.width,props.home.height)?.[0]??{x:0,z:0};avatar.position.set(spawn.x,0,spawn.z);
    // Swap in a player-uploaded model, if any, keeping the procedural avatar as
    // the transform root so all movement/camera code is unchanged.
    let disposed=false,customRig:LoadedRig|null=null;
    if(hasCustomRig())loadStoredRig().then(rig=>{if(!rig)return;if(disposed){rig.dispose();return;}customRig=rig;avatar.userData.body.visible=false;avatar.add(rig.group);avatar.userData.custom=true;}).catch(()=>live.current.onError('Your uploaded model could not load; the built-in character is being used.'));
    const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.16),new THREE.MeshStandardMaterial({color:'#f5ce55',emissive:'#efb433',emissiveIntensity:.4}));scene.add(marker);
    cameraAction.current=(action)=>{
      if(action==='capture'){
        try{renderer.render(scene,camera);const image=renderer.domElement.toDataURL('image/png');const link=document.createElement('a');link.download='dysfunctional-family-scene.png';link.href=image;link.click();live.current.onError('Scene image saved. Share it for visual feedback.');}catch{live.current.onError('Could not save the image. Take a screenshot of the scene instead.');}return;
      }
      if(action==='home'){controls.target.set(0,.3,0);camera.position.set(span*.82,span*.85,span*.98);}
      if(action==='follow'){controls.target.copy(avatar.position).add(new THREE.Vector3(0,.8,0));camera.position.copy(controls.target).add(new THREE.Vector3(4.5,5.5,6));}
      if(action==='in'||action==='out'){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(action==='in'?.8:1.25).clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);}
      controls.update();
    };
    const companions=[person('Rowan','#687aec'),person('Jules','#db7d83')];
    for(const member of FAMILY_MEMBERS.filter(m=>m.id!=='self')){const m=person(member.name,member.role==='parent'?'#8b8477':member.id==='older'?'#608d9c':'#b684a4');m.userData.familyId=member.id;companions.push(m);}
    companions.forEach(m=>{const label=nameplate(m.name);m.add(label);m.userData.label=label;m.traverse(part=>{part.userData.person=m.userData.familyId?'family:'+m.userData.familyId:m.name;});});
    const prowler=person('Prowler','#a31e3f');prowler.visible=false;
    const keys=new Set<string>();
    const keydown=(e:KeyboardEvent)=>{if(live.current.paused)return;if(e.target instanceof HTMLElement&&(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)))return;if(['w','a','s','d','shift'].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());e.preventDefault();}};
    const keyup=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());const blur=()=>keys.clear();
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
    let dangerClock=0,threat='quiet',attackLeft=0,repath=0,hitCooldown=0,repel=live.current.repel,enemyPath:Vec2[]=[],lastThreat='';
    companions.forEach((m,i)=>{const p=findPath(spawn,{x:Math.cos(i/companions.length*Math.PI*2)*2.8,z:Math.sin(i/companions.length*Math.PI*2)*2.8},floor,props.home.width,props.home.height)?.at(-1)??spawn;m.position.set(p.x,0,p.z);});
    let path:Vec2[]=[],lastCommand=-1,last=performance.now(),raf=0,phase=0;
    let interactionItem:FurnitureItem|undefined;
    let previousLook='';
    let npcPaths:Vec2[][]=[[],[]],nextWander=0;
    let familyScene:FamilyScene|null=null;
    let previousCaption='';
    function move(mesh:THREE.Group,points:Vec2[],step:number):boolean {const p=points[0];if(!p)return false;const dx=p.x-mesh.position.x,dz=p.z-mesh.position.z,d=Math.hypot(dx,dz);if(d<=step){mesh.position.x=p.x;mesh.position.z=p.z;points.shift();}else{mesh.position.x+=dx/d*step;mesh.position.z+=dz/d*step;mesh.rotation.y=Math.atan2(dx,dz);}return true;}
    function frame(){raf=requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;const p=live.current;
      if(!p.command)path=[];if(p.paused)keys.clear();
      const scale=p.stage===0?.45:p.stage===1?.68:p.stage===2?.88:1;avatar.scale.setScalar(scale);
      const lookKey=look.current.skin+look.current.hair+look.current.shirt+look.current.bottoms+look.current.shoes;
      if(previousLook!==lookKey&&!avatar.userData.custom){previousLook=lookKey;const materials=avatar.userData.appearance;materials.skin.color.set(look.current.skin);materials.hair.color.set(look.current.hair);materials.fabric.color.set(look.current.shirt);materials.denim.color.set(look.current.bottoms);materials.shoe.color.set(look.current.shoes);}
      companions.forEach(m=>{if(m.userData.familyId){m.visible=familyPresent(m.userData.familyId,p.stage);m.scale.setScalar(m.userData.familyId==='older'?(p.stage===0?.7:p.stage===1?.88:1):m.userData.familyId==='younger'?(p.stage<=1?.55:p.stage===2?.8:1):1);}});
      const conversation=companions.find(m=>m.visible&&m.userData.person===(p.command?.person??(p.activity==='talk'?p.socialName:undefined)));
      companions.forEach(m=>{
        if(!m.userData.familyId)return;
        const mood=familyMood(p.family,m.userData.familyId,p.stage,m===conversation&&p.activity==='talk');
        if(m.userData.mood!==mood){
          m.userData.mood=mood;
          updateNameplate(m.userData.label,m.name,MOOD_LABELS[mood],mood==='angry'?'#9d303c':mood==='guarded'?'#805b27':'#315c4b');
          if(p.paused)animateCharacter(m,phase,false,false,'',mood);
        }
      });
      if(p.command&&p.command.id!==lastCommand){interactionItem=p.command.item;lastCommand=p.command.id;const from={x:avatar.position.x,z:avatar.position.z};const result=conversation?conversationPath(from,conversation.position,floor,p.home.width,p.home.height):p.command.person?null:findPath(from,p.command.target,floor,p.home.width,p.home.height,p.command.item);path=result??[];if(!result)p.onArrive(lastCommand,false);}
      if(!p.paused){
        const held=(k:string)=>keys.has(k)||p.movement===k;
        const horizontal=Number(held('d'))-Number(held('a')),vertical=Number(held('s'))-Number(held('w'));
        let moving=false;
        if(horizontal||vertical){path=[];p.onManual();const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new THREE.Vector3(-forward.z,0,forward.x);const delta=right.multiplyScalar(horizontal).add(forward.multiplyScalar(-vertical)).normalize().multiplyScalar(dt*(keys.has('shift')||p.sprint?3.8:2.4));
          const nextX={x:avatar.position.x+delta.x,z:avatar.position.z};if(!blocked(nextX,floor,p.home.width,p.home.height))avatar.position.x=nextX.x;
          const nextZ={x:avatar.position.x,z:avatar.position.z+delta.z};if(!blocked(nextZ,floor,p.home.width,p.home.height))avatar.position.z=nextZ.z;
          avatar.rotation.y=Math.atan2(delta.x,delta.z);moving=true;
        }else{moving=move(avatar,path,dt*2.4);if(moving&&!path.length)p.onArrive(lastCommand,true);}
        phase+=dt;
        if(avatar.userData.custom){customRig?.setMoving(moving);customRig?.update(dt);}
        else{animateCharacter(avatar,phase,moving,keys.has('shift')||p.sprint,p.activity);poseAtFurniture(avatar,moving?'':p.activity??'',interactionItem);}
        if(p.activity&&!moving&&interactionItem?.position)avatar.rotation.y=Math.atan2(interactionItem.position.x-avatar.position.x,interactionItem.position.z-avatar.position.z);
        if(conversation&&p.activity==='talk'&&!moving)avatar.rotation.y=Math.atan2(conversation.position.x-avatar.position.x,conversation.position.z-avatar.position.z);
        if(repel!==p.repel||!p.danger){repel=p.repel;prowler.visible=false;threat='quiet';dangerClock=0;}
        if(p.danger){dangerClock+=dt;hitCooldown-=dt;
          if(threat==='quiet'&&dangerClock>45){threat='warning';p.onThreat('A prowler is approaching. You have 8 seconds. Keep moving; hold Shift to run.');}
          if(threat==='warning'&&dangerClock>53){const target={x:avatar.position.x>0?-p.home.width/2+1:p.home.width/2-1,z:avatar.position.z>0?-p.home.height/2+1:p.home.height/2-1};const route=findPath({x:avatar.position.x,z:avatar.position.z},target,floor,p.home.width,p.home.height);const spawnEnemy=route?.at(-1);if(spawnEnemy&&Math.hypot(spawnEnemy.x-avatar.position.x,spawnEnemy.z-avatar.position.z)>3){prowler.position.set(spawnEnemy.x,0,spawnEnemy.z);prowler.visible=true;attackLeft=24;repath=0;threat='attack';p.onThreat('Prowler! Survive 24 seconds, run away, or use your alarm.');}else{threat='quiet';dangerClock=0;p.onThreat('The prowler could not reach your home.');}}
          if(threat==='attack'){attackLeft-=dt;repath-=dt;if(repath<=0){repath=.8;enemyPath=findPath({x:prowler.position.x,z:prowler.position.z},{x:avatar.position.x,z:avatar.position.z},floor,p.home.width,p.home.height)??[];}move(prowler,enemyPath,dt*1.55);
            if(hitCooldown<=0&&prowler.position.distanceTo(avatar.position)<.75){hitCooldown=2;p.onHurt(12);}
            if(attackLeft<=0){prowler.visible=false;threat='quiet';dangerClock=0;p.onThreat('The prowler gave up. You are safe for now. Rest to recover health.');}}
        }
        const moment=p.family?.moment??null;
        const actor=companions.find(m=>m.visible&&m.userData.familyId===moment?.actor);
        const target=companions.find(m=>m.visible&&m.userData.familyId===moment?.target);
        const transcript=p.storyScene&&p.storyScene.minute===moment?.minute?p.storyScene.lines:null;
        familyScene=actor&&target?updateFamilyScene(familyScene,{moment,actor:actor.position,target:target.position,interrupted:conversation===actor||conversation===target,dt,floor,width:p.home.width,depth:p.home.height,talkDuration:transcript?dialogueDuration(transcript):18}):null;
        const staging=stagingFamilyScene(familyScene);
        const line=familyScene?.phase==='talking'&&transcript?dialogueAt(transcript,familyScene.elapsed):null;
        const captionKey=line?line.speaker+line.text:'';
        if(previousCaption!==captionKey){previousCaption=captionKey;setCaption(line?{name:FAMILY_MEMBERS.find(member=>member.id===line.speaker)!.name,text:line.text}:null);}
        if(now>nextWander){nextWander=now+12000;npcPaths=companions.map(m=>m===conversation||staging&&(m===actor||m===target)?[]:findPath({x:m.position.x,z:m.position.z},{x:(Math.random()-.5)*p.home.width*.75,z:(Math.random()-.5)*p.home.height*.75},floor,p.home.width,p.home.height)??[]);}
        companions.forEach((m,i)=>{
          const mood=(m.userData.mood??'neutral') as FamilyMood;
          let detail=MOOD_LABELS[mood];
          if(m===conversation){npcPaths[i]=[];m.rotation.y=Math.atan2(avatar.position.x-m.position.x,avatar.position.z-m.position.z);animateCharacter(m,phase+i,false,false,p.activity==='talk'?'talk':'',mood);}
          else if(staging&&(m===actor||m===target)){
            npcPaths[i]=[];
            const other=m===actor?target!:actor!;
            const walking=m===actor&&familyScene!.phase==='approaching'&&move(m,familyScene!.path,dt*.85);
            if(!walking)m.rotation.y=Math.atan2(other.position.x-m.position.x,other.position.z-m.position.z);
            const speaking=familyScene!.phase==='talking'&&(line?m.userData.familyId===line.speaker:Math.floor(familyScene!.elapsed/3)%2===0?m===actor:m===target);
            animateCharacter(m,phase+i,walking,false,speaking?'talk':'',mood);
            detail=familyScene!.phase==='approaching'?(m===actor?'Coming over':'Waiting to talk'):speaking?(moment!.kind==='argument'?'Speaking firmly':'Offering support'):'Listening';
          }else animateCharacter(m,phase+i,move(m,npcPaths[i]??[],dt*.55),false,'',mood);
          if(m.userData.familyId)updateNameplate(m.userData.label,m.name,detail,mood==='angry'?'#9d303c':mood==='guarded'?'#805b27':'#315c4b');
        });
        animateCharacter(prowler,phase,prowler.visible&&enemyPath.length>0);
      }
      const seconds=threat==='warning'?Math.max(0,Math.ceil(53-dangerClock)):threat==='attack'?Math.max(0,Math.ceil(attackLeft)):0;const threatKey=threat+seconds;if(lastThreat!==threatKey){lastThreat=threatKey;p.onThreatState({phase:threat,seconds});}
      const hour=((p.minute??600)%1440)/60;
      const daylight=Math.max(0,Math.sin((hour-6)/12*Math.PI));
      sky.intensity=.4+daylight*.7;sun.intensity=.1+daylight*1.5;
      sun.position.set(Math.cos((hour-6)/12*Math.PI)*16,4+daylight*16,8);
      const background=new THREE.Color('#0c0a12').lerp(new THREE.Color('#33313d'),daylight);
      scene.background=background;if(scene.fog instanceof THREE.Fog)scene.fog.color.copy(background);
      roomLights.forEach(light=>{light.intensity=7+(1-daylight)*18;});
      if(presentation.current.view==='follow'){
        const target=avatar.position.clone().add(new THREE.Vector3(0,.8,0));
        const delta=target.sub(controls.target).multiplyScalar(1-Math.exp(-dt*5));
        controls.target.add(delta);camera.position.add(delta);
      }
      partitions.forEach(o=>{const factor=presentation.current.walls?1:.38;o.scale.y=factor;o.position.y=o.userData.fullHeightY*factor;});
      marker.position.set(avatar.position.x,1.9*scale+.25+Math.sin(now*.003)*.04,avatar.position.z);marker.rotation.y+=dt;controls.update();applyWallDisplay(scene,camera.position.x,camera.position.z,presentation.current.walls?'up':'cutaway',p.home.width,p.home.height);renderer.render(scene,camera);
    }frame();
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(el);resize();
    let down={x:0,y:0};const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    const start=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const pick=(e:PointerEvent)=>{if(live.current.paused||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return;const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects([...interactables,...companions.filter(m=>m.visible)],true)[0];if(hit){if(hit.object.userData.person){live.current.onPerson?.(hit.object.userData.person);return;}const item=floor.items.find(i=>i.id===hit.object.userData.lifeItem);if(item){live.current.onSelect(item);return;}}
      const target=ray.ray.intersectPlane(plane,new THREE.Vector3());if(target)live.current.onWalk({x:target.x,z:target.z});};
    renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',pick);
    const contextLost=(event:Event)=>{event.preventDefault();setGraphicsError('The browser lost the graphics context while the scene was running. Close other graphics-heavy tabs and retry 3D.');setFallback(true);live.current.onError('3D stopped because the browser lost its graphics context.');};
    renderer.domElement.addEventListener('webglcontextlost',contextLost);
    return()=>{disposed=true;customRig?.dispose();cancelAnimationFrame(raf);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);observer.disconnect();renderer.domElement.removeEventListener('pointerdown',start);renderer.domElement.removeEventListener('pointerup',pick);renderer.domElement.removeEventListener('webglcontextlost',contextLost);controls.dispose();disposeObject(scene);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[props.home,fallback,rigVersion,styleKey]);
  return fallback?<>{!props.sceneReview&&<FlatWorld {...props}/>}<div className="graphics-notice"><b>3D graphics unavailable in this browser</b><span>{props.sceneReview?'Scene review needs a browser with WebGL graphics support.':'This is the compatibility floor plan.'}</span><button onClick={()=>setFallback(false)}>Retry 3D</button><details><summary>Graphics details</summary><p>{graphicsError}</p></details></div></>:<><div className="life-world" ref={host} aria-label="Your home. Drag to rotate, pinch to zoom, tap furniture to interact."/>{caption&&<div className="family-caption" role="status"><strong>{caption.name}</strong><span>{caption.text}</span></div>}<div className="world-camera" aria-label="Camera controls"><button aria-pressed={view==='home'} onClick={()=>{setView('home');cameraAction.current('home');}}>House view</button><button aria-pressed={view==='follow'} onClick={()=>{setView('follow');cameraAction.current('follow');}}>Follow me</button><button aria-label="Zoom in" onClick={()=>cameraAction.current('in')}>+</button><button aria-label="Zoom out" onClick={()=>cameraAction.current('out')}>−</button><button aria-pressed={walls} onClick={()=>setWalls(v=>!v)}>{walls?'Lower walls':'Raise walls'}</button><button aria-pressed={styling} onClick={()=>setStyling(v=>!v)}>Your look</button><button onClick={()=>cameraAction.current('capture')}>Save scene image</button></div>{styling&&<AppearancePanel value={appearance} hasRig={hasCustomRig()} onClose={()=>setStyling(false)} onChange={next=>{setAppearance(next);try{localStorage.setItem('yourspace-appearance',JSON.stringify(next));}catch{live.current.onError('Your look changed, but could not be saved in this browser.');}}} onUploadRig={file=>{storeCustomRig(file).then(()=>setRigVersion(v=>v+1)).catch(err=>live.current.onError(err instanceof Error?err.message:'Could not save that model.'));}} onClearRig={()=>{clearCustomRig().then(()=>setRigVersion(v=>v+1)).catch(()=>live.current.onError('Could not remove the custom model.'));}}/>}</>;
}
