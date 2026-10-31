'use client';
import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { FAMILY_MEMBERS,newFamily } from '@/components/life-sim/family';
import { starterHome } from '@/components/life-sim/home';
import { World } from '@/components/life-sim/world';
import type { FamilyMood } from '@/components/life-sim/family-mood';

const noop=()=>{};
export default function SceneReview():JSX.Element{
  const home=useMemo(()=>starterHome(),[]),[minute,setMinute]=useState(660),[paused,setPaused]=useState(true),[message,setMessage]=useState('Drag to orbit. Compare House view and Follow me, then save an image of the actual scene.');
  const [mood,setMood]=useState<FamilyMood>('neutral');
  const [momentMode,setMomentMode]=useState<'none'|'argument'|'support'>('none');
  const family=useMemo(()=>{const f=newFamily();for(const from of FAMILY_MEMBERS)for(const to of FAMILY_MEMBERS){if(from.id===to.id)continue;const bond=f.bonds[from.id][to.id]!;bond.resentment=mood==='angry'?60:mood==='guarded'?30:0;bond.trust=mood==='warm'?80:60;bond.affection=mood==='warm'?80:55;}if(momentMode!=='none'){f.moment={kind:momentMode,actor:'older',target:'younger',minute:0};f.lastMomentMinute=0;}return f;},[mood,momentMode]);
  useEffect(()=>{(window as unknown as {__pcReady:boolean}).__pcReady=true;},[]);
  return <main className="scene-review"><header><div><strong>Dysfunctional Family Simulator</strong><p>Core scene review · Adult character · Starter home</p></div><Link href="/">Return to game</Link></header><section className="scene-review-controls"><label>Lighting time <select value={minute} onChange={e=>setMinute(Number(e.target.value))}><option value={420}>Early morning</option><option value={660}>Late morning</option><option value={1020}>Afternoon</option><option value={1140}>Evening</option><option value={1320}>Night</option></select></label><label>Family mood <select value={mood} onChange={e=>setMood(e.target.value as FamilyMood)}><option value="neutral">Settled</option><option value="warm">Feeling close</option><option value="guarded">Guarded</option><option value="angry">Resentful</option></select></label><label>Family scene <select value={momentMode} onChange={e=>{setMomentMode(e.target.value as 'none'|'argument'|'support');setPaused(false);}}><option value="none">Free roaming</option><option value="argument">Sibling argument</option><option value="support">Sibling support</option></select></label><button onClick={()=>setPaused(v=>!v)}>{paused?'Animate scene':'Freeze scene'}</button><span>No household progress is changed here.</span></section><div className="scene-review-world"><World sceneReview family={family} home={home} stage={3} minute={minute} command={null} paused={paused} danger={false} movement="" sprint={false} repel={0} onThreatState={noop} onManual={noop} onHurt={noop} onThreat={noop} onSelect={noop} onWalk={noop} onArrive={noop} onError={setMessage}/></div><p role="status">{message}</p></main>;
}
