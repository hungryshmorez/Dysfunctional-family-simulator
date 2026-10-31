// The trailer park layout: a central road with 12 single-wides, six per side.
// Every trailer has at least one neighbor; one is crowded (five people); the
// player's own trailer is theirs alone. Pure data so it can be tested and the
// 3D scene, collision, and UI all read from one source of truth.

export interface TrailerSpec {
  id: number;
  side: 'left' | 'right';
  /** Centre of the trailer footprint. */
  x: number;
  z: number;
  color: string;
  isPlayer: boolean;
  /** Others are locked; you can knock. The player's own is always open. */
  locked: boolean;
  occupants: number;
  /** e.g. "the Dillards". */
  household: string;
}

export interface NpcSpec {
  id: string;
  name: string;
  color: string;
  trailerId: number;
  /** Where they loiter — in the yard between their trailer and the road. */
  home: { x: number; z: number };
}

export interface Park {
  trailers: TrailerSpec[];
  npcs: NpcSpec[];
  road: { halfWidth: number; zMin: number; zMax: number };
  playerTrailerId: number;
}

export const TRAILER = { length: 9, width: 4.2, height: 2.9, door: 1.5, wall: 0.2 };
const SLOTS_Z = [-27.5, -16.5, -5.5, 5.5, 16.5, 27.5];
const LEFT_X = -9;
const RIGHT_X = 9;

// Occupant counts across the twelve trailers (indices 0-5 left, 6-11 right).
// Index 2 (left, near the entrance) is the player's — empty of NPCs. Index 4
// is the crowded one. Everyone else has at least one.
const COUNTS = [1, 2, 0, 1, 5, 2, 1, 1, 2, 1, 1, 1];
const PLAYER_TRAILER = 2;

const HOUSEHOLDS = ['the Dillards', 'the Crabbs', 'old Verna', 'the Hoyts', 'the Tuckers', 'the Mapes', 'the Rooks', 'Big Lenny', 'the Pratts', 'the Odoms', 'the Scoggins', 'the Few'];
const COLORS = ['#8a8475', '#9c8f7a', '#6f7d74', '#a9897a', '#7a8a93', '#938a6e', '#7d7466', '#8f7d84', '#6e8277', '#a2917c', '#86796b', '#7c8a80'];
const FIRST = ['Dale', 'Wanda', 'Earl', 'Tammy', 'Roy', 'Cheryl', 'Buck', 'Darlene', 'Merle', 'June', 'Hank', 'Sheila', 'Cletus', 'Donna', 'Wade', 'Patsy', 'Gus', 'Lurlene', 'Otis', 'Faye'];
const NPC_COLORS = ['#b0473f', '#4c6b8a', '#6a7f4a', '#8a6d3b', '#7a4b6b', '#3f7a6b', '#9a5a2a', '#55607a', '#7c6a8a', '#6b8a55', '#a07a45', '#5a7a7a', '#8a5a4a', '#487a5a', '#7a5a8a', '#6a5a3a', '#9a6a5a', '#4a6a7a', '#7a7a4a', '#5a4a6a'];

export function buildPark(): Park {
  const trailers: TrailerSpec[] = [];
  const npcs: NpcSpec[] = [];
  let npcIndex = 0;

  for (let i = 0; i < 12; i++) {
    const side: 'left' | 'right' = i < 6 ? 'left' : 'right';
    const x = side === 'left' ? LEFT_X : RIGHT_X;
    const z = SLOTS_Z[i % 6]!;
    const isPlayer = i === PLAYER_TRAILER;
    const occupants = COUNTS[i]!;
    trailers.push({ id: i, side, x, z, color: COLORS[i]!, isPlayer, locked: !isPlayer, occupants, household: isPlayer ? 'yours' : HOUSEHOLDS[i]! });

    // Loiter in the yard between the trailer and the road.
    const yardX = side === 'left' ? x + TRAILER.width / 2 + 1.4 : x - TRAILER.width / 2 - 1.4;
    for (let o = 0; o < occupants; o++) {
      const spread = occupants === 1 ? 0 : (o / (occupants - 1) - 0.5) * (TRAILER.length - 2);
      npcs.push({
        id: `npc-${i}-${o}`,
        name: FIRST[npcIndex % FIRST.length]!,
        color: NPC_COLORS[npcIndex % NPC_COLORS.length]!,
        trailerId: i,
        home: { x: yardX + (side === 'left' ? 1 : -1) * (o % 2) * 0.8, z: z + spread },
      });
      npcIndex++;
    }
  }

  return { trailers, npcs, road: { halfWidth: 3.6, zMin: -34, zMax: 34 }, playerTrailerId: PLAYER_TRAILER };
}
