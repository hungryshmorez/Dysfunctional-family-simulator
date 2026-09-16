import {conversationPath} from './social-navigation';
import type {FamilyMoment} from './family';
import type {FloorLayout,Vec2} from '@/components/room-organizer/lib/types';

export interface FamilyScene {
  key:string;actor:FamilyMoment['actor'];target:FamilyMoment['target'];
  phase:'approaching'|'talking'|'interrupted'|'blocked'|'finished';
  path:Vec2[];elapsed:number;
}
interface SceneInput {moment:FamilyMoment|null;actor:Vec2;target:Vec2;interrupted:boolean;dt:number;floor:FloorLayout;width:number;depth:number;talkDuration?:number}
/** Scene paths are consumed by the world's movement loop; no household state changes here. */
export function updateFamilyScene(previous:FamilyScene|null,input:SceneInput):FamilyScene|null{
  const {moment,actor,target,interrupted,dt,floor,width,depth}=input;
  if(!moment)return null;
  const key=[moment.minute,moment.actor,moment.target,moment.kind].join(':');
  let scene=previous?.key===key?previous:null;
  if(scene&&(scene.phase==='finished'||scene.phase==='blocked'))return scene;
  if(interrupted)return {key,actor:moment.actor,target:moment.target,phase:'interrupted',path:[],elapsed:scene?.elapsed??0};
  if(!scene||scene.phase==='interrupted'){
    const route=conversationPath(actor,target,floor,width,depth);
    scene={key,actor:moment.actor,target:moment.target,phase:route?'approaching':'blocked',path:route??[],elapsed:scene?.elapsed??0};
  }
  if(scene.phase==='approaching'&&!scene.path.length)return {...scene,phase:'talking'};
  if(scene.phase==='talking'){
    const elapsed=scene.elapsed+Math.max(0,dt);
    return {...scene,elapsed,phase:elapsed>=(input.talkDuration??18)?'finished':'talking'};
  }
  return scene;
}
export function stagingFamilyScene(scene:FamilyScene|null):boolean{return scene?.phase==='approaching'||scene?.phase==='talking';}
