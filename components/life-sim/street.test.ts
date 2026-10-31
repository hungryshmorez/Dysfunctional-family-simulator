import { describe, expect, it } from 'vitest';
import { starterHome } from './home';
import { blocked } from './navigation';
import { frontDoorOf, groundYAt, GROUND_Y, outdoorBlocked, planStreet, walkableAnywhere, type StreetPlan } from './street';

const home = starterHome();
const floor = home.floors[0]!;
const plan = planStreet({ width: home.width, depth: home.height }, frontDoorOf(home));
const hw = home.width / 2;
const interior = (x: number, z: number): boolean => blocked({ x, z }, floor, home.width, home.height);
const walk = (x: number, z: number): boolean => walkableAnywhere(plan, x, z, interior);
const neighbors = plan.lots.filter((l) => !l.isPlayer);

describe('the street', () => {
  it('has twelve trailers, six on each side of the road', () => {
    expect(plan.lots.length).toBe(12);
    expect(plan.lots.filter((l) => l.side === 'east').length).toBe(6);
    expect(plan.lots.filter((l) => l.side === 'west').length).toBe(6);
  });

  it('puts the family trailer on the street as one of the twelve', () => {
    const mine = plan.lots.filter((l) => l.isPlayer);
    expect(mine.length).toBe(1);
    expect(mine[0]!.cx).toBe(0);
    expect(mine[0]!.cz).toBe(0);
    expect(mine[0]!.length).toBe(home.width);
  });

  it('turns every trailer perpendicular to the road: long axis away from it', () => {
    for (const l of plan.lots) expect(l.length, l.id).toBeGreaterThan(l.width);
    // The road runs along z, so "perpendicular" means the long axis runs along x.
    expect(plan.roadZSouth).toBeGreaterThan(plan.roadZNorth);
  });

  it('faces the short, door end of every trailer at the road', () => {
    for (const l of plan.lots) {
      const doorEnd = l.side === 'east' ? l.cx - l.length / 2 : l.cx + l.length / 2;
      const gap = Math.abs(doorEnd - plan.roadX) - plan.roadHalf;
      expect(gap, l.id).toBeGreaterThan(0);
      // Every trailer on a side lines its door end up with the others.
      const first = plan.lots.find((o) => o.side === l.side)!;
      const firstEnd = first.side === 'east' ? first.cx - first.length / 2 : first.cx + first.length / 2;
      expect(doorEnd).toBeCloseTo(firstEnd, 6);
    }
  });

  it('sets trailers well back from the road instead of right on it', () => {
    for (const l of plan.lots) {
      const doorEnd = l.side === 'east' ? l.cx - l.length / 2 : l.cx + l.length / 2;
      expect(Math.abs(doorEnd - plan.roadX) - plan.roadHalf, l.id).toBeGreaterThanOrEqual(5);
    }
  });

  it('never overlaps two trailers or puts one on the road', () => {
    for (const a of plan.lots) {
      expect(a.side === 'east' ? a.cx - a.length / 2 : a.cx + a.length / 2).not.toBeNaN();
      const ax0 = a.cx - a.length / 2, ax1 = a.cx + a.length / 2;
      expect(ax1 < plan.roadX - plan.roadHalf || ax0 > plan.roadX + plan.roadHalf, a.id).toBe(true);
      for (const b of plan.lots) {
        if (a.id >= b.id) continue;
        const overlapX = Math.abs(a.cx - b.cx) < (a.length + b.length) / 2;
        const overlapZ = Math.abs(a.cz - b.cz) < (a.width + b.width) / 2;
        expect(overlapX && overlapZ, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it('gives every neighbor trailer at least one person', () => {
    for (const l of neighbors) {
      expect(plan.people.filter((p) => p.lotId === l.id).length, l.household).toBeGreaterThanOrEqual(1);
    }
  });

  it('crowds at least one trailer with five or more people', () => {
    const counts = neighbors.map((l) => plan.people.filter((p) => p.lotId === l.id).length);
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(5);
  });

  it('leaves the player living alone in their own trailer', () => {
    expect(plan.people.some((p) => p.lotId === 'e-home')).toBe(false);
  });

  it('keeps the game’s own neighbors on the street, with the roster ids the simulation uses', () => {
    const ids = plan.people.map((p) => p.rosterId).filter(Boolean);
    expect(ids).toEqual(expect.arrayContaining(['della', 'ren', 'ozzie', 'sim']));
  });

  it('never stands anyone inside a wall, a car or a tree', () => {
    for (const p of plan.people) expect(outdoorBlocked(plan, p.x, p.z), `${p.name} @${p.x},${p.z}`).toBe(false);
  });

  it('keeps cars off the trailers', () => {
    for (const c of plan.cars) for (const l of plan.lots) {
      const overlapX = Math.abs(c.x - l.cx) < (2.4 + l.length) / 2;
      const overlapZ = Math.abs(c.z - l.cz) < (4.8 + l.width) / 2;
      expect(overlapX && overlapZ, `car @${c.x},${c.z} on ${l.id}`).toBe(false);
    }
  });
});

describe('the rich end of the street', () => {
  it('ends the street at a gate past the last trailer, with the estate beyond', () => {
    const northmost = Math.min(...plan.lots.map((l) => l.cz - l.width / 2));
    expect(plan.estate.gateZ).toBeLessThan(northmost);
    expect(plan.estate.mansion.z1).toBeLessThan(plan.estate.gateZ);
    expect(plan.estate.fountain.z).toBeLessThan(plan.estate.gateZ);
  });

  it('puts rich people on the estate lawn', () => {
    const rich = plan.people.filter((p) => p.kind === 'rich');
    expect(rich.length).toBeGreaterThanOrEqual(2);
    for (const p of rich) expect(p.z).toBeLessThan(plan.estate.gateZ);
  });

  it('is much bigger than any trailer', () => {
    const m = plan.estate.mansion;
    expect((m.x1 - m.x0) * (m.z1 - m.z0)).toBeGreaterThan(plan.lots.reduce((n, l) => Math.max(n, l.length * l.width), 0) * 3);
  });
});

describe('walking out of the trailer', () => {
  it('has a front door on the street end', () => {
    expect(plan.door).not.toBeNull();
    expect(plan.stoop).not.toBeNull();
  });

  it('stands inside the trailer', () => {
    expect(walk(-6, 0)).toBe(true);
  });

  it('keeps the walls solid everywhere except the doorway', () => {
    const dz = plan.door!.z;
    expect(walk(-hw - 0.1, dz + 1.0)).toBe(false);
    expect(walk(-hw - 0.1, dz - 1.0)).toBe(false);
    expect(walk(-hw, 0)).toBe(false);
    expect(walk(hw + 0.1, 0)).toBe(false);
    expect(walk(0, home.height / 2 + 0.1)).toBe(false);
  });

  it('walks straight through the doorway and over the porch to the road', () => {
    const dz = plan.door!.z;
    for (let x = -hw + 1.5; x >= plan.roadX; x -= 0.1) expect(walk(x, dz), `x=${x.toFixed(1)}`).toBe(true);
  });

  it('steps down from the porch to the yard', () => {
    const dz = plan.door!.z;
    expect(groundYAt(plan, -6, 0)).toBe(0);
    expect(groundYAt(plan, -hw - 0.3, dz)).toBe(0);
    expect(groundYAt(plan, plan.roadX, dz)).toBe(GROUND_Y);
    const mid = groundYAt(plan, -hw - 1.2, dz);
    expect(mid).toBeLessThan(0);
    expect(mid).toBeGreaterThan(GROUND_Y);
  });

  it('keeps the porch rails and the neighbors’ trailers solid', () => {
    const dz = plan.door!.z;
    expect(walk(-hw - 1, dz + 1.25)).toBe(false);
    for (const l of neighbors) expect(walk(l.cx, l.cz), l.id).toBe(false);
  });

  it('reaches every neighbor’s yard, the park and the rich estate on foot', () => {
    // Flood-fill the whole map from the front door, 0.5 m at a time.
    const step = 0.5;
    const b: StreetPlan['bounds'] = plan.bounds;
    const nx = Math.ceil((b.x1 - b.x0) / step), nz = Math.ceil((b.z1 - b.z0) / step);
    const at = (i: number, j: number): [number, number] => [b.x0 + (i + 0.5) * step, b.z0 + (j + 0.5) * step];
    const index = (x: number, z: number): number => Math.floor((z - b.z0) / step) * nx + Math.floor((x - b.x0) / step);
    const seen = new Uint8Array(nx * nz);
    const start = index(-hw - 1.9, plan.door!.z);
    const queue = [start];
    seen[start] = 1;
    for (let q = 0; q < queue.length; q++) {
      const k = queue[q]!, i = k % nx, j = Math.floor(k / nx);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ii = i + di!, jj = j + dj!;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const kk = jj * nx + ii;
        if (seen[kk]) continue;
        const [x, z] = at(ii, jj);
        if (!walk(x, z)) continue;
        seen[kk] = 1;
        queue.push(kk);
      }
    }
    for (const p of plan.people) expect(seen[index(p.x, p.z)], `${p.name} unreachable`).toBe(1);
    expect(seen[index(plan.estate.plaza.x, plan.estate.plaza.z + plan.estate.plaza.r - 1)], 'estate plaza').toBe(1);
    expect(seen[index(plan.estate.plaza.x, plan.estate.mansion.z1 + 2)], 'mansion front').toBe(1);
    expect(seen[index(plan.park.x0 + 8, (plan.park.z0 + plan.park.z1) / 2)], 'park').toBe(1);
  });
});

describe('homes without a front door', () => {
  it('keeps the player inside and the street intact', () => {
    const none = planStreet({ width: 12, depth: 8 }, null);
    expect(none.door).toBeNull();
    expect(none.stoop).toBeNull();
    expect(none.lots.length).toBe(12);
    expect(walkableAnywhere(none, -6.1, 0, () => false)).toBe(false);
  });

  it('makes room for a deeper custom home without overlapping its neighbors', () => {
    const big = planStreet({ width: 20, depth: 22 }, null);
    for (const a of big.lots) for (const b of big.lots) {
      if (a.id >= b.id) continue;
      const overlapX = Math.abs(a.cx - b.cx) < (a.length + b.length) / 2;
      const overlapZ = Math.abs(a.cz - b.cz) < (a.width + b.width) / 2;
      expect(overlapX && overlapZ, `${a.id} overlaps ${b.id}`).toBe(false);
    }
  });
});
