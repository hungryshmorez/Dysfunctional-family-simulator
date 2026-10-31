import type { RoomLayout } from '@/components/room-organizer/lib/types';

// The neighbourhood around the family trailer. Pure data + collision so the 3D
// scene, the walking logic and the tests all read one source of truth.
//
// Layout (x east, z south; the player's trailer is centred on the origin):
//   - The street runs north–south along x = ROAD_X. Every trailer is turned
//     PERPENDICULAR to it: the long axis points away from the road, and the
//     short end (with the front door) faces it across a front yard.
//   - 12 trailers: six on each side of the road, the player's among the east
//     side. The street ends at the north end at an open gate and a rich estate.

export interface Rect { x0: number; x1: number; z0: number; z1: number }

export const GROUND_Y = -0.6;
export const FRONT_YARD = 6;
const ROAD_HALF = 3;
const LOT_GAP = 6.8;
const R = 0.22;

export type Side = 'east' | 'west';

export interface Lot {
  id: string;
  side: Side;
  /** Centre of the footprint. */
  cx: number;
  cz: number;
  /** Long axis, along x. */
  length: number;
  /** Short axis, along z. */
  width: number;
  /** 0 for east-side trailers (door end at −x), π for west-side. */
  rot: number;
  color: string;
  roof: string;
  household: string;
  isPlayer: boolean;
  sign: string | null;
}

export interface Person {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  kind: 'neighbor' | 'rich';
  lotId: string | null;
  rosterId: string | null;
  /** Static line shown under the name; roster people use their live schedule. */
  detail: string | null;
}

export interface Car { x: number; z: number; rot: number; color: string; kind: 'truck' | 'sedan' | 'limo' }
export interface Tree { x: number; z: number; size: number }
export interface Doorway { z: number; width: number }

export interface StreetPlan {
  home: { width: number; depth: number };
  door: Doorway | null;
  roadX: number;
  roadHalf: number;
  roadZNorth: number;
  roadZSouth: number;
  lots: Lot[];
  people: Person[];
  cars: Car[];
  trees: Tree[];
  lamps: { x: number; z: number }[];
  benches: { x: number; z: number; rot: number }[];
  /** Solid rectangles outdoors — everything except the player's own trailer. */
  obstacles: Rect[];
  bounds: Rect;
  /** The raised porch at the front door, if the home has one. */
  stoop: Rect | null;
  park: Rect;
  estate: {
    gateZ: number;
    pillars: Rect[];
    mansion: Rect;
    plaza: { x: number; z: number; r: number };
    fountain: { x: number; z: number; r: number };
    lawn: Rect;
  };
}

interface NeighborSpec {
  household: string;
  width: number;
  length: number;
  color: string;
  roof: string;
  sign?: string;
  people: { name: string; rosterId?: string }[];
}

// East side, going north from the player (nearest first) and south.
const EAST_NORTH: NeighborSpec[] = [
  { household: 'old Verna', width: 7.2, length: 17, color: '#dcd3bd', roof: '#8a857c', people: [{ name: 'Verna' }] },
  { household: 'the Crabbs', width: 4.6, length: 15, color: '#c7d4cc', roof: '#7c8780', people: [{ name: 'Earl' }, { name: 'Wanda' }] },
  { household: 'the Dillards', width: 7.2, length: 16, color: '#d9d4c6', roof: '#85817a', people: [{ name: 'Dale' }] },
];
const EAST_SOUTH: NeighborSpec[] = [
  { household: 'Della’s Bake Shop', width: 4.6, length: 16, color: '#e6cfa6', roof: '#93785a', sign: 'DELLA’S BAKE SHOP', people: [{ name: 'Della', rosterId: 'della' }] },
  { household: 'the Tuckers', width: 7.2, length: 14, color: '#c4d2dc', roof: '#7a868e', people: [{ name: 'Roy' }, { name: 'Cheryl' }, { name: 'Buck' }, { name: 'Darlene' }, { name: 'Merle' }] },
];
// West side, going south from the north end.
const WEST: NeighborSpec[] = [
  { household: 'the Mapes', width: 7.2, length: 16, color: '#d9d2b0', roof: '#8a8466', people: [{ name: 'June' }] },
  { household: 'the Rooks', width: 4.6, length: 15, color: '#d6cbbc', roof: '#847c72', people: [{ name: 'Hank' }, { name: 'Sheila' }] },
  { household: 'Big Lenny', width: 7.2, length: 17, color: '#dccbd0', roof: '#8a7a80', people: [{ name: 'Lenny' }, { name: 'Ren', rosterId: 'ren' }] },
  { household: 'the Pratts', width: 4.6, length: 14, color: '#c9dccf', roof: '#7a8c80', people: [{ name: 'Cletus' }] },
  { household: 'the Odoms', width: 7.2, length: 16, color: '#e2d2bc', roof: '#8c8070', people: [{ name: 'Donna' }, { name: 'Wade' }] },
  { household: 'Sim’s Night Shop', width: 4.6, length: 15, color: '#b9c3da', roof: '#6a7388', sign: 'NIGHT SHOP · OPEN', people: [{ name: 'Sim', rosterId: 'sim' }] },
];

