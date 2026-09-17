import { describe, expect, it } from 'vitest';
import { HOSPITAL_COST, hospitalError, hospitalVisit, newLife } from './engine';

describe('clinic / hospital', () => {
  it('is unavailable at full health, when broke, and when the life has ended', () => {
    expect(hospitalError(newLife())).toMatch(/not hurt/);
    expect(hospitalError({ ...newLife(), health: 40, money: 10 })).toMatch(/\$60/);
    expect(hospitalError({ ...newLife(), health: 0 })).toMatch(/ended/);
    expect(hospitalError({ ...newLife(), health: 40, money: 100 })).toBeNull();
  });

  it('restores health, charges the fee, spends time, and records a memory', () => {
    const hurt = { ...newLife(), health: 35 };
    const next = hospitalVisit(hurt);
    expect(next.health).toBe(35 + 55);
    expect(next.money).toBe(hurt.money - HOSPITAL_COST);
    expect(next.minute).toBeGreaterThan(hurt.minute);
    expect(next.memories[0]?.topic).toBe('health');
  });

  it('never overheals past 100 and is a no-op when it cannot happen', () => {
    const barely = { ...newLife(), health: 80, money: 500 };
    expect(hospitalVisit(barely).health).toBe(100);
    const broke = { ...newLife(), health: 40, money: 10 };
    expect(hospitalVisit(broke)).toBe(broke);
    expect(hospitalVisit(newLife())).toEqual(newLife());
  });
});
