import { describe, expect, it } from 'vitest';
import { newLife } from './engine';
import { NEED_LOW, urgentNeed } from './need-prompts';

const low = (over: Partial<Record<string, number>>) => ({ ...newLife(), stage: 3, needs: { energy: 80, hunger: 80, hygiene: 80, fun: 80, social: 80, ...over } });

describe('urgentNeed', () => {
  it('stays quiet when every need is comfortable', () => {
    expect(urgentNeed({ ...newLife(), stage: 3 })).toBeNull();
  });

  it('speaks up for a need below the threshold with its activity', () => {
    const p = urgentNeed(low({ hunger: 10 }));
    expect(p?.need).toBe('hunger');
    expect(p?.activity).toBe('eat');
    expect(p?.plea.length).toBeGreaterThan(0);
  });

  it('picks the most urgent need when several are low', () => {
    expect(urgentNeed(low({ hunger: 20, energy: 5 }))?.need).toBe('energy');
  });

  it('never prompts an infant — the family handles a baby’s needs', () => {
    expect(urgentNeed({ ...newLife(), stage: 0, needs: { energy: 1, hunger: 1, hygiene: 1, fun: 1, social: 1 } })).toBeNull();
  });

  it('never prompts an ended life', () => {
    expect(urgentNeed({ ...low({ hunger: 1 }), health: 0 })).toBeNull();
    expect(urgentNeed({ ...low({ hunger: 1 }), completed: true })).toBeNull();
  });

  it('uses a threshold that matches the low-bar warning', () => {
    expect(urgentNeed(low({ fun: NEED_LOW - 1 }))?.need).toBe('fun');
    expect(urgentNeed(low({ fun: NEED_LOW }))).toBeNull();
  });
});
