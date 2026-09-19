import { describe, expect, it } from 'vitest';
import { homeCost, starterHome } from './home';
import { blocked, findPath } from './navigation';
import type { FurnitureItem } from '@/components/room-organizer/lib/types';

const home = starterHome();
const floor = home.floors[0]!;
const beds = floor.items.filter((i) => i.type === 'bed');

// A generous half-extent for overlap checks (mirrors navigation's collision box
// without the path radius, so touching-at-the-wall placements aren't flagged).
const half = (i: FurnitureItem, axis: 'w' | 'd'): number => (axis === 'w' ? i.width : i.depth) / 2;

describe('the family home', () => {
  it('gives the five-person household four bedrooms with five beds', () => {
    expect(beds.length).toBe(5);
  });

  it('keeps every solid item inside the walls', () => {
    for (const i of floor.items) {
      if (!i.position) continue;
      expect(Math.abs(i.position.x) + half(i, i.rotation ? 'd' : 'w')).toBeLessThanOrEqual(home.width / 2 + 0.01);
      expect(Math.abs(i.position.z) + half(i, i.rotation ? 'w' : 'd')).toBeLessThanOrEqual(home.height / 2 + 0.01);
    }
  });

  it('never overlaps two solid, axis-aligned items', () => {
    const solid = floor.items.filter((i) => i.position && !['rug', 'plant', 'floor-lamp'].includes(i.type) && !(i.rotation && i.rotation % (Math.PI / 2) !== 0));
    for (let a = 0; a < solid.length; a++) {
      for (let b = a + 1; b < solid.length; b++) {
        const p = solid[a]!, q = solid[b]!;
        const pw = p.rotation ? p.depth : p.width, pd = p.rotation ? p.width : p.depth;
        const qw = q.rotation ? q.depth : q.width, qd = q.rotation ? q.width : q.depth;
        const overlapX = Math.abs(p.position!.x - q.position!.x) < (pw + qw) / 2 - 0.02;
        const overlapZ = Math.abs(p.position!.z - q.position!.z) < (pd + qd) / 2 - 0.02;
        expect(overlapX && overlapZ, `${p.type} @${p.position!.x},${p.position!.z} overlaps ${q.type} @${q.position!.x},${q.position!.z}`).toBe(false);
      }
    }
  });

  it('leaves every bed reachable from the living room through the doorways', () => {
    const start = { x: -6, z: 0 };
    expect(blocked(start, floor, home.width, home.height)).toBe(false);
    for (const bed of beds) {
      const approach = { x: bed.position!.x, z: bed.position!.z + 1.6 };
      const path = findPath(start, approach, floor, home.width, home.height);
      expect(path, `no path to bed @${bed.position!.x},${bed.position!.z}`).not.toBeNull();
    }
  });

  it('leaves the bathroom reachable through its doorway', () => {
    const path = findPath({ x: 0, z: 0 }, { x: 6.6, z: 4 }, floor, home.width, home.height);
    expect(path).not.toBeNull();
  });

  it('still totals a positive furnished cost', () => {
    expect(homeCost(home)).toBeGreaterThan(0);
  });
});
