import * as THREE from 'three';

export function updateNameplate(label:THREE.Sprite,text:string,detail='',color='#315c4b'):void{
  const key=text+'|'+detail+'|'+color;if(label.userData.labelKey===key)return;
  label.userData.labelKey=key;
  const canvas=label.material.map!.image as HTMLCanvasElement;
  const ctx=canvas.getContext('2d');
  if(ctx){
    ctx.clearRect(0,0,384,120);
    ctx.fillStyle='rgba(250,248,239,.94)';ctx.beginPath();ctx.roundRect(8,8,368,104,25);ctx.fill();
    ctx.fillStyle=color;ctx.font='600 34px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,192,detail?42:60,350);
    if(detail){ctx.font='26px Arial';ctx.fillText(detail,192,82,350);}
  }
  label.material.map!.needsUpdate=true;
}
export function nameplate(text:string):THREE.Sprite{
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=120;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  label.scale.set(1.35,.42,1);label.position.y=2.10;updateNameplate(label,text);return label;
}
