import type { FloorLayout, FurnitureItem, Vec2 } from '@/components/room-organizer/lib/types';
const CELL=.3, RADIUS=.22;
function segmentDistance(p:Vec2,a:Vec2,b:Vec2):number {
  const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
  const t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len)):0;
  return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
}
const passable=new Set(['rug','painting','curtains','wall-clock','pendant-light','wall-shelf','window','door','person']);
export function blocked(p:Vec2,floor:FloorLayout,width:number,depth:number):boolean {
  if(Math.abs(p.x)>width/2-RADIUS||Math.abs(p.z)>depth/2-RADIUS)return true;
  for(const i of floor.items){if(!i.position||passable.has(i.type))continue;
    const angle=-(i.rotation??0),dx=p.x-i.position.x,dz=p.z-i.position.z;
    const x=dx*Math.cos(angle)-dz*Math.sin(angle),z=dx*Math.sin(angle)+dz*Math.cos(angle);
    if(Math.abs(x)<i.width/2+RADIUS&&Math.abs(z)<i.depth/2+RADIUS)return true;
  }
  for(const w of floor.interiorWalls??[]){
    if(segmentDistance(p,{x:w.x1,z:w.z1},{x:w.x2,z:w.z2})>.1+RADIUS)continue;
    const door=floor.items.some(i=>i.type==='door'&&i.position&&segmentDistance(i.position,{x:w.x1,z:w.z1},{x:w.x2,z:w.z2})<.3&&Math.hypot(p.x-i.position.x,p.z-i.position.z)<i.width/2-RADIUS);
    if(!door)return true;
  }return false;
}
export function findPath(from:Vec2,to:Vec2,floor:FloorLayout,width:number,depth:number,item?:FurnitureItem):Vec2[]|null {
  const nx=Math.floor(width/CELL),nz=Math.floor(depth/CELL);
  const point=(k:number):Vec2=>({x:-width/2+CELL/2+(k%nx)*CELL,z:-depth/2+CELL/2+Math.floor(k/nx)*CELL});
  const free:number[]=[];for(let k=0;k<nx*nz;k++)if(!blocked(point(k),floor,width,depth))free.push(k);
  if(!free.length)return null;
  const nearest=(p:Vec2)=>free.reduce((a,b)=>Math.hypot(point(a).x-p.x,point(a).z-p.z)<Math.hypot(point(b).x-p.x,point(b).z-p.z)?a:b,free[0]!);
  const start=nearest(from),end=nearest(to),allowed=new Set(free),previous=new Map<number,number>([[start,-1]]),queue=[start];let found:number|undefined;
  for(let q=0;q<queue.length;q++){
    const k=queue[q]!,p=point(k);
    if(item?Math.hypot(p.x-to.x,p.z-to.z)<=Math.hypot(item.width,item.depth)/2+.65:k===end){found=k;break;}
    const x=k%nx,z=Math.floor(k/nx);
    for(const [xx,zz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]){if(xx===undefined||zz===undefined||xx<0||zz<0||xx>=nx||zz>=nz)continue;const j=zz*nx+xx;if(allowed.has(j)&&!previous.has(j)){previous.set(j,k);queue.push(j);}}
  }
  if(found===undefined)return null;const path:Vec2[]=[];
  for(let k=found;k!==-1;k=previous.get(k)??-1)path.unshift(point(k));return path;
}
