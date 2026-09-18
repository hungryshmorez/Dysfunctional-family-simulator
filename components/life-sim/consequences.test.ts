import { describe, expect, it } from 'vitest';
import { CONSEQUENCES, pendingConsequence, resolveConsequence } from './consequences';
import { newLife, parseLife } from './engine';
import { settleFight, type FightResult } from './fight';

const result = (over: Partial<FightResult>): FightResult => ({ opponent: 'Rowan', instigatedByPlayer: false, playerHP: 80, opponentHP: 40, ...over });

describe('the record', () => {
  it('starts at zero', () => {
    expect(newLife().record).toBe(0);
  });

  it('grows only on fights the player started', () => {
    let life = newLife();
    life = settleFight(life, result({ instigatedByPlayer: false, playerHP: 60, opponentHP: 10 }));
    expect(life.record).toBe(0);
    life = settleFight(life, result({ opponent: 'Jules', instigatedByPlayer: true, playerHP: 0, opponentHP: 70 }));
    expect(life.record).toBe(1);
  });
});

describe('pendingConsequence', () => {
  it('owes nothing before the first instigated fight', () => {
    expect(pendingConsequence(newLife())).toBeNull();
  });

  it('surfaces the ladder in order as the record climbs', () => {
    expect(pendingConsequence({ ...newLife(), record: 1 })?.id).toBe('complaint');
    expect(pendingConsequence({ ...newLife(), record: 3 })?.id).toBe('complaint');
  });

  it('owes nothing to an ended life', () => {
    expect(pendingConsequence({ ...newLife(), record: 4, completed: true })).toBeNull();
    expect(pendingConsequence({ ...newLife(), record: 4, health: 0 })).toBeNull();
  });

  it('covers every threshold with an authored beat', () => {
    for (const beat of CONSEQUENCES) {
      expect(pendingConsequence({ ...newLife(), record: beat.threshold })).not.toBeNull();
    }
  });
});

describe('resolveConsequence', () => {
  it('applies cost, records a memory, and does not fire the same beat twice', () => {
    const life = { ...newLife(), record: 1 };
    const beat = pendingConsequence(life)!;
    const next = resolveConsequence(life, beat.id, 'own');
    expect(next.memories[0]?.topic).toBe('consequence');
    expect(next.city.wellbeing).toBeLessThanOrEqual(life.city.wellbeing);
    expect(pendingConsequence(next)?.id).not.toBe(beat.id);
  });

  it('lets the next threshold surface once the current one is lived through', () => {
    let life = { ...newLife(), record: 2 };
    life = resolveConsequence(life, 'complaint', 'own');
    expect(pendingConsequence(life)?.id).toBe('caseworker');
  });

  it('makes deflecting cost more standing than owning it', () => {
    const life = { ...newLife(), record: 3 };
    const owned = resolveConsequence(life, 'summons', 'own');
    const deflected = resolveConsequence(life, 'summons', 'deflect');
    expect(deflected.city.wellbeing).toBeLessThan(owned.city.wellbeing);
    expect(deflected.money).toBeLessThan(owned.money);
  });

  it('ignores an unknown beat or an ended life', () => {
    const life = { ...newLife(), record: 1 };
    expect(resolveConsequence(life, 'nope', 'own')).toBe(life);
    const dead = { ...newLife(), record: 1, health: 0 };
    expect(resolveConsequence(dead, 'complaint', 'own')).toBe(dead);
  });
});

describe('parseLife record migration', () => {
  it('defaults a legacy save with no record to zero', () => {
    const legacy = { ...newLife() } as Record<string, unknown>;
    delete legacy.record;
    expect(parseLife(legacy)?.record).toBe(0);
  });

  it('rejects a corrupt record', () => {
    expect(parseLife({ ...newLife(), record: -1 })).toBeNull();
    expect(parseLife({ ...newLife(), record: 1.5 })).toBeNull();
  });
});
