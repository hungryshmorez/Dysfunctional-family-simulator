'use client';
import { useEffect, useRef } from 'react';
import { FAMILY_MEMBERS,familyPresent,type FamilyId } from './family';
import { blocked, findPath } from './navigation';
import { conversationPath } from './social-navigation';
import type { WorldProps } from './world';
import type { Vec2 } from '@/components/room-organizer/lib/types';

// A fully playable canvas fallback for devices whose browser cannot create WebGL.
export function FlatWorld(props:WorldProps):JSX.Element {
  const canvas=useRef<HTMLCanvasElement>(null),live=useRef(props);live.current=props;
  useEffect(()=>{
    const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx){live.current.onError('This browser could not draw the home. Try another browser.');return;}
    const floor=props.home.floors[0]!,width=props.home.width,depth=props.home.height;
    let w=1,h=1,scale=1,ox=0,oy=0,raf=0,last=performance.now(),id=-1,path:Vec2[]=[],clock=0,phase='quiet',left=0,repath=0,cooldown=0,repel=live.current.repel,enemyPath:Vec2[]=[],lastStatus='';
    const start=findPath({x:0,z:1},{x:0,z:1},floor,width,depth)?.[0]??{x:0,z:0};let player={...start},enemy={x:0,z:0};const keys=new Set<string>();
    const roster=[{name:'Rowan',id:'Rowan',familyId:null},{name:'Jules',id:'Jules',familyId:null},...FAMILY_MEMBERS.filter(m=>m.id!=='self').map(m=>({name:m.name,id:'family:'+m.id,familyId:m.id as FamilyId}))];
    const people=roster.map((person,i)=>({...person,position:findPath(start,{x:Math.cos(i/roster.length*Math.PI*2)*2.8,z:Math.sin(i/roster.length*Math.PI*2)*2.8},floor,width,depth)?.at(-1)??start}));
    const resize=()=>{const r=el.getBoundingClientRect();w=r.width;h=r.height;const ratio=Math.min(devicePixelRatio,2);el.width=w*ratio;el.height=h*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);scale=Math.min((w-65)/(width+2),(h-140)/(depth+2));scale=Math.max(5,scale);ox=w/2;oy=h/2+30;};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const move=(actor:{x:number;z:number},points:Vec2[],step:number)=>{const target=points[0];if(!target)return false;const dx=target.x-actor.x,dz=target.z-actor.z,d=Math.hypot(dx,dz);if(d<=step){actor.x=target.x;actor.z=target.z;points.shift();}else{actor.x+=dx/d*step;actor.z+=dz/d*step;}return true;};
    const keydown=(e:KeyboardEvent)=>{if(live.current.paused||e.target instanceof HTMLElement&&(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)))return;const k=e.key.toLowerCase();if(['w','a','s','d','shift'].includes(k)){keys.add(k);e.preventDefault();}};
    const keyup=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase()),blur=()=>keys.clear();
    window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
    const pick=(e:PointerEvent)=>{const p=live.current;if(p.paused)return;const r=el.getBoundingClientRect(),point={x:(e.clientX-r.left-ox)/scale,z:(e.clientY-r.top-oy)/scale};const person=people.find(person=>(!person.familyId||familyPresent(person.familyId,p.stage))&&Math.hypot(point.x-person.position.x,point.z-person.position.z)<.4);if(person){p.onPerson?.(person.id);return;}for(const item of [...floor.items].reverse()){if(!item.position)continue;const a=-(item.rotation??0),dx=point.x-item.position.x,dz=point.z-item.position.z;if(Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<=item.width/2&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<=item.depth/2){p.onSelect(item);return;}}if(Math.abs(point.x)<width/2&&Math.abs(point.z)<depth/2)p.onWalk(point);};el.addEventListener('pointerup',pick);
    const dot=(point:Vec2,color:string,label:string,radius=.24)=>{const x=ox+point.x*scale,y=oy+point.z*scale;ctx.fillStyle='#203c3720';ctx.beginPath();ctx.ellipse(x+2,y+4,radius*scale,radius*scale*.7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(6,radius*scale),0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff8e4';ctx.lineWidth=2;ctx.stroke();ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillStyle='#294a36';ctx.fillText(label,x,y-12);};
    function frame(){raf=requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;const p=live.current;
      if(!p.command)path=[];if(p.command&&p.command.id!==id){id=p.command.id;const person=people.find(person=>person.id===p.command?.person&&(!person.familyId||familyPresent(person.familyId,p.stage)));const next=person?conversationPath(player,person.position,floor,width,depth):p.command.person?null:findPath(player,p.command.target,floor,width,depth,p.command.item);path=next??[];if(!next)p.onArrive(id,false);}
      if(p.paused)keys.clear();else{
        const held=(k:string)=>keys.has(k)||p.movement===k;const dx=Number(held('d'))-Number(held('a')),dz=Number(held('s'))-Number(held('w'));
        if(dx||dz){p.onManual();path=[];const amount=dt*(p.sprint||keys.has('shift')?3.8:2.4)/Math.hypot(dx,dz);const x={x:player.x+dx*amount,z:player.z};if(!blocked(x,floor,width,depth))player=x;const z={x:player.x,z:player.z+dz*amount};if(!blocked(z,floor,width,depth))player=z;}else if(move(player,path,dt*2.4)&&!path.length)p.onArrive(id,true);
        if(repel!==p.repel||!p.danger){repel=p.repel;phase='quiet';clock=0;}if(p.danger){clock+=dt;cooldown-=dt;if(phase==='quiet'&&clock>=45){phase='warning';p.onThreat('A prowler is approaching. Get ready to run.');}if(phase==='warning'&&clock>=53){const destination={x:player.x>0?-width/2+1:width/2-1,z:player.z>0?-depth/2+1:depth/2-1};const pos=findPath(player,destination,floor,width,depth)?.at(-1);if(pos&&Math.hypot(pos.x-player.x,pos.z-player.z)>3){enemy={...pos};phase='attack';left=24;repath=0;p.onThreat('Prowler! Keep moving or sound the alarm.');}else{phase='quiet';clock=0;}}
          if(phase==='attack'){left-=dt;repath-=dt;if(repath<=0){enemyPath=findPath(enemy,player,floor,width,depth)??[];repath=.8;}move(enemy,enemyPath,dt*1.55);if(cooldown<=0&&Math.hypot(enemy.x-player.x,enemy.z-player.z)<.75){cooldown=2;p.onHurt(12);}if(left<=0){phase='quiet';clock=0;p.onThreat('The prowler left. Rest to recover your health.');}}}
      }
      const seconds=phase==='warning'?Math.max(0,Math.ceil(53-clock)):phase==='attack'?Math.max(0,Math.ceil(left)):0;const status=phase+seconds;if(status!==lastStatus){lastStatus=status;p.onThreatState({phase,seconds});}
      ctx!.clearRect(0,0,w,h);ctx!.fillStyle='#bbceb6';ctx!.fillRect(0,0,w,h);
      for(let i=0;i<12;i++){const angle=i/12*Math.PI*2;ctx!.fillStyle=i%2?'#a3ba97':'#aabf9c';ctx!.beginPath();ctx!.arc(ox+Math.cos(angle)*(width/2+2)*scale,oy+Math.sin(angle)*(depth/2+2)*scale,scale*.65,0,Math.PI*2);ctx!.fill();}
      ctx!.shadowColor='#28493130';ctx!.shadowBlur=20;ctx!.shadowOffsetY=12;ctx!.fillStyle='#f4efda';ctx!.fillRect(ox-width/2*scale-6,oy-depth/2*scale-6,width*scale+12,depth*scale+12);ctx!.shadowBlur=0;ctx!.shadowOffsetY=0;ctx!.fillStyle=floor.floorColor;ctx!.fillRect(ox-width/2*scale,oy-depth/2*scale,width*scale,depth*scale);
      ctx!.strokeStyle='#ffffff18';ctx!.lineWidth=1;for(let x=-width/2;x<=width/2;x+=.5){ctx!.beginPath();ctx!.moveTo(ox+x*scale,oy-depth/2*scale);ctx!.lineTo(ox+x*scale,oy+depth/2*scale);ctx!.stroke();}
      for(const item of floor.items){if(!item.position)continue;ctx!.save();ctx!.translate(ox+item.position.x*scale,oy+item.position.z*scale);ctx!.rotate(item.rotation??0);ctx!.fillStyle=item.color;ctx!.strokeStyle='#2a403650';ctx!.lineWidth=1;ctx!.fillRect(-item.width*scale/2,-item.depth*scale/2,item.width*scale,item.depth*scale);ctx!.strokeRect(-item.width*scale/2,-item.depth*scale/2,item.width*scale,item.depth*scale);ctx!.restore();}
      ctx!.strokeStyle='#eef0df';ctx!.lineWidth=5;for(const wall of floor.interiorWalls??[]){ctx!.beginPath();ctx!.moveTo(ox+wall.x1*scale,oy+wall.z1*scale);ctx!.lineTo(ox+wall.x2*scale,oy+wall.z2*scale);ctx!.stroke();}
      if(path.length){ctx!.strokeStyle='#f9e6a6';ctx!.lineWidth=2;ctx!.setLineDash([3,5]);ctx!.beginPath();ctx!.moveTo(ox+player.x*scale,oy+player.z*scale);path.forEach(point=>ctx!.lineTo(ox+point.x*scale,oy+point.z*scale));ctx!.stroke();ctx!.setLineDash([]);}
      people.forEach((person,i)=>{if(!person.familyId||familyPresent(person.familyId,p.stage))dot(person.position,i?'#db7d83':'#687aec',person.name);});dot(player,'#e9b656','YOU');if(phase==='attack')dot(enemy,'#a42e49','PROWLER');ctx!.font='10px Arial';ctx!.textAlign='right';ctx!.fillStyle='#648064';ctx!.fillText('ILLUSTRATED FLOOR PLAN',w-18,h-78);
    }frame();return()=>{cancelAnimationFrame(raf);observer.disconnect();el.removeEventListener('pointerup',pick);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);};
  },[props.home]);
  return <canvas className="life-world flat-world" ref={canvas} aria-label="Illustrated home floor plan. WASD or arrows to move; tap furniture for actions."/>;
}
