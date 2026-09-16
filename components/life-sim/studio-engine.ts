export interface StudioPattern { version:1; bpm:number; pattern:boolean[][]; volumes:number[]; muted:boolean[] }
export function defaultPattern():StudioPattern{return {version:1,bpm:110,pattern:Array.from({length:4},(_,r)=>Array.from({length:16},(_,s)=>r===0?s%4===0:r===1?s%8===4:r===2?s%2===0:false)),volumes:[.8,.65,.4,.8],muted:[false,false,false,false]};}
export function parsePattern(raw:unknown):StudioPattern|null{if(!raw||typeof raw!=='object')return null;const p=raw as StudioPattern;if(p.version!==1||!Number.isFinite(p.bpm)||p.bpm<50||p.bpm>200||!Array.isArray(p.pattern)||p.pattern.length!==4||!p.pattern.every(r=>Array.isArray(r)&&r.length===16&&r.every(v=>typeof v==='boolean'))||!Array.isArray(p.volumes)||p.volumes.length!==4||!p.volumes.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||!Array.isArray(p.muted)||p.muted.length!==4||!p.muted.every(v=>typeof v==='boolean'))return null;return p;}
export function voice(c:BaseAudioContext,destination:AudioNode,row:number,time:number,volume:number,sample:AudioBuffer|null):AudioScheduledSourceNode|null{
  if(row===3&&!sample)return null;
  const gain=c.createGain();gain.connect(destination);const duration=row===3?Math.min(sample!.duration,4):row===2?.075:.22;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume*.4,time+.003);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  let source:AudioScheduledSourceNode;let filter:BiquadFilterNode|undefined;
  if(row===3){const b=c.createBufferSource();b.buffer=sample;b.connect(gain);source=b;}
  else if(row===1||row===2){const noise=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),a=noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;const b=c.createBufferSource();b.buffer=noise;filter=c.createBiquadFilter();filter.type='highpass';filter.frequency.value=row===2?6500:1100;b.connect(filter);filter.connect(gain);source=b;}
  else{const o=c.createOscillator();o.frequency.setValueAtTime(145,time);o.frequency.exponentialRampToValueAtTime(42,time+.16);o.connect(gain);source=o;}
  source.onended=()=>{source.disconnect();filter?.disconnect();gain.disconnect();};source.start(time);source.stop(time+duration+.02);return source;
}
export function wav(buffer:AudioBuffer):ArrayBuffer{
  const data=buffer.getChannelData(0),bytes=new ArrayBuffer(44+data.length*2),v=new DataView(bytes);const word=(offset:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};word(0,'RIFF');v.setUint32(4,36+data.length*2,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,data.length*2,true);data.forEach((value,i)=>v.setInt16(44+i*2,Math.max(-1,Math.min(1,value))*(value<0?32768:32767),true));return bytes;
}
