'use client';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { newNonce } from './bridge';
export function CityQuest({onClose,onComplete}:{onClose:()=>void;onComplete:()=>void}):JSX.Element {
  const ref=useRef<HTMLIFrameElement>(null),done=useRef(false),complete=useRef(onComplete);complete.current=onComplete;
  const [nonce]=useState(()=>newNonce());const [paid,setPaid]=useState(false);
  useEffect(()=>{function receive(e:MessageEvent){if(e.source!==ref.current?.contentWindow||e.origin!==location.origin||e.data?.type!=='yourspace:city-complete'||e.data?.nonce!==nonce||done.current)return;
      const m=e.data?.metrics;if(!m||![m.homes,m.shops,m.fire,m.roads,m.funds].every(x=>typeof x==='number'&&Number.isFinite(x))||m.homes<2||m.shops<1||m.fire<1||m.roads<12||m.funds<6000)return;done.current=true;setPaid(true);complete.current();}
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[nonce]);
  return <div className="life-modal-backdrop life-on-top"><section className="life-computer" role="dialog" aria-modal="true" aria-label="City Planning assignment"><header><div><strong>City Planning</strong><span>{paid?'Assignment paid · $150':'Neighborhood planner · $150 assignment'}</span></div><button autoFocus aria-label="Return from City Planning" onClick={onClose}><X/></button></header><iframe ref={ref} title="City Planning work assignment" src={'/city-work/index.html?nonce='+encodeURIComponent(nonce)} sandbox="allow-scripts allow-same-origin"/></section></div>;
}
