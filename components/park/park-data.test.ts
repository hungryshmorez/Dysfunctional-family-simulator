import { describe, expect, it } from 'vitest';
import { buildPark } from './park-data';

describe('trailer park layout', () => {
  const park = buildPark();

  it('has twelve single-wides, six per side of the road', () => {
    expect(park.trailers.length).toBe(12);
    expect(park.trailers.filter((t) => t.side === 'left').length).toBe(6);
    expect(park.trailers.filter((t) => t.side === 'right').length).toBe(6);
  });

  it('puts the trailers on either side of the road, clear of it', () => {
    for (const t of park.trailers) {
      expect(Math.abs(t.x)).toBeGreaterThan(park.road.halfWidth);
    }
  });

  it('gives the player a trailer to themselves and leaves it unlocked', () => {
    const mine = park.trailers.find((t) => t.isPlayer)!;
    expect(mine.occupants).toBe(0);
    expect(mine.locked).toBe(false);
    expect(park.npcs.some((n) => n.trailerId === mine.id)).toBe(false);
  });

  it('locks every neighbor trailer', () => {
    for (const t of park.trailers) expect(t.locked).toBe(!t.isPlayer);
  });

  it('has at least one person in every neighbor trailer', () => {
    for (const t of park.trailers) {
      if (t.isPlayer) continue;
      expect(t.occupants).toBeGreaterThanOrEqual(1);
      expect(park.npcs.filter((n) => n.trailerId === t.id).length).toBe(t.occupants);
    }
  });

  it('has at least one crowded trailer with five or more', () => {
    expect(Math.max(...park.trailers.map((t) => t.occupants))).toBeGreaterThanOrEqual(5);
  });

  it('gives every NPC a name, a home trailer, and a loiter spot', () => {
    for (const n of park.npcs) {
      expect(n.name.length).toBeGreaterThan(0);
      expect(park.trailers.some((t) => t.id === n.trailerId)).toBe(true);
      expect(Number.isFinite(n.home.x) && Number.isFinite(n.home.z)).toBe(true);
    }
  });
});
