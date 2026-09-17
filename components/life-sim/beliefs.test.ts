import { describe, expect, it } from 'vitest';
import { beliefSentence, beliefsAbout, confidencePhrase } from './beliefs';

const bond = (affection: number, trust: number, resentment: number) => ({ affection, trust, resentment });

describe('beliefsAbout', () => {
  it('reads distrust and grudge off a soured bond, strongest first', () => {
    const beliefs = beliefsAbout(bond(20, 15, 80));
    expect(beliefs.length).toBeGreaterThan(0);
    expect(beliefs[0]!.strength).toBeGreaterThanOrEqual(beliefs[beliefs.length - 1]!.strength);
    expect(beliefs.some((b) => /yourself first/.test(b.text))).toBe(true);
    for (const b of beliefs) { expect(b.strength).toBeGreaterThanOrEqual(0); expect(b.strength).toBeLessThanOrEqual(1); }
  });

  it('reads care and trust off a warm bond', () => {
    const beliefs = beliefsAbout(bond(90, 85, 0));
    const texts = beliefs.map((b) => b.text).join(' ');
    expect(texts).toMatch(/care about them|have their back/);
  });

  it('falls back to a neutral belief when nothing stands out', () => {
    const beliefs = beliefsAbout(bond(50, 50, 20));
    expect(beliefs).toHaveLength(1);
    expect(beliefs[0]!.text).toMatch(/working you out/);
  });
});

describe('confidencePhrase / beliefSentence', () => {
  it('scales the phrase with strength', () => {
    expect(confidencePhrase(0.2)).toMatch(/half-suspects/);
    expect(confidencePhrase(0.5)).toMatch(/fairly sure/);
    expect(confidencePhrase(0.9)).toMatch(/convinced/);
  });
  it('renders a full sentence', () => {
    expect(beliefSentence('Casey', { text: 'you have their back', strength: 0.9 })).toBe('Casey is convinced you have their back.');
  });
});
