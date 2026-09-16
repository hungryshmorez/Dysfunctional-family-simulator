import * as THREE from 'three';
import { ROOMS, type RoomDef } from './rooms';

/**
 * Builds a low-poly house interior from the room definitions: per-room floors,
 * a shared outer wall ring, and simple furniture blocks. Everything is grouped
 * so the whole house can be swapped for a generated layout later.
 */
export class House {
  readonly group = new THREE.Group();

  constructor() {
    this.buildGroundAndWalls();
    for (const room of ROOMS) {
      this.buildRoomFloor(room);
      this.buildFurniture(room);
    }
  }

  private buildGroundAndWalls(): void {
    const bounds = houseBounds();

    // Base slab under everything.
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(bounds.width + 1, 0.2, bounds.depth + 1),
      new THREE.MeshStandardMaterial({ color: 0x2b2735, roughness: 1 })
    );
    slab.position.set(bounds.cx, -0.11, bounds.cz);
    slab.receiveShadow = true;
    this.group.add(slab);

    const wallHeight = 1.6;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x3a3547,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const t = 0.15;
    const ring: Array<[number, number, number, number]> = [
      // [centerX, centerZ, sizeX, sizeZ]
      [bounds.cx, bounds.minZ, bounds.width, t],
      [bounds.cx, bounds.maxZ, bounds.width, t],
      [bounds.minX, bounds.cz, t, bounds.depth],
      [bounds.maxX, bounds.cz, t, bounds.depth],
    ];
    for (const [x, z, sx, sz] of ring) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(sx, wallHeight, sz),
        wallMat
      );
      wall.position.set(x, wallHeight / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
    }
  }

  private buildRoomFloor(room: RoomDef): void {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(room.size.x * 2, 0.04, room.size.y * 2),
      new THREE.MeshStandardMaterial({ color: room.floorColor, roughness: 0.95 })
    );
    floor.position.set(room.center.x, 0.01, room.center.y);
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private buildFurniture(room: RoomDef): void {
    // One representative prop per room, tinted from the floor color.
    const propColor = new THREE.Color(room.floorColor).offsetHSL(0, 0.05, 0.12);
    const prop = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.6, 0.7),
      new THREE.MeshStandardMaterial({ color: propColor, roughness: 0.7 })
    );
    prop.position.set(
      room.center.x + room.size.x * 0.5,
      0.32,
      room.center.y - room.size.y * 0.5
    );
    prop.castShadow = true;
    prop.receiveShadow = true;
    this.group.add(prop);
  }
}

export function houseBounds(): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cx: number;
  cz: number;
  width: number;
  depth: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const room of ROOMS) {
    minX = Math.min(minX, room.center.x - room.size.x);
    maxX = Math.max(maxX, room.center.x + room.size.x);
    minZ = Math.min(minZ, room.center.y - room.size.y);
    maxZ = Math.max(maxZ, room.center.y + room.size.y);
  }
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
    width: maxX - minX,
    depth: maxZ - minZ,
  };
}
