import type { Activity, LifeState, Need } from './engine';

// When a need runs low the character speaks up — "hey, I need this" — and the
// player is offered a one-tap way to go do something about it. Infancy is
// exempt: a baby's needs are the family's job (they never decay in stage 0).

export interface NeedPrompt {
  need: Need;
  /** The activity that relieves it. */
  activity: Activity;
  /** What the character says, first person. */
  plea: string;
  /** The action button's label. */
  action: string;
}

/** Below this, a need is urgent enough to speak up about (matches the red bar). */
export const NEED_LOW = 25;

const PROMPTS: readonly NeedPrompt[] = [
  { need: 'hunger', activity: 'eat', plea: 'I’m starving — can we eat something?', action: 'Get a meal' },
  { need: 'energy', activity: 'sleep', plea: 'I can barely keep my eyes open.', action: 'Go rest' },
  { need: 'hygiene', activity: 'wash', plea: 'I feel disgusting. I need to clean up.', action: 'Wash up' },
  { need: 'social', activity: 'talk', plea: 'I feel so alone lately.', action: 'Reach out' },
  { need: 'fun', activity: 'play', plea: 'I’m bored out of my mind.', action: 'Do something' },
];

/** The most urgent unmet need worth prompting about, or null when none is low. */
export function urgentNeed(life: LifeState): NeedPrompt | null {
  if (life.completed || life.health <= 0 || life.stage === 0) return null;
  let best: NeedPrompt | null = null;
  for (const p of PROMPTS) {
    if (life.needs[p.need] < NEED_LOW && (best === null || life.needs[p.need] < life.needs[best.need])) best = p;
  }
  return best;
}
