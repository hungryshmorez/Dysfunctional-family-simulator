import * as THREE from 'three';

export interface RoomDef {
  id: string;
  name: string;
  /** center on the floor plane (x, z) */
  center: THREE.Vector2;
  /** half-extents (x, z) */
  size: THREE.Vector2;
  floorColor: number;
}

/**
 * Hand-authored room layout for v0. This is the seam where a WFC / modular
 * tile generator (e.g. an on-ethos world_builder-style constraint solver)
 * can later replace the static list without touching House or the sim.
 */
export const ROOMS: RoomDef[] = [
  {
    id: 'living',
    name: 'Living Room',
    center: new THREE.Vector2(-3, -2),
    size: new THREE.Vector2(3.5, 3),
    floorColor: 0x6b5b4a,
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    center: new THREE.Vector2(3.5, -2),
    size: new THREE.Vector2(3, 3),
    floorColor: 0x50565e,
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    center: new THREE.Vector2(-3, 3),
    size: new THREE.Vector2(3.5, 2.5),
    floorColor: 0x5a4a66,
  },
  {
    id: 'study',
    name: 'Study',
    center: new THREE.Vector2(3.5, 3),
    size: new THREE.Vector2(3, 2.5),
    floorColor: 0x4a5a52,
  },
];

export function roomById(id: string): RoomDef {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) {
    throw new Error(`Unknown room id: ${id}`);
  }
  return room;
}

/** A random point inside a room, kept a little away from the walls. */
export function randomPointInRoom(room: RoomDef): THREE.Vector3 {
  const margin = 0.6;
  const x =
    room.center.x + (Math.random() * 2 - 1) * Math.max(0, room.size.x - margin);
  const z =
    room.center.y + (Math.random() * 2 - 1) * Math.max(0, room.size.y - margin);
  return new THREE.Vector3(x, 0, z);
}
