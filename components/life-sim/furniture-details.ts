import * as THREE from 'three';
import type { FurnitureItem } from '@/components/room-organizer/lib/types';

export function detailFurniture(model:THREE.Group,item:FurnitureItem):void {
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.75}));
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;model.add(mesh);return mesh;
  }
  if(item.type==='computer'){
    // Raise the original electronics onto a desk, within the saved footprint.
    model.children.forEach(child=>{child.position.y+=.74;});
    box(0,.72,0,item.width,.06,item.depth,'#bf9c75');
    for(const x of [-1,1])for(const z of [-1,1])box(x*item.width*.43,.35,z*item.depth*.4,.045,.7,.045,'#424d4c');
    box(0,.765,item.depth*.3,item.width*.48,.02,item.depth*.2,'#e3e5df');
    for(let row=0;row<3;row++)for(let key=0;key<9;key++)box((key-4)*item.width*.045,.778,item.depth*(.24+row*.06),item.width*.031,.005,.018,'#8f9c99');
  }
  if(item.type==='table'||item.type==='coffee-table'){
    box(-.15,item.height+.025,0,.25,.035,.18,'#e6b177');
    box(-.13,item.height+.055,.01,.22,.025,.16,'#677e86');
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.05,.045,.12,16),new THREE.MeshStandardMaterial({color:'#efe9dc'}));
    cup.position.set(.25,item.height+.06,.04);cup.castShadow=true;model.add(cup);
  }
  if(item.type==='bed'){
    box(0,item.height*.83,.15,item.width*.98,.045,item.depth*.45,'#8a9f91');
    for(let stripe=0;stripe<9;stripe++)box(-item.width*.44+stripe*item.width*.11,item.height*.83+.025,.15,.012,.004,item.depth*.44,'#c8d2bc');
  }
}
