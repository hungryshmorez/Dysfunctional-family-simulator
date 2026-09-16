import { describe, expect, it } from 'vitest';
import { newLife, parseLife, passTime, soundAlarm } from './engine';
import { starterHome } from './home';
import { LIFE_KEY, parseBundle, writeBundle } from './save-system';
import { defaultPattern, parsePattern, wav } from './studio-engine';

describe('save and studio recovery',()=>{
  it('restores earlier keys when an import runs out of storage',()=>{
    const values=new Map<string,string>([[LIFE_KEY,'previous life']]);
    let writes=0;
    const storage={get length(){return values.size;},clear:()=>values.clear(),key:(index:number)=>[...values.keys()][index]??null,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(++writes===2)throw new Error('Quota');values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}} satisfies Storage;
    expect(()=>writeBundle(storage,{life:newLife(),home:starterHome()})).toThrow('Quota');
    expect([...values.entries()]).toEqual([[LIFE_KEY,'previous life']]);
  });
  it('rejects damaged imports before touching the current life',()=>{
    expect(parseBundle({life:newLife(),home:starterHome()})).not.toBeNull();
    expect(parseBundle({life:{...newLife(),health:-2},home:starterHome()})).toBeNull();
    expect(parseBundle({life:newLife(),home:starterHome(),properties:{lots:'broken'}})).toBeNull();
  });
  it('preserves the daily alarm cooldown after reloading',()=>{
    const used=soundAlarm(newLife());
    const reloaded=parseLife(JSON.parse(JSON.stringify(used)))!;
    expect(soundAlarm(reloaded)).toBe(reloaded);
    const tomorrow=passTime(reloaded,1440);
    expect(soundAlarm(tomorrow).alarmDay).toBeGreaterThan(used.alarmDay);
  });
  it('accepts complete drum patterns and rejects invalid timing and steps',()=>{
    expect(parsePattern(defaultPattern())).not.toBeNull();
    expect(parsePattern({...defaultPattern(),bpm:Infinity})).toBeNull();
    expect(parsePattern({...defaultPattern(),pattern:[[true]]})).toBeNull();
    expect(parsePattern({...defaultPattern(),volumes:[1,1,1,2]})).toBeNull();
  });
  it('exports a playable PCM WAV header and clamps overloaded samples',()=>{
    const view=new DataView(wav({sampleRate:44100,getChannelData:()=>new Float32Array([-2,0,2])} as unknown as AudioBuffer));
    expect(view.getUint32(24,true)).toBe(44100);
    expect(view.getUint32(40,true)).toBe(6);
    expect(view.getInt16(44,true)).toBe(-32768);
    expect(view.getInt16(48,true)).toBe(32767);
  });
});
