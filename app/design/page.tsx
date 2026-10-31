'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { parseLife, passTime, remember } from '@/components/life-sim/engine';
import { homeCost } from '@/components/life-sim/home';
import { beginDesign, contractErrors, DRAFT_KEY, loadProperties, saveBlueprint, saveProperties } from '@/components/life-sim/properties';
import { layoutStore, useLayout } from '@/components/room-organizer/hooks/use-layout-store';
import { loadLayout } from '@/components/room-organizer/lib/persistence';
const Builder=dynamic(()=>import('./design-editor'),{ssr:false});
export default function DesignPage():JSX.Element {
  const [ready,setReady]=useState(false),[name,setName]=useState('My first house'),[message,setMessage]=useState('Client brief: ≤120 m², furnishings ≤$8,000. Place a bed, fridge, shower and computer with clear paths on the ground floor.');
  const layout=useLayout(),[editorReady,setEditorReady]=useState(false),[issues,setIssues]=useState<string[]>([]),[checking,setChecking]=useState(true);
  const editorLoaded=useCallback(()=>setEditorReady(true),[]);
  useEffect(()=>{try{beginDesign();setName(loadLayout(DRAFT_KEY)?.name??'My first house');setReady(true);}catch(e){setMessage(String(e));}},[]);
  useEffect(()=>{if(!editorReady)return;setChecking(true);const timer=setTimeout(()=>{setIssues(contractErrors(layout));setChecking(false);},250);return()=>clearTimeout(timer);},[layout,editorReady]);
  function save(submit:boolean){try{
    const layout=layoutStore.getState().layout;let p=loadProperties();
    if(submit){const errors=contractErrors(layout);if(errors.length){setMessage(errors.join(' '));return;}
      const life=parseLife(JSON.parse(localStorage.getItem('yourspace-life-v1')??'null'));if(!life||life.stage<3||life.job!=='architect'||life.completed||life.health<=0){setMessage('Apply for the House designer job on your household computer first. You can still save this blueprint.');return;}
      if(!p.contract||p.contract.submitted||life.unlocks.includes('contract-'+p.contract.id)){setMessage('This contract has already been paid. Return to life to start another.');return;}
      const contract=p.contract;
      p=saveBlueprint(p,layout,name);saveProperties(p);
      const next=passTime(life,240);localStorage.setItem('yourspace-life-v1',JSON.stringify(remember({...next,money:next.money+220,shifts:next.shifts+1,stageActions:next.stageActions+1,skills:{...next.skills,creativity:next.skills.creativity+2},unlocks:[...next.unlocks,'contract-'+contract.id]},`Delivered ${name}. Earned $220 and saved its blueprint.`,'career',9)));
      saveProperties({...p,contract:{...contract,submitted:true}});setMessage('Client approved! $220 earned, creativity +2. Blueprint saved. Return to life to place it in town.');
    }else{saveProperties(saveBlueprint(p,layout,name));setMessage('Blueprint saved to your Town shelf. You can place it on a lot when you return.');}
  }catch(e){setMessage('Could not save: '+String(e));}}
  return <>{ready&&<Builder onReady={editorLoaded}/>}<section className="design-toolbar"><details open><summary>House design studio</summary><p role="status">{message}</p>{editorReady&&<div className="design-checks"><strong>Client brief</strong><div className="design-budget"><span>{Math.round(layout.width*layout.height)} / 120 m²</span><span>${homeCost(layout).toLocaleString()} / $8,000</span></div><progress aria-label="Client furnishing budget" max={8000} value={Math.min(8000,homeCost(layout))}/>{checking?<p>Checking the design…</p>:issues.length?<ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>✓ Layout meets the brief. Ready for client review.</p>}</div>}<label>Blueprint name <input maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><div><button disabled={!editorReady||!name.trim()} onClick={()=>save(false)}>Save blueprint</button><button disabled={!editorReady||checking||issues.length>0||!name.trim()} onClick={()=>save(true)}>Submit to client · $220</button><Link href="/">Return to life →</Link></div></details></section></>;
}