const NPC_COLORS = ['#b0473f', '#4c6b8a', '#6a7f4a', '#8a6d3b', '#7a4b6b', '#3f7a6b', '#9a5a2a', '#55607a', '#7c6a8a', '#6b8a55', '#a07a45', '#5a7a7a', '#8a5a4a', '#487a5a', '#7a5a8a'];
const RICH: { name: string; detail: string; color: string; dx: number; dz: number }[] = [
  { name: 'Mr. Whitcombe', detail: 'surveying the lawn', color: '#2b2f3a', dx: -3.2, dz: 6.5 },
  { name: 'Mrs. Whitcombe', detail: 'sipping something expensive', color: '#e8dfd0', dx: 3.4, dz: 7.2 },
  { name: 'Sterling', detail: 'polishing the car, again', color: '#1d1d22', dx: 11, dz: 5 },
];

const rect = (cx: number, cz: number, w: number, d: number): Rect => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
const inRect = (x: number, z: number, r: Rect, pad: number): boolean => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;

/** The first door on the west (street-facing) wall, or null for houses without one. */
export function frontDoorOf(layout: RoomLayout): Doorway | null {
  const floor = layout.floors[0];
  if (!floor) return null;
  const door = floor.items.find((i) => i.type === 'door' && i.position && Math.abs(i.position.x + layout.width / 2) < 0.6);
  return door?.position ? { z: door.position.z, width: door.width } : null;
}

