import {passTime,remember,type LifeState} from './engine';
import {FAMILY_MEMBERS,familyPresent,type FamilyId} from './family';
import {recall} from './memory';

export type FamilyResponse='repair'|'confront'|'withdraw';
const cap=(n:number)=>Math.max(0,Math.min(100,n));
export function conversationError(s:LifeState,id:FamilyId):string|null{
  if(id==='self'||!FAMILY_MEMBERS.some(m=>m.id===id))return 'Choose a relative.';
  if(s.completed||s.health<=0)return 'This life has ended.';
  if(s.stage<1||!familyPresent(id,s.stage))return 'These conversations begin in childhood.';
  if(s.family.conversationDays[id]===Math.floor(s.minute/1440)+1)return 'Give this conversation until tomorrow to settle.';
  return null;
}
export function familyConversation(s:LifeState,id:FamilyId){
  const member=FAMILY_MEMBERS.find(m=>m.id===id&&m.id!=='self');if(!member)return null;
  const bond=s.family.bonds[id].self!;
  const memory=recall(s.memories.filter(m=>m.topic==='family-dinner'||m.topic==='family-moment'&&m.text.includes(member.name)||m.topic==='family'&&(m.text.includes(member.name)||member.role==='parent')),member.name+' family dinner',s.minute,1)[0];
  const guarded=bond.resentment>=25||bond.trust<45;
  const opening=guarded?'I am still upset. I can listen, but I am not ready to pretend everything is fine.':member.role==='parent'?'I thought I was being fair. Tell me what I missed.':id==='older'?'Being the oldest does not mean I always know what I am doing.':'Sometimes everyone talks about me instead of asking me.';
  return {name:member.name,guarded,opening,memory:memory?.text??null};
}
export function resolveFamilyConversation(s:LifeState,id:FamilyId,response:FamilyResponse):LifeState{
  if(conversationError(s,id)||!['repair','confront','withdraw'].includes(response))return s;
  const conversation=familyConversation(s,id)!;
  const n=passTime(s,30),family=structuredClone(n.family),toward=family.bonds[id].self!,outward=family.bonds.self[id]!;
  family.conversationDays[id]=Math.floor(n.minute/1440)+1;
  let result:string;
  if(response==='repair'){
    const gain=conversation.guarded?2:7;
    toward.trust=cap(toward.trust+gain);toward.resentment=cap(toward.resentment-(conversation.guarded?2:6));
    outward.trust=cap(outward.trust+3);outward.resentment=cap(outward.resentment-4);
    result=conversation.guarded?'They agree to try again, but the hurt will take time.':'You both name one thing to do differently. Trust starts to recover.';
  }else if(response==='confront'){
    outward.resentment=cap(outward.resentment-5);
    if(conversation.guarded){toward.resentment=cap(toward.resentment+5);result='They get defensive. You have said what you need, even though they are not ready to hear it.';}
    else{
      toward.trust=cap(toward.trust+4);
      if(id==='parent-a'||id==='parent-b'){
        const favorite=family.favorites[id];
        for(const child of ['older','self','younger'] as const)if(child!==favorite)family.bonds[id][child]!.affection=cap(family.bonds[id][child]!.affection+5);
        result='They acknowledge the unequal attention. They make an effort with both overlooked children.';
      }else{toward.resentment=cap(toward.resentment-4);result='You compare how the family treats each of you. Your sibling hears you out.';}
    }
  }else{
    outward.trust=cap(outward.trust-3);outward.resentment=cap(outward.resentment+4);
    result='You end the conversation and keep your distance. The unresolved hurt stays with you.';
  }
  return remember({...n,family,stageActions:n.stageActions+1},`${conversation.name}: “${conversation.opening}” You ${response==='repair'?'try to repair things':response==='confront'?'name the unfairness':'hold your grudge'}. ${result}`,'family-conversation',8);
}
