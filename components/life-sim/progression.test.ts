import { describe, expect, it } from 'vitest';
import { newLife, passTime, stageRequirement } from './engine';
import { STAGES } from './story';

describe('infancy dependence', () => {
  it('does not decay a baby’s needs — the family does everything', () => {
    const baby = passTime(newLife(), 600);
    expect(baby.needs.hunger).toBe(newLife().needs.hunger);
    expect(baby.needs.energy).toBe(newLife().needs.energy);
  });

  it('decays needs once you are old enough to fend for yourself', () => {
    const child = passTime({ ...newLife(), stage: 1 }, 600);
    expect(child.needs.hunger).toBeLessThan(newLife().needs.hunger);
  });
});

describe('story-gated progression', () => {
  it('blocks advancement until the chapter’s story moments are lived', () => {
    const midChapter = { ...newLife(), stage: 1, chapter: 1 };
    expect(stageRequirement(midChapter)).toMatch(/story moments/i);
  });

  it('no longer requires busywork activities once the story moments are done', () => {
    // All authored story moments complete, zero household activities: the story alone gates.
    const storyDone = { ...newLife(), stage: 1, chapter: STAGES[1]!.events.length, stageActions: 0 };
    expect(stageRequirement(storyDone)).toBeNull();
  });

  it('still holds real life milestones (a first job and shift) in young adulthood', () => {
    const adult = { ...newLife(), stage: 3, chapter: STAGES[3]!.events.length, stageActions: 0, job: null };
    expect(stageRequirement(adult)).toMatch(/job/i);
  });

  it('gives every stage at least four well-formed, uniquely-titled authored beats', () => {
    for (const stage of STAGES) {
      expect(stage.events.length).toBeGreaterThanOrEqual(4);
      const titles = new Set(stage.events.map((e) => e.title));
      expect(titles.size).toBe(stage.events.length);
      for (const event of stage.events) {
        expect(event.body.length).toBeGreaterThan(0);
        expect(event.choices.length).toBeGreaterThanOrEqual(2);
        for (const c of event.choices) expect(c.consequence.length).toBeGreaterThan(0);
      }
    }
  });
});
