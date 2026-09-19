import { describe, expect, it } from 'vitest';
import { newLife, parseLife } from './engine';
import { applyTraits, MAX_TRAITS, TRAITS } from './traits';

describe('life traits', () => {
  it('adds starting skills for the chosen trait', () => {
    const life = applyTraits(newLife(), ['studious']);
    expect(life.skills.learning).toBe(newLife().skills.learning + 2);
    expect(life.traits).toEqual(['studious']);
  });

  it('bends the family you are born into (a world effect, not just skills)', () => {
    const base = newLife();
    const life = applyTraits(base, ['rebellious']);
    expect(life.family.bonds.older.self!.resentment).toBeGreaterThan(base.family.bonds.older.self!.resentment);
    expect(life.family.bonds['parent-a'].self!.trust).toBeLessThan(base.family.bonds['parent-a'].self!.trust);
  });

  it('stacks up to the max and no further', () => {
    const life = applyTraits(newLife(), ['studious', 'caretaker', 'ambitious']);
    expect(life.traits.length).toBe(MAX_TRAITS);
  });

  it('records a memory and gives ambitious a money head start', () => {
    const life = applyTraits(newLife(), ['ambitious']);
    expect(life.money).toBe(newLife().money + 150);
    expect(life.memories[0]?.topic).toBe('trait');
  });

  it('ignores unknown ids and no traits leaves the life unchanged in skills', () => {
    const life = applyTraits(newLife(), ['nonsense']);
    expect(life.traits).toEqual([]);
    expect(life.skills).toEqual(newLife().skills);
  });

  it('keeps bonds within 0..100', () => {
    const life = applyTraits(newLife(), TRAITS.map((t) => t.id));
    for (const from of Object.values(life.family.bonds)) for (const bond of Object.values(from)) {
      expect(bond!.resentment).toBeGreaterThanOrEqual(0);
      expect(bond!.trust).toBeLessThanOrEqual(100);
    }
  });

  it('persists traits through a save/load round trip', () => {
    const life = applyTraits(newLife(), ['creative']);
    expect(parseLife(JSON.parse(JSON.stringify(life)))?.traits).toEqual(['creative']);
  });
});
