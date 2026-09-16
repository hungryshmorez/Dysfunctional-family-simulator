/* Adapted from Joon Sung Park's Generative Agents retrieve.py, Apache-2.0.
 * See docs/THIRD_PARTY.md and docs/licenses/generative-agents-LICENSE.
 * Changed: TypeScript arrays, elapsed-time recency, lexical relevance instead
 * of paid embeddings; no LLM calls. Weighted normalized retrieval is retained.
 */
import type { Memory } from './engine';
const normalize=(values:number[])=>{const lo=Math.min(...values),hi=Math.max(...values);return values.map(v=>hi===lo?.5:(v-lo)/(hi-lo));};
export function recall(memories:Memory[],query:string,minute:number,count=3):Memory[]{
  if(!memories.length)return [];
  const words=new Set(query.toLowerCase().split(/\W+/).filter(w=>w.length>2));
  const recency=normalize(memories.map(m=>.995**Math.max(0,(minute-m.minute)/60)));
  const importance=normalize(memories.map(m=>m.importance));
  const relevance=normalize(memories.map(m=>[...words].filter(w=>(m.topic+' '+m.text).toLowerCase().includes(w)).length));
  return memories.map((m,i)=>({m,score:.5*(recency[i]??0)+3*(relevance[i]??0)+2*(importance[i]??0)})).sort((a,b)=>b.score-a.score).slice(0,count).map(x=>x.m);
}
