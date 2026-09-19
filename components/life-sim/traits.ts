import { remember, type LifeState } from './engine';
import { FAMILY_MEMBERS, type FamilyBond } from './family';
import type { Skill } from './story';

// Life traits chosen at character creation. Each one gives a head start in a
// skill AND bends the family you're born into — how much they trust you, lean
// on you, or clash with you — so the story you walk into is already coloured
// before the first beat.

export interface Trait {
  id: string;
  name: string;
  blurb: string;
  /** One line on how it bends the household. */
  world: string;
  skills: Partial<Record<Skill, number>>;
  /** Applied to every family member's bond toward you. */
  toYou?: Partial<FamilyBond>;
  /** Applied to your bond toward each of them. */
  fromYou?: Partial<FamilyBond>;
  /** Extra starting money. */
  money?: number;
}

export const MAX_TRAITS = 2;

export const TRAITS: readonly Trait[] = [
  { id: 'creative', name: 'Creative', blurb: 'You make things to make sense of the world.', world: 'They call it daydreaming — trust starts a little lower.', skills: { creativity: 2 }, toYou: { trust: -3 } },
  { id: 'studious', name: 'Studious', blurb: 'You read the room and the books.', world: 'Seen as the reliable one — the family trusts you more.', skills: { learning: 2 }, toYou: { trust: 5 } },
  { id: 'caretaker', name: 'Caretaker', blurb: 'You hold everyone together, whether you meant to or not.', world: 'They adore you and lean on you — affection up, but you carry more.', skills: { kindness: 2 }, toYou: { affection: 5 }, fromYou: { resentment: 4 } },
  { id: 'rebellious', name: 'Rebellious', blurb: 'You push back before you think it through.', world: 'More friction at home — resentment runs hotter from the start.', skills: { creativity: 1, learning: 1 }, toYou: { resentment: 7, trust: -3 } },
  { id: 'easygoing', name: 'Easygoing', blurb: 'You let most of it roll off.', world: 'You keep the peace — less resentment all round.', skills: { kindness: 1 }, toYou: { affection: 3 }, fromYou: { resentment: -5 } },
  { id: 'ambitious', name: 'Ambitious', blurb: 'You already want out, and up.', world: 'You save what you can — a small head start, and quiet respect.', skills: { learning: 1, creativity: 1 }, toYou: { trust: 2 }, money: 150 },
];

export function traitById(id: string): Trait | undefined {
  return TRAITS.find((t) => t.id === id);
}

const clamp = (n: number): number => Math.max(0, Math.min(100, n));
const bend = (bond: FamilyBond, d?: Partial<FamilyBond>): void => {
  if (!d) return;
  if (d.affection !== undefined) bond.affection = clamp(bond.affection + d.affection);
  if (d.trust !== undefined) bond.trust = clamp(bond.trust + d.trust);
  if (d.resentment !== undefined) bond.resentment = clamp(bond.resentment + d.resentment);
};

/** Apply the chosen traits to a fresh life: skills, family bonds, money, and a memory. */
export function applyTraits(life: LifeState, ids: readonly string[]): LifeState {
  const chosen = ids.map(traitById).filter((t): t is Trait => !!t).slice(0, MAX_TRAITS);
  if (chosen.length === 0) return { ...life, traits: [] };

  const skills = { ...life.skills };
  const family = structuredClone(life.family);
  let money = life.money;

  for (const trait of chosen) {
    for (const [skill, amount] of Object.entries(trait.skills)) skills[skill as Skill] += amount ?? 0;
    money += trait.money ?? 0;
    for (const member of FAMILY_MEMBERS) {
      if (member.id === 'self') continue;
      bend(family.bonds[member.id].self!, trait.toYou);
      bend(family.bonds.self[member.id]!, trait.fromYou);
    }
  }

  const names = chosen.map((t) => t.name).join(' and ');
  const next: LifeState = { ...life, skills, family, money, traits: chosen.map((t) => t.id) };
  return remember(next, `You start out ${names.toLowerCase()}. ${chosen.map((t) => t.world).join(' ')}`, 'trait', 6);
}
