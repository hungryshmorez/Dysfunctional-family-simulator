import { describe, expect, it } from 'vitest';
import { newLife } from './engine';
import { decideOutcome, fightInjury, settleFight, type FightResult } from './fight';

const base = (over: Partial<FightResult>): FightResult => ({ opponent: 'Rowan', instigatedByPlayer: false, playerHP: 80, opponentHP: 40, ...over });

describe('fight rule', () => {
  it('always loses a fight the player instigated, even with the opponent flat', () => {
    expect(decideOutcome(base({ instigatedByPlayer: true, playerHP: 100, opponentHP: 0 }))).toBe('lost');
  });

  it('lets a defended fight be won on hit points', () => {
    expect(decideOutcome(base({ instigatedByPlayer: false, playerHP: 60, opponentHP: 20 }))).toBe('won');
    expect(decideOutcome(base({ instigatedByPlayer: false, playerHP: 10, opponentHP: 55 }))).toBe('lost');
    expect(decideOutcome(base({ instigatedByPlayer: false, playerHP: 0, opponentHP: 0 }))).toBe('lost');
  });

  it('hurts an instigator most, a defended loss less, a win least', () => {
    expect(fightInjury(base({ instigatedByPlayer: true, playerHP: 0, opponentHP: 90 }))).toBeGreaterThan(
      fightInjury(base({ instigatedByPlayer: false, playerHP: 0, opponentHP: 60 }))
    );
    expect(fightInjury(base({ instigatedByPlayer: false, playerHP: 70, opponentHP: 10 }))).toBeLessThan(
      fightInjury(base({ instigatedByPlayer: false, playerHP: 0, opponentHP: 60 }))
    );
  });
});

describe('settleFight', () => {
  it('lowers health and a known friend’s bond, and records a memory', () => {
    const life = newLife();
    const before = life.relationships.Rowan!;
    const next = settleFight(life, base({ opponent: 'Rowan', instigatedByPlayer: true, playerHP: 0, opponentHP: 70 }));
    expect(next.health).toBeLessThan(life.health);
    expect(next.relationships.Rowan!).toBeLessThan(before);
    expect(next.memories[0]?.topic).toBe('fight');
    expect(next.memories[0]?.text).toMatch(/swung first/i);
  });

  it('does nothing to an ended life', () => {
    const dead = { ...newLife(), health: 0 };
    expect(settleFight(dead, base({}))).toBe(dead);
  });

  it('scars a family member’s bond instead of a friend relationship', () => {
    const life = newLife();
    const before = life.family.bonds.self.older!;
    const next = settleFight(life, base({ opponent: 'Casey', instigatedByPlayer: true, familyId: 'older', playerHP: 0, opponentHP: 80 }));
    const after = next.family.bonds.self.older!;
    expect(after.resentment).toBeGreaterThan(before.resentment);
    expect(after.affection).toBeLessThan(before.affection);
    expect(next.family.bonds.older.self!.resentment).toBeGreaterThan(before.resentment);
    expect(next.relationships).toEqual(life.relationships); // friends untouched
  });

  it('keeps relationships within bounds and only touches a known opponent', () => {
    const life = newLife();
    const next = settleFight(life, base({ opponent: 'Stranger', instigatedByPlayer: false, playerHP: 5, opponentHP: 60 }));
    expect(next.relationships.Stranger).toBeUndefined();
    for (const v of Object.values(next.relationships)) expect(v).toBeGreaterThanOrEqual(0);
  });
});
