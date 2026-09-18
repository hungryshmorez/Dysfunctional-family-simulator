import { describe, expect, it } from 'vitest';
import { newLife, stageRequirement } from './engine';

describe('story-gated progression', () => {
  it('blocks advancement until the chapter’s three story moments are lived', () => {
    const midChapter = { ...newLife(), stage: 1, chapter: 1 };
    expect(stageRequirement(midChapter)).toMatch(/story moments/i);
  });

  it('no longer requires busywork activities once the story moments are done', () => {
    // Three story moments complete, zero household activities: the story alone gates.
    const storyDone = { ...newLife(), stage: 1, chapter: 3, stageActions: 0 };
    expect(stageRequirement(storyDone)).toBeNull();
  });

  it('still holds real life milestones (a first job and shift) in young adulthood', () => {
    const adult = { ...newLife(), stage: 3, chapter: 3, stageActions: 0, job: null };
    expect(stageRequirement(adult)).toMatch(/job/i);
  });
});
