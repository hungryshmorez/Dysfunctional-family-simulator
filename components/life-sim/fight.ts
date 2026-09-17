import { hurt, remember, type LifeState } from './engine';

// A stylized fight resolves to a win or a loss, then feeds the sim (injury,
// resentment, a memory). One house rule is absolute: if the player instigates
// the fight, the player loses — no matter how many hits they land. Aggression
// never pays. Only a fight someone else starts ("they needed to get hit") can
// be won by playing well.

export interface FightSetup {
  opponent: string;
  /** True when the player threw the first punch. */
  instigatedByPlayer: boolean;
}

export interface FightResult {
  opponent: string;
  instigatedByPlayer: boolean;
  /** Remaining hit points at the end, 0..100. */
  playerHP: number;
  opponentHP: number;
}

export type FightOutcome = 'won' | 'lost';

const clamp = (n: number): number => Math.max(0, Math.min(100, n));

/** The rule lives here: instigating is always a loss; otherwise HP decides. */
export function decideOutcome(result: FightResult): FightOutcome {
  if (result.instigatedByPlayer) return 'lost';
  return result.playerHP > 0 && result.playerHP >= result.opponentHP ? 'won' : 'lost';
}

/** How badly the player is hurt by a fight, before it touches health. */
export function fightInjury(result: FightResult): number {
  const outcome = decideOutcome(result);
  if (outcome === 'won') return 6;
  return result.instigatedByPlayer ? 20 : 13;
}

/** Apply a finished fight to the life: injury, a relationship hit, and a memory. */
export function settleFight(life: LifeState, result: FightResult): LifeState {
  if (life.completed || life.health <= 0) return life;
  const outcome = decideOutcome(result);
  let next = hurt(life, fightInjury(result));

  // A known friend's bond takes the hit; instigating costs far more.
  if (Object.prototype.hasOwnProperty.call(next.relationships, result.opponent)) {
    const drop = result.instigatedByPlayer ? 16 : outcome === 'won' ? 4 : 8;
    next = { ...next, relationships: { ...next.relationships, [result.opponent]: clamp((next.relationships[result.opponent] ?? 0) - drop) } };
  }

  const text = result.instigatedByPlayer
    ? `You swung first at ${result.opponent}. It ended the way it always does — you lost, and it cost you.`
    : outcome === 'won'
      ? `${result.opponent} came at you. You stood your ground and walked away the winner.`
      : `${result.opponent} came at you and got the better of it. You'll feel that tomorrow.`;

  // Dead men leave no grudges; hurt() already wrote the ending memory.
  return next.health <= 0 ? next : remember(next, text, 'fight', 9);
}