export function planStreet(home: { width: number; depth: number }, door: Doorway | null): StreetPlan {
  const hw = home.width / 2;
  const hd = home.depth / 2;
  const roadX = -hw - FRONT_YARD - ROAD_HALF;
  const eastEndX = -hw; // east-side trailers' street ends line up with the player's
  const westEndX = roadX - ROAD_HALF - FRONT_YARD;
  const lots: Lot[] = [];
  const people: Person[] = [];
  let colorIndex = 0;

  const addLot = (side: Side, spec: NeighborSpec, cz: number, index: number): void => {
    const id = `${side[0]}${index}`;
    const cx = side === 'east' ? eastEndX + spec.length / 2 : westEndX - spec.length / 2;
    lots.push({ id, side, cx, cz, length: spec.length, width: spec.width, rot: side === 'east' ? 0 : Math.PI, color: spec.color, roof: spec.roof, household: spec.household, isPlayer: false, sign: spec.sign ?? null });
    // Neighbours loiter in the front yard, between their door and the road.
    const yardX = side === 'east' ? eastEndX - 2.4 : westEndX + 2.4;
    spec.people.forEach((p, i) => {
      const n = spec.people.length;
      const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.min(spec.width + 2, n * 1.6);
      people.push({
        id: `${id}-${i}`, name: p.name, color: NPC_COLORS[colorIndex++ % NPC_COLORS.length]!,
        x: yardX + (side === 'east' ? -1 : 1) * (i % 2) * 0.9, z: cz + spread, kind: 'neighbor', lotId: id, rosterId: p.rosterId ?? null, detail: null,
      });
    });
  };

  // East side: the player's trailer is the anchor; others stack outward.
  lots.push({ id: 'e-home', side: 'east', cx: 0, cz: 0, length: home.width, width: home.depth, rot: 0, color: '#c8b48c', roof: '#5b5750', household: 'your trailer', isPlayer: true, sign: null });
  let edge = -hd;
  EAST_NORTH.forEach((spec, i) => { const cz = edge - LOT_GAP - spec.width / 2; addLot('east', spec, cz, i); edge = cz - spec.width / 2; });
  const eastNorthEdge = edge;
  edge = hd;
  EAST_SOUTH.forEach((spec, i) => { const cz = edge + LOT_GAP + spec.width / 2; addLot('east', spec, cz, EAST_NORTH.length + i); edge = cz + spec.width / 2; });
  const eastSouthEdge = edge;
  // West side is staggered across the road, centred on the player.
  const westSpan = WEST.reduce((n, s) => n + s.width, 0) + (WEST.length - 1) * LOT_GAP;
  edge = -westSpan / 2;
  WEST.forEach((spec, i) => { const cz = edge + spec.width / 2; addLot('west', spec, cz, i); edge = cz + spec.width / 2 + LOT_GAP; });

  const northEdge = Math.min(eastNorthEdge, -westSpan / 2);
  const southEdge = Math.max(eastSouthEdge, westSpan / 2);
  const gateZ = northEdge - 12;
  const roadZSouth = southEdge + 20;

  // Cars sit in the front yards, in the gaps between lots.
  const cars: Car[] = [];
  const carColors = ['#7b3f3a', '#3d4f6b', '#6b6b6b', '#8a7a3a', '#4a5f4a'];
  lots.filter((l) => !l.isPlayer).forEach((l, i) => {
    if (i % 2 === 1) return;
    const x = l.side === 'east' ? eastEndX - 3.9 : westEndX + 3.9;
    cars.push({ x, z: l.cz + l.width / 2 + 3.4, rot: 0, color: carColors[i % carColors.length]!, kind: i % 4 === 0 ? 'truck' : 'sedan' });
  });

  // Rich estate beyond the gate.
  const plaza = { x: roadX, z: gateZ - 24, r: 9 };
  const fountain = { x: roadX, z: plaza.z, r: 2.8 };
  const mansion = rect(roadX, plaza.z - 25, 46, 15);
  const lawn: Rect = { x0: roadX - 46, x1: roadX + 46, z0: mansion.z0 - 14, z1: gateZ };
  const pillars = [rect(roadX - 5.6, gateZ, 1.4, 1.4), rect(roadX + 5.6, gateZ, 1.4, 1.4)];
  cars.push({ x: roadX + 11, z: plaza.z - 8, rot: Math.PI / 2, color: '#16161b', kind: 'limo' });
  RICH.forEach((r, i) => people.push({ id: `rich-${i}`, name: r.name, color: r.color, x: plaza.x + r.dx, z: plaza.z + r.dz, kind: 'rich', lotId: null, rosterId: null, detail: r.detail }));

  // The little park at the south end of the street (Ozzie keeps it).
  const park = rect(roadX + 8, roadZSouth - 8, 34, 14);
  people.push({ id: 'ozzie', name: 'Ozzie', color: '#6b8a55', x: roadX + 12, z: roadZSouth - 8, kind: 'neighbor', lotId: null, rosterId: 'ozzie', detail: null });

  const trees: Tree[] = [];
  const addTree = (x: number, z: number, size = 1): void => { trees.push({ x, z, size }); };
  // Park trees and a tree-lined backdrop behind the rows of trailers.
  [[-4, -4], [2, 3], [9, -3], [-8, 4], [13, 4]].forEach(([dx, dz]) => addTree(park.x0 + 17 + dx!, (park.z0 + park.z1) / 2 + dz!, 1.1));
  for (let z = gateZ + 4; z < roadZSouth; z += 9) {
    addTree(westEndX - 34 - ((z * 7) % 5), z, 1.2);
    addTree(hw + 11 + ((z * 5) % 4), z + 2, 1.15);
  }
  // Estate: manicured rows of trees flanking the lawn.
  for (let z = gateZ - 6; z > mansion.z0 - 10; z -= 8) { addTree(lawn.x0 + 5, z, 1.4); addTree(lawn.x1 - 5, z, 1.4); }

  const lamps: { x: number; z: number }[] = [];
  for (let z = gateZ + 6; z < roadZSouth - 4; z += 14) { lamps.push({ x: roadX - ROAD_HALF - 0.6, z }); lamps.push({ x: roadX + ROAD_HALF + 0.6, z: z + 7 }); }
  const benches = [{ x: roadX + ROAD_HALF + 1.6, z: 4, rot: -Math.PI / 2 }, { x: park.x0 + 6, z: (park.z0 + park.z1) / 2, rot: 0 }, { x: park.x0 + 24, z: (park.z0 + park.z1) / 2, rot: Math.PI }];

  const stoop: Rect | null = door ? { x0: -hw - 1.7, x1: -hw, z0: door.z - 1.25, z1: door.z + 1.25 } : null;

  const obstacles: Rect[] = [];
  for (const l of lots) if (!l.isPlayer) obstacles.push(rect(l.cx, l.cz, l.length + 0.3, l.width + 0.3));
  if (stoop) {
    // Porch rails keep you on the steps until you reach the yard.
    obstacles.push({ x0: stoop.x0 + 0.1, x1: stoop.x1 - 0.2, z0: stoop.z0 - 0.06, z1: stoop.z0 + 0.06 });
    obstacles.push({ x0: stoop.x0 + 0.1, x1: stoop.x1 - 0.2, z0: stoop.z1 - 0.06, z1: stoop.z1 + 0.06 });
  }
  for (const c of cars) obstacles.push(c.kind === 'limo' ? rect(c.x, c.z, 7, 2.3) : rect(c.x, c.z, 2.1, 4.8));
  for (const t of trees) obstacles.push(rect(t.x, t.z, 0.5, 0.5));
  obstacles.push(mansion, rect(fountain.x, fountain.z, fountain.r * 2, fountain.r * 2), ...pillars);
  // Estate fence either side of the open gate, and the back fence of the park.
  obstacles.push({ x0: lawn.x0, x1: roadX - 6.3, z0: gateZ - 0.2, z1: gateZ + 0.2 }, { x0: roadX + 6.3, x1: lawn.x1, z0: gateZ - 0.2, z1: gateZ + 0.2 });
  // Hedges close in the estate lawn on three sides.
  obstacles.push(
    { x0: lawn.x0 - 0.6, x1: lawn.x0, z0: lawn.z0, z1: gateZ },
    { x0: lawn.x1, x1: lawn.x1 + 0.6, z0: lawn.z0, z1: gateZ },
    { x0: lawn.x0, x1: lawn.x1, z0: lawn.z0 - 0.6, z1: lawn.z0 },
  );
  const bounds: Rect = { x0: Math.min(lawn.x0, westEndX - 44), x1: Math.max(lawn.x1, hw + 14), z0: lawn.z0, z1: roadZSouth };

  return {
    home, door, roadX, roadHalf: ROAD_HALF, roadZNorth: gateZ, roadZSouth, lots, people, cars, trees, lamps, benches, obstacles, bounds, stoop, park,
    estate: { gateZ, pillars, mansion, plaza, fountain, lawn },
  };
}

