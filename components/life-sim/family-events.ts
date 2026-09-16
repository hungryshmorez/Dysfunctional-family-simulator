import { remember,type LifeState } from './engine';

const pressures={
  boy:[
    'You come home upset after being picked on. Morgan says, “Boys toughen up.” Casey tells you to hit back; Riley is watching to learn whether crying is allowed.',
    'You want to quit a competitive sport you dread. Morgan calls it giving up and compares you with Casey. You would rather make music, but asking feels like admitting weakness.',
    'Your first job barely covers your bills. Morgan says a young man should already be able to provide. Casey gets praised for earning more; nobody asks whether you are exhausted.',
    'The family treats your wages as proof of your worth. You want more time with people you love, but Dana calls taking fewer shifts irresponsible.',
    'You admit you are lonely. Morgan changes the subject to work; Casey makes a joke. Riley waits to see whether you will try saying it again.',
    'You need help with everyday tasks. Morgan’s old “handle it yourself” rule still echoes in your head. Riley offers a hand, and accepting it feels harder than the task.',
  ],
  girl:[
    'You come home angry after being picked on. Dana says, “Be a nice girl.” Casey gets room to be loud; you are asked to soothe Riley before anyone hears what happened to you.',
    'You want to go out with friends. Morgan sets stricter rules for you than for Casey, calling it protection. Comments about your clothes make the argument feel even less like a conversation.',
    'At your first job, your ideas are overlooked until someone repeats them. At home, Dana asks whether you sounded too demanding. You want support, not another lesson in being agreeable.',
    'You have paid work, but the family still assumes you will organize meals, appointments and everyone’s feelings. Casey calls helping a favor; your contribution goes unnamed.',
    'A relative needs care. Dana says you are “naturally better at it” and hands you the schedule. Your own plans disappear while Casey’s are treated as fixed.',
    'You ask for time that belongs to you. Casey says the family has always depended on you keeping everyone together. Riley asks what you would choose if nobody needed anything.',
  ],
};
export function familyPressure(s:LifeState):string|null{
  if(!s.gender||s.stage<1||s.family.resolvedStages.includes(s.stage))return null;
  return pressures[s.gender][s.stage-1]??null;
}
export function resolveFamilyPressure(s:LifeState,choice:'support'|'comply'):LifeState{
  const event=familyPressure(s);if(!event||s.completed||s.health<=0)return s;
  const family=structuredClone(s.family);family.resolvedStages.push(s.stage);
  const parent=s.gender==='boy'?'parent-b':'parent-a';
  const selfBond=family.bonds.self[parent]!,parentBond=family.bonds[parent].self!,siblingBond=family.bonds.younger.self!;
  if(choice==='support'){
    selfBond.trust=Math.min(100,selfBond.trust+5);selfBond.resentment=Math.max(0,selfBond.resentment-4);
    parentBond.trust=Math.max(0,parentBond.trust-3);siblingBond.trust=Math.min(100,siblingBond.trust+8);
  }else{
    parentBond.affection=Math.min(100,parentBond.affection+5);selfBond.resentment=Math.min(100,selfBond.resentment+10);
    selfBond.trust=Math.max(0,selfBond.trust-5);
  }
  return remember({...s,family},event+' '+(choice==='support'?'You name what you need and ask Riley to stand with you. The parent resists; Riley learns that asking for support is allowed.':'You keep the peace for now. The parent approves, but your resentment grows.'),'family',9);
}
