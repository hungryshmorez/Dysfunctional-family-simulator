import type { FamilyBond } from './family';

// Ported idea (not code) from rowwa0809/Metafiction-: NPCs don't just have a
// relationship score, they hold BELIEFS about you — propositions carried with a
// confidence that accumulates from evidence and shifts rather than flips. Here
// the "evidence" is already the family bond (affection/trust/resentment, each
// built up from time spent, fights, dinners and story choices), so a relative's
// beliefs are read straight off that accumulated signal. It makes them feel like
// people with their own read on you, not a meter. No LLM, no new state.

export interface Belief {
  /** Reads as "<name> <confidence> <text>", e.g. "you have their back". */
  text: string;
  /** Held confidence, 0..1 — how strongly the evidence points this way. */
  strength: number;
}

const norm = (n: number): number => Math.max(0, Math.min(1, n / 100));

/** How sure they are, phrased. Pairs with a Belief's strength. */
export function confidencePhrase(strength: number): string {
  if (strength < 0.4) return 'half-suspects';
  if (strength < 0.7) return 'is fairly sure';
  return 'is convinced';
}

/**
 * The one or two beliefs a relative most strongly holds about you, given their
 * bond toward you. Always returns at least one (a neutral "still working you
 * out" when nothing stands out), strongest first.
 */
export function beliefsAbout(bond: FamilyBond): Belief[] {
  const affection = norm(bond.affection);
  const trust = norm(bond.trust);
  const resentment = norm(bond.resentment);
  const candidates: Belief[] = [];

  if (resentment >= 0.35) candidates.push({ text: 'you look out for yourself first', strength: resentment });
  if (affection >= 0.7) candidates.push({ text: 'you genuinely care about them', strength: affection });
  if (affection <= 0.35) candidates.push({ text: 'you keep them at arm’s length', strength: 1 - affection });
  if (trust >= 0.7) candidates.push({ text: 'you have their back', strength: trust });
  if (trust <= 0.3) candidates.push({ text: 'you’re holding something back', strength: 1 - trust });

  candidates.sort((a, b) => b.strength - a.strength);
  const top = candidates.slice(0, 2);
  return top.length > 0 ? top : [{ text: 'they’re still working you out', strength: 0.3 }];
}

/** A single rendered sentence: "Casey is convinced you have their back." */
export function beliefSentence(name: string, belief: Belief): string {
  return `${name} ${confidencePhrase(belief.strength)} ${belief.text}.`;
}
