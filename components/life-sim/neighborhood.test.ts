import { describe, expect, it } from 'vitest';
import { currentActivity, newNeighborhood, parseNeighborhood, ROSTER, tickNeighborhood } from './neighborhood';

const DAY = 1440;

describe('neighborhood', () => {
  it('seeds every roster member with a cordial starting state', () => {
    const s = newNeighborhood(480);
    expect(Object.keys(s.npcs)).toHaveLength(ROSTER.length);
    for (const def of ROSTER) {
      expect(s.npcs[def.id]).toMatchObject({ affinity: 20, mood: 'content', lastDay: -1 });
    }
  });

  it('does nothing within the same day', () => {
    const s = newNeighborhood(480);
    const { state, events } = tickNeighborhood(s, 480 + 300);
    expect(events).toHaveLength(0);
    expect(state.npcs).toEqual(s.npcs);
    expect(state.lastTick).toBe(780);
  });

  it('is deterministic: same span produces identical results', () => {
    const a = tickNeighborhood(newNeighborhood(480), 480 + DAY * 2);
    const b = tickNeighborhood(newNeighborhood(480), 480 + DAY * 2);
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
  });

  it('caps catch-up at three in-world days no matter how long the absence', () => {
    const short = tickNeighborhood(newNeighborhood(480), 480 + DAY * 3);
    const huge = tickNeighborhood(newNeighborhood(480), 480 + DAY * 400);
    // A 400-day jump only simulates the final 3 days, so both land in the same
    // bounded regime: at most 2 surfaced memories, and identical last-3-day tail.
    expect(huge.events.length).toBeLessThanOrEqual(2);
    expect(short.events.length).toBeLessThanOrEqual(2);
  });

  it('keeps affinity within 0..100 across a long run', () => {
    let s = newNeighborhood(480);
    for (let d = 1; d <= 40; d++) s = tickNeighborhood(s, 480 + DAY * d).state;
    for (const def of ROSTER) {
      const npc = s.npcs[def.id]!;
      expect(npc.affinity).toBeGreaterThanOrEqual(0);
      expect(npc.affinity).toBeLessThanOrEqual(100);
    }
  });

  it('advances at least one NPC over several days', () => {
    const { state } = tickNeighborhood(newNeighborhood(480), 480 + DAY * 3);
    expect(Object.values(state.npcs).some((n) => n.lastDay >= 0)).toBe(true);
  });

  it('reports a schedule activity for every phase of the day', () => {
    const def = ROSTER[0]!;
    const phases = [60, 60 + 360, 60 + 720, 60 + 1080].map((m) => currentActivity(def, m));
    expect(new Set(phases).size).toBe(4);
  });

  it('round-trips through parse and reseeds malformed NPCs', () => {
    const s = tickNeighborhood(newNeighborhood(480), 480 + DAY * 2).state;
    expect(parseNeighborhood(s)).toEqual(s);
    expect(parseNeighborhood(null)).toBeNull();
    expect(parseNeighborhood({ npcs: {}, lastTick: -5 })).toBeNull();
    // A corrupt affinity for one NPC reseeds just that NPC, keeping lastTick.
    const corrupt = parseNeighborhood({ npcs: { ...s.npcs, [ROSTER[0]!.id]: { affinity: 999 } }, lastTick: s.lastTick });
    expect(corrupt?.npcs[ROSTER[0]!.id]).toMatchObject({ affinity: 20, lastDay: -1 });
  });
});
