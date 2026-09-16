'use client';
import {useState} from 'react';
import {FAMILY_MEMBERS,type FamilyId} from './family';
import {conversationError,familyConversation,type FamilyResponse} from './family-conversation';
import type {LifeState} from './engine';
export function ConversationPanel({life,busy,onRespond}:{life:LifeState;busy:boolean;onRespond:(id:FamilyId,response:FamilyResponse)=>void}):JSX.Element{
  const [id,setId]=useState<FamilyId>('parent-a');
  const scene=familyConversation(life,id)!,error=conversationError(life,id);
  const result=life.memories.find(m=>m.topic==='family-conversation');
  return <section className="family-pressure dinner-panel"><p className="life-eyebrow">FAMILY CONVERSATION</p><h3>We need to talk</h3><label>Talk with<select value={id} onChange={e=>setId(e.target.value as FamilyId)}>{FAMILY_MEMBERS.filter(m=>m.id!=='self').map(m=><option key={m.id} value={m.id}>{m.name} · {m.label}</option>)}</select></label><p><strong>{scene.name}</strong> · {scene.guarded?'Still guarded':'Willing to listen'}</p><blockquote>“{scene.opening}”</blockquote>{scene.memory&&<details><summary>What this brings back</summary><p>{scene.memory}</p></details>}<button disabled={busy||!!error} onClick={()=>onRespond(id,'repair')}>Try to repair things</button><button disabled={busy||!!error} onClick={()=>onRespond(id,'confront')}>Name the unfairness</button><button disabled={busy||!!error} onClick={()=>onRespond(id,'withdraw')}>Hold my grudge. Walk away.</button><small>{error??'30 minutes · Once per relative per day. Trust and resentment shape the response.'}</small>{result&&<p role="status">{result.text}</p>}</section>;
}
