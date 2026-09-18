import { remember, type LifeState } from './engine';

// Fights you START feed the story. Every instigated fight ticks the player's
// "record", and crossing a threshold triggers an authored consequence beat:
// a knock at the door, a caseworker, a summons, a custody hearing. Aggression
// doesn't just cost health and bonds — it writes a paper trail the household
// has to live with. The beats read as scenes, not stat penalties.

const clamp = (n: number): number => Math.max(0, Math.min(100, n));

export type ConsequenceResponse = 'own' | 'deflect';

export interface ConsequenceChoice {
  label: string;
  /** The scene's fallout, shown as its own beat and saved to Memories. */
  aftermath: string;
  /** Money delta (negative is a fine). */
  money: number;
  /** Neighborhood standing delta, applied to city wellbeing. */
  standing: number;
}

export interface ConsequenceBeat {
  id: string;
  /** Fires once, when the instigated-fight count reaches this many. */
  threshold: number;
  eyebrow: string;
  title: string;
  body: string;
  own: ConsequenceChoice;
  deflect: ConsequenceChoice;
}

// An escalating ladder. Each beat fires exactly once as the record climbs, and
// "own it" (take responsibility) generally costs less standing than pushing
// back — but pushing back keeps a little more money in your pocket now, at a
// worse cost later. Deflecting is never free; the record keeps growing.
export const CONSEQUENCES: readonly ConsequenceBeat[] = [
  {
    id: 'complaint',
    threshold: 1,
    eyebrow: 'THE HOUSEHOLD · A KNOCK AT THE DOOR',
    title: 'A complaint is filed',
    body: 'A neighbor heard the whole thing and reported it. Nothing official yet — just a note on file, and the sense that people are watching your door now.',
    own: { label: 'Apologize to the neighbor', aftermath: 'You knock next door and own it. They stay wary, but they close the door a little softer. Nothing escalates — this time.', money: 0, standing: -3 },
    deflect: { label: 'Tell them to mind their business', aftermath: 'You wave it off, loudly. The note stays on file, and now there are two households who watch your windows.', money: 0, standing: -9 },
  },
  {
    id: 'caseworker',
    threshold: 2,
    eyebrow: 'THE HOUSEHOLD · SOMEONE OFFICIAL',
    title: 'A caseworker comes by',
    body: 'The complaints added up. A caseworker sits at your table with a clipboard and asks, gently, how things are at home. Nothing you say here is really off the record.',
    own: { label: 'Be honest about the fighting', aftermath: 'You tell the truth. It is uncomfortable, and it opens a file — but they leave a card, not a summons. Honesty buys you a little room.', money: -20, standing: -5 },
    deflect: { label: 'Insist everything is fine', aftermath: 'You perform "fine" for an hour. They write it all down anyway. The file stays open, and the next visit will not be so gentle.', money: 0, standing: -12 },
  },
  {
    id: 'summons',
    threshold: 3,
    eyebrow: 'THE HOUSEHOLD · A LETTER YOU CAN’T IGNORE',
    title: 'A court summons',
    body: 'It comes in a plain envelope with a date on it. A disturbance charge. The kind of thing that follows a household from address to address if you let it.',
    own: { label: 'Show up, pay the fine, take the class', aftermath: 'You show up, pay what they ask, and sit through the anger-management session. It stings the wallet, but the record stops here for now.', money: -80, standing: -4 },
    deflect: { label: 'Skip it and hope it goes away', aftermath: 'You do not go. It does not go away. A bench warrant turns a fine into a bigger fine, and the neighborhood hears about all of it.', money: -140, standing: -14 },
  },
  {
    id: 'custody',
    threshold: 4,
    eyebrow: 'THE HOUSEHOLD · THE HARDEST ROOM',
    title: 'A custody hearing',
    body: 'The file is thick now. A judge has to decide whether this household is a safe one. Everyone who ever filed a complaint is a line in a report on the table.',
    own: { label: 'Accept supervision and the plan', aftermath: 'You accept the conditions: check-ins, a plan, someone watching. The family stays together — barely — and the leash is short and real.', money: -60, standing: -6 },
    deflect: { label: 'Fight the whole thing in court', aftermath: 'You fight it. Lawyers cost more than fines, and a household split down the middle is the price of being right on paper. The record is permanent now.', money: -220, standing: -18 },
  },
];

const seenId = (id: string): string => `consequence:${id}`;

/**
 * The next consequence beat the story owes the player, or null. A beat is due
 * when the instigated-fight count has reached its threshold and it hasn't been
 * lived through yet (tracked in `unlocks`).
 */
export function pendingConsequence(life: LifeState): ConsequenceBeat | null {
  if (life.completed || life.health <= 0) return null;
  for (const beat of CONSEQUENCES) {
    if (life.record >= beat.threshold && !life.unlocks.includes(seenId(beat.id))) return beat;
  }
  return null;
}

/** Live through a consequence: apply its cost, mark it seen, remember the scene. */
export function resolveConsequence(life: LifeState, id: string, response: ConsequenceResponse): LifeState {
  if (life.completed || life.health <= 0) return life;
  const beat = CONSEQUENCES.find((b) => b.id === id);
  if (!beat || life.unlocks.includes(seenId(id))) return life;
  const choice = beat[response];
  const next: LifeState = {
    ...life,
    money: life.money + choice.money,
    city: { ...life.city, wellbeing: clamp(life.city.wellbeing + choice.standing) },
    unlocks: [...life.unlocks, seenId(id)],
  };
  return remember(next, choice.aftermath, 'consequence', 9);
}
