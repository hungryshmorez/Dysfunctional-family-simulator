'use client';
import {FAMILY_MEMBERS} from './family';
import {momentText,type MomentResponse} from './family-moments';
import type {LifeState} from './engine';
export function HouseholdMomentPanel({life,busy,onRespond}:{life:LifeState;busy:boolean;onRespond:(response:MomentResponse)=>void}):JSX.Element{
  const moment=life.family.moment;
  const latest=life.memories.find(m=>m.topic==='family-moment');
  return <section className="family-pressure dinner-panel"><p className="life-eyebrow">LIFE IN THE HOUSEHOLD</p><h3>{moment?moment.kind==='argument'?'Voices are rising':'A little kindness':'Between family moments'}</h3>{moment?<><p>{momentText(moment)}</p><small>Day {Math.floor(moment.minute/1440)+1} · Their relationship has already changed. How do you respond?</small>{moment.kind==='argument'?<><button disabled={busy||life.completed||life.health<=0} onClick={()=>onRespond('mediate')}>Help them hear each other</button><button disabled={busy||life.completed||life.health<=0} onClick={()=>onRespond('side')}>Back {FAMILY_MEMBERS.find(m=>m.id===moment.actor)!.name}</button></>:<button disabled={busy||life.completed||life.health<=0} onClick={()=>onRespond('join')}>Join the moment</button>}<button disabled={busy||life.completed||life.health<=0} onClick={()=>onRespond('leave')}>Give them space</button><small>Responding takes 15 minutes. Mediation depends on their trust in you.</small></>:<p>{life.stage<1?'From childhood, relatives will start their own arguments and moments of support.':'As time passes, relatives act on their own tensions and make time for one another. The next moment can happen after three game hours.'}</p>}{latest&&!moment&&<details><summary>Last household moment</summary><p>{latest.text}</p></details>}</section>;
}
