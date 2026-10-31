import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { computeWallOpenings, mergeHoleRects, openingsForWall, type WallOpening } from '@/components/room-organizer/three/wall-openings';
import { GROUND_Y, type Car, type Lot, type StreetPlan } from './street';
import type { RoomLayout, WallId } from '@/components/room-organizer/lib/types';

// Everything you see around and on the family trailer: the siding, roof and
// hitch of your own home, the sideways trailers either side of the road, the
// road itself, the little park at one end, and the rich estate at the other.
// Static geometry only; the people live in street-people.ts.

const WALL_HEIGHT = 3; // matches the room builder's walls
const SIDING_PITCH = 0.2;
const FLOOR_DROP = -GROUND_Y; // how far the floor sits above the yard

export interface Scenery {
  /** 0 = broad daylight, 1 = deep night: windows and lamps glow. */
  setNight(night: number): void;
}

type Vec3 = readonly [number, number, number];

interface Kit {
  mat(color: string, roughness?: number, extra?: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial;
  box(parent: THREE.Object3D, size: Vec3, pos: Vec3, material: THREE.Material, cast?: boolean): THREE.Mesh;
  cyl(parent: THREE.Object3D, r: number, h: number, pos: Vec3, material: THREE.Material, cast?: boolean, rot?: Vec3): THREE.Mesh;
  ball(parent: THREE.Object3D, r: number, pos: Vec3, material: THREE.Material, scale?: Vec3, cast?: boolean): THREE.Mesh;
  siding(color: string, shape: boolean): THREE.MeshStandardMaterial;
  sign(text: string, bg: string, fg: string, w: number, h: number): THREE.Mesh;
}

function makeKit(): Kit {
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const geos = new Map<string, THREE.BufferGeometry>();
  const geo = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
    let g = geos.get(key);
    if (!g) { g = make(); geos.set(key, g); }
    return g as T;
  };
  const mat = (color: string, roughness = 0.9, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial => {
    const key = color + '|' + roughness + '|' + JSON.stringify(extra, (_k, v) => (v instanceof THREE.Texture ? v.uuid : v));
    let m = mats.get(key);
    if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness, ...extra }); mats.set(key, m); }
    return m;
  };
  const place = (m: THREE.Mesh, pos: Vec3, cast: boolean): THREE.Mesh => { m.position.set(...pos); m.castShadow = cast; m.receiveShadow = true; return m; };
  // Horizontal vinyl siding: pale boards with a shadowed lower lip.
  const sidingTex = (): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 64;
    const g = c.getContext('2d');
    if (g) { g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, 8, 64); g.fillStyle = '#c4c2b8'; g.fillRect(0, 52, 8, 12); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, 6); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  let shapeTex: THREE.CanvasTexture | null = null;
  let boxTex: THREE.CanvasTexture | null = null;
  return {
    mat,
    box: (parent, size, pos, material, cast = false) => {
      const m = place(new THREE.Mesh(geo(`b${size.join(',')}`, () => new THREE.BoxGeometry(...size)), material), pos, cast);
      parent.add(m);
      return m;
    },
    cyl: (parent, r, h, pos, material, cast = false, rot = [0, 0, 0]) => {
      const m = place(new THREE.Mesh(geo(`c${r},${h}`, () => new THREE.CylinderGeometry(r, r, h, 14)), material), pos, cast);
      m.rotation.set(...rot);
      parent.add(m);
      return m;
    },
    ball: (parent, r, pos, material, scale = [1, 1, 1], cast = false) => {
      const m = place(new THREE.Mesh(geo(`s${r}`, () => new THREE.SphereGeometry(r, 14, 10)), material), pos, cast);
      m.scale.set(...scale);
      parent.add(m);
      return m;
    },
    siding: (color, shape) => {
      // ShapeGeometry UVs are in metres; box faces run 0..1.
      if (shape) {
        shapeTex ??= sidingTex();
        shapeTex.repeat.set(1, 1 / SIDING_PITCH);
        return mat(color, 0.85, { map: shapeTex });
      }
      if (!boxTex) { boxTex = sidingTex(); boxTex.repeat.set(1, 2.7 / SIDING_PITCH); }
      return mat(color, 0.85, { map: boxTex });
    },
    sign: (text, bg, fg, w, h) => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = Math.round(512 * h / w);
      const g = c.getContext('2d');
      if (g) {
        g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
        g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(10, 10, c.width - 20, c.height - 20);
        g.fillStyle = fg; g.font = `700 ${Math.round(c.height * 0.4)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(text, c.width / 2, c.height / 2 + 3, c.width - 40);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, side: THREE.DoubleSide }));
    },
  };
}

/** A shallow gable roof along x (a long, low prism). */
function gableRoof(length: number, width: number, rise: number, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, rise); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  g.translate(0, 0, -length / 2);
  g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/**
 * Bake static scenery into a handful of meshes. Hundreds of little boxes would
 * each cost a draw call; merging every mesh that shares a material (and shadow
 * flags) keeps the whole street to a few dozen.
 */
function mergeStatic(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; geos: THREE.BufferGeometry[] }>();
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  const m4 = new THREE.Matrix4();
  for (const m of meshes) {
    if (Array.isArray(m.material)) continue;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    g.clearGroups();
    g.applyMatrix4(m4.multiplyMatrices(toRoot, m.matrixWorld));
    const key = `${m.material.uuid}|${m.castShadow}|${m.receiveShadow}`;
    const bucket = buckets.get(key) ?? { material: m.material, cast: m.castShadow, receive: m.receiveShadow, geos: [] };
    bucket.geos.push(g);
    buckets.set(key, bucket);
  }
  root.clear();
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    for (const g of b.geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }
}

export function dressStreet(scene: THREE.Scene, plan: StreetPlan, home: RoomLayout): Scenery {
  const kit = makeKit();
  const { mat, box, cyl, ball } = kit;
  const windowGlass = mat('#a9bcc6', 0.3, { emissive: '#ffcf70', emissiveIntensity: 0.15 });
  const lampGlass = mat('#fff0c0', 0.3, { emissive: '#ffd990', emissiveIntensity: 0.2 });
  const mansionGlass = mat('#a3b6c4', 0.3, { emissive: '#ffd48a', emissiveIntensity: 0.15 });
  const white = mat('#f1efe8', 0.7);
  const dark = mat('#2b2824', 1);
  const wood = mat('#7a6548', 0.95);
  const steel = mat('#4a5058', 0.55, { metalness: 0.15 });
  const asphalt = mat('#3a3a40', 1);
  const grass = mat('#5b6e48', 1);
  const lawnMat = mat('#4d8a47', 1);
  const stone = mat('#d8d0bd', 0.9);

  const flat = (parent: THREE.Object3D, w: number, d: number, x: number, z: number, y: number, material: THREE.Material): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // ---------------------------------------------------------------- ground
  const land = new THREE.Group();
  flat(land, 700, 700, 0, -20, GROUND_Y - 0.02, grass);
  const rx = plan.roadX, half = plan.roadHalf;
  const roadLen = plan.roadZSouth - plan.estate.gateZ;
  const roadMid = (plan.roadZSouth + plan.estate.gateZ) / 2;
  flat(land, half * 2 + 1.6, roadLen, rx, roadMid, GROUND_Y + 0.01, mat('#5a5448', 1)); // gravel shoulders
  flat(land, half * 2, roadLen, rx, roadMid, GROUND_Y + 0.03, asphalt);
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(6.4, 36), asphalt);
  bulb.rotation.x = -Math.PI / 2; bulb.position.set(rx, GROUND_Y + 0.03, plan.roadZSouth - 5); land.add(bulb);
  for (const side of [-1, 1]) flat(land, 0.14, roadLen, rx + side * (half - 0.35), roadMid, GROUND_Y + 0.045, mat('#d7d3c2', 1));
  for (let z = plan.estate.gateZ + 2; z < plan.roadZSouth - 6; z += 4.2) flat(land, 0.16, 1.9, rx, z, GROUND_Y + 0.045, mat('#c9a93a', 1));
  // Estate drive, plaza and manicured lawn.
  const e = plan.estate;
  flat(land, e.lawn.x1 - e.lawn.x0, e.lawn.z1 - e.lawn.z0, (e.lawn.x0 + e.lawn.x1) / 2, (e.lawn.z0 + e.lawn.z1) / 2, GROUND_Y + 0.005, lawnMat);
  flat(land, 7, e.gateZ - e.plaza.z, rx, (e.gateZ + e.plaza.z) / 2, GROUND_Y + 0.03, mat('#7b7364', 0.95));
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(e.plaza.r, 48), stone);
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(e.plaza.x, GROUND_Y + 0.035, e.plaza.z); land.add(plaza);
  const ring = new THREE.Mesh(new THREE.RingGeometry(e.plaza.r - 0.5, e.plaza.r, 48), mat('#9d9684', 0.9));
  ring.rotation.x = -Math.PI / 2; ring.position.set(e.plaza.x, GROUND_Y + 0.04, e.plaza.z); land.add(ring);
  // The little park at the south end.
  const pk = plan.park;
  flat(land, pk.x1 - pk.x0, pk.z1 - pk.z0, (pk.x0 + pk.x1) / 2, (pk.z0 + pk.z1) / 2, GROUND_Y + 0.02, mat('#5a9650', 1));
  scene.add(land);
  mergeStatic(land);

  // ------------------------------------------------------- street furniture
  const street = new THREE.Group();
  for (const lamp of plan.lamps) {
    const g = new THREE.Group(); g.position.set(lamp.x, GROUND_Y, lamp.z);
    cyl(g, 0.07, 4.6, [0, 2.3, 0], steel, true);
    box(g, [0.9, 0.08, 0.08], [lamp.x < rx ? 0.4 : -0.4, 4.55, 0], steel);
    ball(g, 0.22, [lamp.x < rx ? 0.8 : -0.8, 4.5, 0], lampGlass);
    street.add(g);
  }
  for (const b of plan.benches) {
    const g = new THREE.Group(); g.position.set(b.x, GROUND_Y, b.z); g.rotation.y = b.rot;
    box(g, [1.8, 0.1, 0.5], [0, 0.5, 0], wood, true);
    box(g, [1.8, 0.5, 0.08], [0, 0.82, -0.22], wood, true);
    for (const s of [-0.8, 0.8]) box(g, [0.08, 0.5, 0.5], [s, 0.25, 0], steel);
    street.add(g);
  }
  const signAt = (text: string, bg: string, fg: string, x: number, z: number, rotY: number, w = 1.9, h = 0.5, y = 2.4): void => {
    const s = kit.sign(text, bg, fg, w, h);
    s.position.set(x, GROUND_Y + y, z); s.rotation.y = rotY;
    cyl(street, 0.05, y, [x, GROUND_Y + y / 2, z + (rotY === 0 ? -0.08 : 0)], steel);
    street.add(s);
  };
  signAt('MOROSE LANE', '#1f5a3a', '#f1efe8', rx + half + 1.1, -2.6, -Math.PI / 2);
  signAt('DEAD END', '#c9732a', '#1b1b1b', rx, plan.roadZSouth - 1.2, Math.PI, 1.6, 0.9, 1.6);
  signAt('THE LITTLE PARK', '#2f6a3a', '#f1efe8', pk.x0 + 3, pk.z0 - 0.8, Math.PI, 2.4, 0.6, 1.6);
  // Cars parked in the front yards.
  const buildCar = (c: Car): THREE.Group => {
    const g = new THREE.Group(); g.position.set(c.x, GROUND_Y, c.z); g.rotation.y = c.rot;
    const paint = mat(c.color, 0.5, { metalness: 0.1 });
    const long = c.kind === 'limo' ? 6.4 : 4.4;
    box(g, [1.9, 0.7, long], [0, 0.65, 0], paint, true);
    if (c.kind === 'truck') {
      box(g, [1.8, 0.7, 1.7], [0, 1.3, -0.9], paint, true);
      box(g, [1.7, 0.12, 2.0], [0, 1.05, 1.1], dark);
    } else {
      box(g, [1.7, 0.65, c.kind === 'limo' ? 3.4 : 2.2], [0, 1.28, -0.2], paint, true);
    }
    box(g, [1.72, 0.4, c.kind === 'limo' ? 3.45 : 2.25], [0, 1.3, c.kind === 'truck' ? -0.9 : -0.2], mat('#1d2830', 0.3, { metalness: 0.1 }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.36, 0.28, [sx * 0.95, 0.36, sz * long * 0.32], dark, false, [0, 0, Math.PI / 2]);
    return g;
  };
  for (const c of plan.cars) street.add(buildCar(c));
  // Trees.
  const crowns = ['#35502f', '#3f5a33', '#2f4a2d'];
  plan.trees.forEach((t, i) => {
    const g = new THREE.Group(); g.position.set(t.x, GROUND_Y, t.z);
    cyl(g, 0.16 * t.size, 2.2 * t.size, [0, 1.1 * t.size, 0], mat('#4a3b2c', 1), true);
    ball(g, 1.5 * t.size, [0, 3.2 * t.size, 0], mat(crowns[i % crowns.length]!, 1), [1, 1.25, 1], true);
    ball(g, 1.0 * t.size, [0.6 * t.size, 2.6 * t.size, 0.4 * t.size], mat(crowns[(i + 1) % crowns.length]!, 1), [1, 1.1, 1]);
    street.add(g);
  });
  scene.add(street);
  mergeStatic(street);

  // -------------------------------------------------- neighbors' trailers
  const buildNeighbor = (lot: Lot, index: number): THREE.Group => {
    const g = new THREE.Group(); g.position.set(lot.cx, 0, lot.cz); g.rotation.y = lot.rot;
    const L = lot.length, W = lot.width, doorZ = W > 6 ? W * 0.22 : 0;
    const body = kit.siding(lot.color, false);
    box(g, [L + 0.1, FLOOR_DROP - 0.06, W + 0.1], [0, -0.06 - (FLOOR_DROP - 0.06) / 2, 0], dark); // skirting
    box(g, [L, 2.7, W], [0, 1.35, 0], body, true);                                                // body
    box(g, [L + 0.06, 0.1, W + 0.06], [0, 2.72, 0], white);                                       // trim
    const roof = gableRoof(L + 0.6, W + 0.9, 0.35 + W * 0.07, mat(lot.roof, 0.6, { metalness: 0.1 }));
    roof.position.y = 2.72; g.add(roof);
    // Front door at the road end, with a deck and a step down to the yard.
    const fx = -L / 2;
    box(g, [0.07, 2.0, 0.95], [fx - 0.04, 1.0, doorZ], mat('#4a3b32', 0.8), false);
    box(g, [0.1, 0.12, 1.15], [fx - 0.05, 2.04, doorZ], white);
    box(g, [1.7, 0.12, 2.2], [fx - 0.85, -0.06, doorZ], wood, true);
    box(g, [0.55, 0.3, 1.5], [fx - 1.95, -0.45, doorZ], wood, true);
    for (const s of [-1, 1]) { box(g, [1.5, 0.05, 0.05], [fx - 0.8, 0.85, doorZ + s * 1.05], white); box(g, [0.06, 0.9, 0.06], [fx - 1.5, 0.45, doorZ + s * 1.05], white); }
    ball(g, 0.1, [fx - 0.14, 2.4, doorZ - 0.5], lampGlass);
    // Windows along both long sides and beside the door.
    for (const side of [-1, 1]) for (const f of [-0.3, 0.08, 0.32]) {
      const wx = f * L, wz = side * (W / 2 + 0.02);
      box(g, [1.3, 1.0, 0.08], [wx, 1.55, wz], white);
      box(g, [1.12, 0.82, 0.1], [wx, 1.55, wz + side * 0.01], windowGlass);
    }
    if (doorZ !== 0 || W > 6) { box(g, [0.08, 0.9, 1.0], [fx - 0.01, 1.55, doorZ - 1.5], white); box(g, [0.1, 0.72, 0.84], [fx - 0.02, 1.55, doorZ - 1.5], windowGlass); }
    // Roof clutter, a dish, and a window unit.
    cyl(g, 0.12, 0.5, [L * 0.2, 3.35, W * 0.15], steel, false);
    cyl(g, 0.04, 0.9, [-L * 0.15, 3.5, -W * 0.1], steel, false);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.18, 16), mat('#d8d8d4', 0.4));
    dish.position.set(-L * 0.15, 4.0, -W * 0.1); dish.rotation.set(1.1, 0, 0.5); g.add(dish);
    if (index % 2 === 0) box(g, [0.9, 0.55, 0.45], [L * 0.1, 0.8, W / 2 + 0.24], mat('#b8b4a8', 0.6), true);
    // Yard life: chairs and a grill, or bins and a propane tank.
    if (index % 2 === 0) {
      for (const s of [-0.45, 0.45]) { box(g, [0.5, 0.06, 0.5], [fx - 2.9, -0.2, doorZ + 1.6 + s], white); box(g, [0.5, 0.5, 0.06], [fx - 3.1, 0.05, doorZ + 1.6 + s], white); }
    } else {
      cyl(g, 0.28, 0.7, [fx - 1.5, -0.25, doorZ - 1.6], mat('#2f4a38', 0.8), true);
      cyl(g, 0.28, 0.7, [fx - 1.5, -0.25, doorZ - 2.2], mat('#2f3a4a', 0.8), true);
    }
    cyl(g, 0.3, 1.1, [L / 2 + 0.5, -0.05, -W / 2 + 0.6], white, true, [0, 0, Math.PI / 2]);
    // Gravel pad for the car, and a concrete path to the road.
    flat(g, 5.4, 1.2, fx - 3.4, doorZ, GROUND_Y + 0.03, mat('#77736a', 1));
    if (lot.sign) {
      const dim = lot.sign.startsWith('NIGHT');
      const s = kit.sign(lot.sign, dim ? '#16181f' : '#7a3a2a', dim ? '#7df3ff' : '#f6e8cf', 3.4, 0.7);
      s.position.set(fx - 0.1, 2.32, 0); s.rotation.y = -Math.PI / 2; g.add(s);
      if (!dim) box(g, [1.0, 0.08, 3.6], [fx - 0.5, 2.15, 0], mat('#b04a3a', 0.9), true);
    }
    return g;
  };
  const neighbors = new THREE.Group();
  plan.lots.filter((l) => !l.isPlayer).forEach((lot, i) => neighbors.add(buildNeighbor(lot, i)));
  // Mailboxes in world space (kept apart from the rotated lot groups).
  for (const lot of plan.lots) {
    const mx = lot.side === 'east' ? plan.roadX + half + 0.9 : plan.roadX - half - 0.9;
    cyl(neighbors, 0.04, 1.1, [mx, GROUND_Y + 0.55, lot.cz], steel);
    box(neighbors, [0.22, 0.2, 0.4], [mx, GROUND_Y + 1.2, lot.cz], mat('#2f3a5a', 0.7), true);
  }
  scene.add(neighbors);
  mergeStatic(neighbors);

  // ----------------------------------------------------- the family trailer
  const W = home.width, D = home.height, hw = W / 2, hd = D / 2;
  const opens = computeWallOpenings(home.floors[0]?.items ?? [], W, D, WALL_HEIGHT, home.floors[0]?.interiorWalls ?? []);
  const skin = kit.siding('#bdae8c', true);
  const trim = white;
  const specs: { id: WallId; width: number; rotateY: number; pos: [number, number]; out: [number, number] }[] = [
    { id: 'north', width: W, rotateY: 0, pos: [0, -hd], out: [0, -1] },
    { id: 'south', width: W, rotateY: Math.PI, pos: [0, hd], out: [0, 1] },
    { id: 'west', width: D, rotateY: Math.PI / 2, pos: [-hw, 0], out: [-1, 0] },
    { id: 'east', width: D, rotateY: -Math.PI / 2, pos: [hw, 0], out: [1, 0] },
  ];
  const tagWall = (o: THREE.Object3D, id: WallId): void => { o.userData.type = 'wall'; o.userData.wallId = id; };
  const skinGeometry = (width: number, cuts: readonly WallOpening[]): THREE.BufferGeometry => {
    const hwid = width / 2, hh = WALL_HEIGHT / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-hwid, -hh); shape.lineTo(hwid, -hh); shape.lineTo(hwid, hh); shape.lineTo(-hwid, hh); shape.closePath();
    // The skin faces outward, so its local x runs the opposite way to the room wall's.
    const rects = cuts.map((c) => [-c.centerAlongWall - c.width / 2, -hh + c.bottomFromFloor, -c.centerAlongWall + c.width / 2, -hh + c.bottomFromFloor + c.height] as [number, number, number, number]);
    for (const [x0, y0, x1, y1] of mergeHoleRects(rects)) {
      if (x1 - x0 <= 0 || y1 - y0 <= 0) continue;
      const hole = new THREE.Path();
      hole.moveTo(x0, y0); hole.lineTo(x1, y0); hole.lineTo(x1, y1); hole.lineTo(x0, y1); hole.closePath();
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
  };
  for (const s of specs) {
    const cuts = openingsForWall(opens, s.id);
    const wall = new THREE.Mesh(skinGeometry(s.width, cuts), skin);
    wall.rotation.y = s.rotateY + Math.PI;
    wall.position.set(s.pos[0] + s.out[0] * 0.03, WALL_HEIGHT / 2, s.pos[1] + s.out[1] * 0.03);
    wall.receiveShadow = true; wall.castShadow = true;
    tagWall(wall, s.id);
    scene.add(wall);
    // A wall-top cap makes the cutaway read as solid walls, not paper.
    const cap = new THREE.Mesh(new THREE.BoxGeometry(s.id === 'north' || s.id === 'south' ? W + 0.2 : 0.2, 0.12, s.id === 'north' || s.id === 'south' ? 0.2 : D + 0.2), trim);
    cap.position.set(s.pos[0] + s.out[0] * 0.02, WALL_HEIGHT + 0.04, s.pos[1] + s.out[1] * 0.02);
    cap.castShadow = true;
    tagWall(cap, s.id);
    scene.add(cap);
  }
  const base = new THREE.Group();
  // Underpinning sits just below the floor plane, or it would z-fight with it.
  box(base, [W + 0.3, FLOOR_DROP - 0.06, D + 0.3], [0, -0.06 - (FLOOR_DROP - 0.06) / 2, 0], dark);
  // Hitch: an A-frame tongue under the far end, resting on a jack.
  for (const s of [-1, 1]) { const beam = box(base, [2.6, 0.14, 0.12], [hw + 1.3, -0.22, s * 0.5], steel); beam.rotation.y = s * 0.2; }
  ball(base, 0.1, [hw + 2.55, -0.2, 0], steel);
  cyl(base, 0.05, 0.4, [hw + 2.1, -0.4, 0], steel);
  box(base, [0.5, 0.05, 0.4], [hw + 2.1, -0.59, 0], steel);
  // Propane tank and a window unit.
  cyl(base, 0.32, 1.2, [hw + 0.8, -0.2, -hd + 0.9], white, true, [0, 0, Math.PI / 2]);
  box(base, [1.0, 0.6, 0.5], [2, 0.9, hd + 0.28], mat('#b8b4a8', 0.6), true);
  // Porch at the front door, with steps down to the yard and a railing.
  const door = plan.door;
  if (door && plan.stoop) {
    const s = plan.stoop;
    box(base, [s.x1 - s.x0, 0.12, s.z1 - s.z0], [(s.x0 + s.x1) / 2, -0.06, door.z], wood, true);
    box(base, [0.5, 0.3, 1.5], [s.x0 - 0.2, -0.45, door.z], wood, true);
    for (const side of [s.z0, s.z1]) { box(base, [s.x1 - s.x0 - 0.2, 0.05, 0.05], [(s.x0 + s.x1) / 2 - 0.1, 0.9, side], white); box(base, [0.06, 0.9, 0.06], [s.x0 + 0.3, 0.45, side], white); }
    ball(base, 0.1, [-hw - 0.14, 2.45, door.z - door.width / 2 - 0.15], lampGlass);
    // The door itself, hinged open against the porch (hides with the wall).
    const hinge = new THREE.Group(); hinge.position.set(-hw - 0.05, 0, door.z + door.width / 2);
    hinge.rotation.y = 1.3;
    box(hinge, [0.05, 2.0, door.width * 0.95], [0, 1.0, -door.width * 0.48], mat('#6d4c41', 0.7), true);
    tagWall(hinge, 'west');
    scene.add(hinge);
    const awning = box(new THREE.Group(), [1.0, 0.06, door.width + 1.6], [0, 0, 0], mat('#8a8e91', 0.55, { metalness: 0.1 }), true);
    awning.position.set(-hw - 0.55, 2.2, door.z);
    tagWall(awning, 'west');
    scene.add(awning);
  }
  scene.add(base);
  mergeStatic(base);
  // Roof (appears only when walls are raised or you are outside).
  const roofGroup = new THREE.Group();
  const roofMat = mat('#7b7f84', 0.55, { metalness: 0.1 });
  const roof = gableRoof(W + 0.8, D + 1.0, 0.9, roofMat);
  roof.position.y = WALL_HEIGHT; roofGroup.add(roof);
  box(roofGroup, [0.5, 1.3, 0.5], [-hw * 0.4, WALL_HEIGHT + 1.2, -hd * 0.3], mat('#8a5a4a', 0.9), true);
  cyl(roofGroup, 0.1, 0.9, [hw * 0.3, WALL_HEIGHT + 1.0, hd * 0.2], steel);
  cyl(roofGroup, 0.1, 0.9, [hw * 0.5, WALL_HEIGHT + 1.0, -hd * 0.2], steel);
  cyl(roofGroup, 0.04, 1.2, [-hw * 0.7, WALL_HEIGHT + 1.6, hd * 0.1], steel);
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.2, 16), mat('#d8d8d4', 0.4));
  dish.position.set(-hw * 0.7, WALL_HEIGHT + 2.2, hd * 0.1); dish.rotation.set(1.0, 0, 0.5); roofGroup.add(dish);
  roofGroup.userData.type = 'roof';
  scene.add(roofGroup);
  mergeStatic(roofGroup);
  // Mailbox out by the road (your own).
  const mine = new THREE.Group();
  cyl(mine, 0.04, 1.1, [rx + half + 0.9, GROUND_Y + 0.55, 0], steel);
  box(mine, [0.22, 0.2, 0.4], [rx + half + 0.9, GROUND_Y + 1.2, 0], mat('#8a3a2a', 0.7), true);
  scene.add(mine);
  mergeStatic(mine);

  // ------------------------------------------------------------ the estate
  const estate = new THREE.Group();
  const hedge = mat('#2d5a33', 1);
  const cream = mat('#e8e0cc', 0.85);
  const slate = mat('#4a4f5c', 0.6, { metalness: 0.1 });
  const gold = mat('#d6b24c', 0.4, { metalness: 0.3 });
  // Gate: stone pillars with lamps, open iron leaves, hedges either side.
  for (const p of e.pillars) {
    const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
    box(estate, [1.4, 3.4, 1.4], [cx, GROUND_Y + 1.7, cz], stone, true);
    box(estate, [1.7, 0.3, 1.7], [cx, GROUND_Y + 3.55, cz], mat('#bdb59f', 0.9), true);
    ball(estate, 0.34, [cx, GROUND_Y + 4.0, cz], lampGlass);
  }
  const placeSign = kit.sign('WHITCOMBE ESTATE · PRIVATE', '#14161c', '#e6c765', 3.0, 0.6);
  placeSign.position.set(e.pillars[0] ? (e.pillars[0].x0 + e.pillars[0].x1) / 2 : rx - 5.6, GROUND_Y + 2.2, e.gateZ + 0.75); estate.add(placeSign);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group(); leaf.position.set(rx + side * 4.9, GROUND_Y, e.gateZ); leaf.rotation.y = side * 1.35;
    box(leaf, [0.08, 2.4, 2.6], [0, 1.2, 1.3], steel); box(leaf, [0.12, 0.1, 2.6], [0, 2.4, 1.3], gold);
    for (let z = 0.2; z < 2.6; z += 0.35) box(leaf, [0.05, 2.4, 0.05], [0, 1.2, z], steel);
    estate.add(leaf);
    const x0 = side < 0 ? e.lawn.x0 : rx + 6.3, x1 = side < 0 ? rx - 6.3 : e.lawn.x1;
    box(estate, [x1 - x0, 1.7, 0.8], [(x0 + x1) / 2, GROUND_Y + 0.85, e.gateZ], hedge, true);
  }
  box(estate, [e.lawn.x1 - e.lawn.x0, 1.7, 0.9], [(e.lawn.x0 + e.lawn.x1) / 2, GROUND_Y + 0.85, e.lawn.z0 - 0.3], hedge, true);
  for (const x of [e.lawn.x0 - 0.3, e.lawn.x1 + 0.3]) box(estate, [0.9, 1.7, e.gateZ - e.lawn.z0], [x, GROUND_Y + 0.85, (e.gateZ + e.lawn.z0) / 2], hedge, true);
  // Fountain.
  const f = e.fountain;
  cyl(estate, f.r, 0.8, [f.x, GROUND_Y + 0.4, f.z], stone, true);
  cyl(estate, f.r - 0.35, 0.82, [f.x, GROUND_Y + 0.42, f.z], mat('#3b93b8', 0.1, { metalness: 0.3, emissive: '#1e5d7a', emissiveIntensity: 0.4 }));
  cyl(estate, 0.35, 2.0, [f.x, GROUND_Y + 1.4, f.z], stone, true);
  cyl(estate, 1.1, 0.25, [f.x, GROUND_Y + 2.2, f.z], stone, true);
  ball(estate, 0.35, [f.x, GROUND_Y + 2.6, f.z], mat('#9fd7ee', 0.1, { emissive: '#4fa0c0', emissiveIntensity: 0.5 }));
  // Mansion: stone plinth, two floors, grand portico, slate roof, chimneys.
  const m = e.mansion;
  const mx = (m.x0 + m.x1) / 2, mz = (m.z0 + m.z1) / 2, mw = m.x1 - m.x0, md = m.z1 - m.z0, front = m.z1;
  box(estate, [mw + 1, 1.5, md + 1], [mx, GROUND_Y + 0.75, mz], stone, true);
  box(estate, [mw, 8, md], [mx, GROUND_Y + 1.5 + 4, mz], cream, true);
  for (const s of [-1, 1]) box(estate, [8, 9.5, md + 0.6], [mx + s * (mw / 2 - 4), GROUND_Y + 1.5 + 4.75, mz], mat('#ddd3bb', 0.85), true);
  const roofM = gableRoof(mw - 16, md + 2.4, 3.6, slate); roofM.position.set(mx, GROUND_Y + 9.5, mz); estate.add(roofM);
  for (const s of [-1, 1]) { const w = gableRoof(8.6, md + 1.6, 2.6, slate); w.position.set(mx + s * (mw / 2 - 4), GROUND_Y + 11.0, mz); estate.add(w); }
  for (const x of [-9, 12]) box(estate, [1.4, 3.4, 1.4], [mx + x, GROUND_Y + 12.6, mz - 2], mat('#9a5a44', 0.95), true);
  for (const row of [0, 1]) for (let i = 0; i < 9; i++) {
    const wx = mx - mw / 2 + 4 + i * ((mw - 8) / 8);
    if (Math.abs(wx - mx) < 7.5) continue;
    const wy = GROUND_Y + 1.5 + (row ? 6.2 : 2.9);
    box(estate, [1.7, 2.7, 0.15], [wx, wy, front + 0.07], white);
    box(estate, [1.4, 2.4, 0.18], [wx, wy, front + 0.09], mansionGlass);
  }
  box(estate, [17, 0.4, 4.6], [mx, GROUND_Y + 1.7, front + 2.3], stone, true);
  for (const x of [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]) cyl(estate, 0.46, 7.4, [mx + x, GROUND_Y + 1.9 + 3.7, front + 3.4], white, true);
  box(estate, [17.4, 1.0, 4.8], [mx, GROUND_Y + 9.3, front + 2.4], cream, true);
  const pedShape = new THREE.Shape(); pedShape.moveTo(-8.8, 0); pedShape.lineTo(8.8, 0); pedShape.lineTo(0, 2.8); pedShape.closePath();
  const pedGeo = new THREE.ExtrudeGeometry(pedShape, { depth: 4.8, bevelEnabled: false }); pedGeo.translate(0, 0, -2.4);
  const ped = new THREE.Mesh(pedGeo, cream); ped.position.set(mx, GROUND_Y + 9.8, front + 2.4); ped.castShadow = true; estate.add(ped);
  box(estate, [3.4, 4.6, 0.3], [mx, GROUND_Y + 1.9 + 2.3, front + 0.12], mat('#3b2a22', 0.6), true);
  for (const s of [-0.9, 0.9]) ball(estate, 0.12, [mx + s, GROUND_Y + 4, front + 0.35], gold);
  for (let i = 0; i < 4; i++) box(estate, [12 + i * 1.6, 0.3, 1.0], [mx, GROUND_Y + 1.5 + 0.15 - i * 0.2 + 0.4, front + 5.3 + i * 0.9], stone, true);
  for (const s of [-1, 1]) for (const dz of [5.2, 8]) {
    cyl(estate, 0.45, 0.6, [mx + s * 9.2, GROUND_Y + 0.3, front + dz], mat('#b9916b', 0.9), true);
    ball(estate, 0.85, [mx + s * 9.2, GROUND_Y + 1.35, front + dz], hedge, [1, 1, 1], true);
  }
  for (const s of [-1, 1]) for (let z = e.gateZ - 4; z > e.plaza.z + 8; z -= 6) {
    cyl(estate, 0.06, 2.6, [rx + s * 4.2, GROUND_Y + 1.3, z], steel);
    ball(estate, 0.2, [rx + s * 4.2, GROUND_Y + 2.7, z], lampGlass);
  }
  scene.add(estate);
  mergeStatic(estate);

  return {
    setNight(night: number) {
      windowGlass.emissiveIntensity = 0.12 + 1.7 * night;
      mansionGlass.emissiveIntensity = 0.12 + 1.8 * night;
      lampGlass.emissiveIntensity = 0.15 + 2.4 * night;
    },
  };
}
