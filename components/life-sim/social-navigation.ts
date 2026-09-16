import { blocked,findPath } from './navigation';
import type { FloorLayout,Vec2 } from '@/components/room-organizer/lib/types';

export function conversationPath(from:Vec2,person:Vec2,floor:FloorLayout,width:number,depth:number):Vec2[]|null{
  let best:Vec2[]|null=null;
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6,target={x:person.x+Math.cos(angle),z:person.z+Math.sin(angle)};
    if(blocked(target,floor,width,depth))continue;
    const path=findPath(from,target,floor,width,depth),end=path?.at(-1);
    if(!path||!end)continue;
    const distance=Math.hypot(end.x-person.x,end.z-person.z);
    if(distance<.7||distance>1.4)continue;
    // Reject conversation spots separated by a partition or furniture.
    if(Array.from({length:9},(_,step)=>({x:end.x+(person.x-end.x)*(step+1)/10,z:end.z+(person.z-end.z)*(step+1)/10})).some(point=>blocked(point,floor,width,depth)))continue;
    if(!best||path.length<best.length)best=path;
  }
  return best;
}
