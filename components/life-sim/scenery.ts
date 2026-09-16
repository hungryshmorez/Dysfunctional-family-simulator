import * as THREE from 'three';
import type { RoomLayout } from '@/components/room-organizer/lib/types';

export function dressNeighborhood(scene: THREE.Scene, home: RoomLayout): void {
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.9}));
    mesh.position.set(x,y,z);mesh.castShadow=h>.1;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  }
  const front=home.height/2;
  box(0,-.22,front+3,home.width+12,.08,1.5,'#dedbd1');
  box(0,-.25,front+6,100,.08,4,'#707b7d');
  for(let x=-45;x<50;x+=5)box(x,-.2,front+6,2,.015,.1,'#e8e3cc');
  box(0,-.14,front+1.1,1.8,.1,2.2,'#e4d9bc');
  // Low garden borders frame the lot without obscuring the playable room.
  for(const side of [-1,1]) {
    for(let z=-front;z<front;z+=1.3)box(side*(home.width/2+1),.12,z,.6,.65,1.15,'#66846a');
    const x=side*(home.width/2+7);
    box(x,1.15,-5,5,2.8,5,side<0?'#e9d5bc':'#bdccd1');
    const roof=new THREE.Mesh(new THREE.ConeGeometry(4,1.8,4),new THREE.MeshStandardMaterial({color:'#65716e',roughness:1}));
    roof.rotation.y=Math.PI/4;roof.position.set(x,3.45,-5);roof.castShadow=true;scene.add(roof);
    for(const offset of [-1.3,1.3])box(x+offset,1.35,-2.48,.9,1.05,.04,'#90b9c8');
  }
  if(!home.floors[0]?.interiorWalls?.some(w=>w.id==='bedroom-side'))return;
  // Flush floor finishes remain traversable and are limited to this starter layout.
  box(3.9,.012,-3.3,4.15,.02,3.35,'#dce4df');
  for(let x=2;x<6;x+=.55)box(x,.024,-3.3,.015,.006,3.35,'#b6c8c3');
  for(let z=-4.7;z<-1.6;z+=.55)box(3.9,.024,z,4.15,.006,.015,'#b6c8c3');
  // Framed windows and original abstract artwork on the rear wall.
  for(const x of [-4,0,4]) {
    box(x,1.65,-4.88,1.5,1.35,.08,'#f6f1e6');
    box(x,1.65,-4.82,1.3,1.15,.03,'#a8cbd4');
    box(x,1.65,-4.78,.055,1.15,.035,'#f6f1e6');
    box(x,1.65,-4.78,1.3,.055,.035,'#f6f1e6');
    box(x,1,-4.72,1.65,.07,.27,'#eee4d4');
  }
  box(-5.87,1.6,1.2,.06,1.1,1.4,'#e9d9be');
  box(-5.82,1.6,1.2,.035,.9,1.2,'#bb7a5b');
  box(-5.79,1.65,1.35,.02,.6,.55,'#d7bf80');
}
