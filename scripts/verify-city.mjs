import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import init from '../public/city-engine/micropolisengine.js';
import { createSimulation } from '../public/city-work/create-simulation.js';
const base=new URL('../public/city-engine/',import.meta.url);
const data=await readFile(new URL('micropolisengine.data',base));
const engine=await init({wasmBinary:await readFile(new URL('micropolisengine.wasm',base)),locateFile:f=>fileURLToPath(new URL(f,base)),getPreloadedPackage:()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),print:()=>{},printErr:console.error});
const sim=createSimulation(engine);
try{
  for(const [tool,x,y] of [['TOOL_RESIDENTIAL',45,40],['TOOL_RESIDENTIAL',50,40],['TOOL_COMMERCIAL',55,40],['TOOL_FIRESTATION',60,40]])sim.doTool(engine.EditingTool[tool],x,y);
  for(let x=44;x<56;x++)sim.doTool(engine.EditingTool.TOOL_ROAD,x,43);
  const metrics={homes:0,shops:0,fire:0,roads:0,funds:sim.totalFunds};
  for(let x=0;x<120;x++)for(let y=0;y<100;y++){const cell=sim.getTile(x,y),t=cell&1023;if(t>=64&&t<=206)metrics.roads++;if(cell&1024){if(t>=240&&t<405)metrics.homes++;if(t>=423&&t<612)metrics.shops++;if(t===765)metrics.fire++;}}
  if(metrics.homes<2||metrics.shops<1||metrics.fire<1||metrics.roads<12||metrics.funds<6000)throw new Error('City assignment cannot complete: '+JSON.stringify(metrics));
  console.log('Native city assignment passed:',JSON.stringify(metrics));
}finally{sim.delete();}
