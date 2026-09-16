import {FAMILY_MEMBERS,familyPresent,type FamilyBond,type FamilyId,type FamilyState} from './family';
export type FamilyMood='neutral'|'warm'|'guarded'|'angry';
export const MOOD_LABELS:Record<FamilyMood,string>={neutral:'Settled',warm:'Feeling close',guarded:'Guarded',angry:'Resentful'};
export function bondMood(bond:FamilyBond):FamilyMood{
  if(bond.resentment>=45)return 'angry';
  if(bond.resentment>=25||bond.trust<45)return 'guarded';
  if(bond.trust>=65&&bond.affection>=60)return 'warm';
  return 'neutral';
}
/** Talking uses the bond toward the player; idle mood reflects the strongest household tension. */
export function familyMood(family:FamilyState|undefined,id:FamilyId,stage:number,talking=false):FamilyMood{
  if(!family||id==='self')return 'neutral';
  if(talking)return bondMood(family.bonds[id].self!);
  if(family.moment&&(family.moment.actor===id||family.moment.target===id)){
    const other=family.moment.actor===id?family.moment.target:family.moment.actor;
    return family.moment.kind==='argument'?(family.bonds[id][other]!.resentment>=45?'angry':'guarded'):'warm';
  }
  const moods=FAMILY_MEMBERS.filter(m=>m.id!==id&&familyPresent(m.id,stage)).map(m=>bondMood(family.bonds[id][m.id]!));
  return moods.includes('angry')?'angry':moods.includes('guarded')?'guarded':moods.includes('warm')?'warm':'neutral';
}
