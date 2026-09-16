import * as THREE from 'three';

export function startGraphics():{renderer:THREE.WebGLRenderer;reducedQuality:boolean}{
  let reason='The browser refused to create a WebGL 2 graphics context.';
  for(const antialias of [true,false]){
    const canvas=document.createElement('canvas');
    const failed=(event:Event)=>{const message=(event as WebGLContextEvent).statusMessage;if(message)reason=message;};
    canvas.addEventListener('webglcontextcreationerror',failed);
    try{
      const renderer=new THREE.WebGLRenderer({canvas,antialias,alpha:false});
      return {renderer,reducedQuality:!antialias};
    }catch(error){if(error instanceof Error&&!reason)reason=error.message;}
    finally{canvas.removeEventListener('webglcontextcreationerror',failed);}
  }
  throw new Error(reason);
}