/** True when a point outdoors (away from the player's own trailer walls) is blocked. */
export function outdoorBlocked(plan: StreetPlan, x: number, z: number): boolean {
  const b = plan.bounds;
  if (x < b.x0 + R || x > b.x1 - R || z < b.z0 + R || z > b.z1 - R) return true;
  for (const o of plan.obstacles) if (inRect(x, z, o, R)) return true;
  return false;
}

/**
 * Whether the player can stand at (x, z), given the interior test. Inside the
 * trailer the interior rules apply; the walls are solid except for the front
 * doorway, which leads over the porch to the street.
 */
export function walkableAnywhere(plan: StreetPlan, x: number, z: number, interiorBlocked: (x: number, z: number) => boolean): boolean {
  const hw = plan.home.width / 2;
  const hd = plan.home.depth / 2;
  if (Math.abs(x) <= hw - R && Math.abs(z) <= hd - R) return !interiorBlocked(x, z);
  const door = plan.door;
  if (door && x < -hw + R && x > -hw - 1.8 && Math.abs(z - door.z) <= door.width / 2 - R) return true;
  if (x > -hw - R && x < hw + R && Math.abs(z) < hd + R) return false;
  return !outdoorBlocked(plan, x, z);
}

/** Height of the ground under (x, z): the porch is level with the floor, then steps down to the yard. */
export function groundYAt(plan: StreetPlan, x: number, z: number): number {
  const hw = plan.home.width / 2;
  const hd = plan.home.depth / 2;
  if (Math.abs(x) <= hw + 0.15 && Math.abs(z) <= hd + 0.15) return 0;
  const s = plan.stoop;
  if (!s || z < s.z0 || z > s.z1 || x < s.x0 || x > s.x1 + 0.15) return GROUND_Y;
  const flatEnd = s.x1 - 0.8;
  if (x >= flatEnd) return 0;
  return GROUND_Y * Math.min(1, (flatEnd - x) / (flatEnd - s.x0));
}
