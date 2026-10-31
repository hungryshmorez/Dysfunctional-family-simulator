import * as THREE from 'three';
import { animateCharacter, createCharacter } from './character';
import { nameplate, updateNameplate } from './nameplate';
import { currentActivity, ROSTER, type NpcDef } from './neighborhood';
import { outdoorBlocked, type Person, type StreetPlan } from './street';

// The people who live on the street. Neighbours loiter in their front yards,
// the game's own townspeople (Della, Ren, Ozzie, Sim) follow their daily
// schedules from neighborhood.ts and turn in when it says they are asleep, and
// the rich stay put on their lawn. Nobody here enters the household economy —
// they are the world getting on with itself — so tapping them does nothing.

// Full articulated characters are costly (dozens of meshes each), so only the
// nearby ones are drawn in full; farther away a simple figure stands in.
const FULL_RANGE = 30;
const FAR_RANGE = 120;
const WALK_SPEED = 0.6;

export interface StreetPeople {
  update(dt: number, phase: number, minute: number, viewer: THREE.Vector3): void;
}

interface Entry {
  person: Person;
  mesh: THREE.Group;
  stand: THREE.Group;
  label: THREE.Sprite;
  home: { x: number; z: number };
  target: { x: number; z: number };
  wait: number;
  offset: number;
  def: NpcDef | null;
  roam: number;
  lastDetail: string;
}

const ROLE_COLOR = '#315c4b';

export function createStreetPeople(scene: THREE.Scene, plan: StreetPlan): StreetPeople {
  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.2, 1.1, 8);
  const headGeo = new THREE.SphereGeometry(0.17, 8, 6);
  const headMat = new THREE.MeshStandardMaterial({ color: '#c99a74', roughness: 0.9 });
  const entries: Entry[] = plan.people.map((person, i) => {
    const mesh = createCharacter(person.name, person.color);
    mesh.position.set(person.x, 0, person.z);
    mesh.position.y = 0;
    const faceX = person.kind === 'rich' ? 0 : person.x < plan.roadX ? 1 : -1;
    mesh.rotation.y = Math.atan2(faceX, person.kind === 'rich' ? 1 : 0);
    const label = nameplate(person.name);
    mesh.add(label);
    mesh.userData.street = true;
    const def = person.rosterId ? ROSTER.find((r) => r.id === person.rosterId) ?? null : null;
    const lot = person.lotId ? plan.lots.find((l) => l.id === person.lotId) : null;
    const detail = person.detail ?? (lot ? lot.household : '');
    updateNameplate(label, person.name, detail, ROLE_COLOR);
    scene.add(mesh);
    const stand = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: person.color, roughness: 0.9 }));
    body.position.y = 0.75;
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.52;
    stand.add(body, head);
    stand.position.copy(mesh.position);
    stand.visible = false;
    scene.add(stand);
    return {
      person, mesh, stand, label, home: { x: person.x, z: person.z }, target: { x: person.x, z: person.z },
      wait: Math.random() * 4, offset: i * 1.7, def, roam: person.kind === 'rich' ? 1.2 : 1.5, lastDetail: detail,
    };
  });

  return {
    update(dt, phase, minute, viewer) {
      for (const e of entries) {
        const m = e.mesh;
        const dist = Math.hypot(m.position.x - viewer.x, m.position.z - viewer.z);
        let asleep = false;
        if (e.def) {
          const activity = currentActivity(e.def, minute);
          asleep = /asleep/i.test(activity);
          if (activity !== e.lastDetail) {
            e.lastDetail = activity;
            updateNameplate(e.label, e.person.name, activity, ROLE_COLOR);
          }
        }
        const present = !asleep && dist < FAR_RANGE;
        const full = present && dist < FULL_RANGE;
        m.visible = full;
        e.stand.visible = present && !full;
        if (!present) continue;
        e.wait -= dt;
        if (e.wait <= 0) {
          e.wait = 2.5 + Math.random() * 5;
          for (let tries = 0; tries < 5; tries++) {
            const x = e.home.x + (Math.random() - 0.5) * 2 * e.roam, z = e.home.z + (Math.random() - 0.5) * 2 * e.roam;
            if (!outdoorBlocked(plan, x, z)) { e.target = { x, z }; break; }
          }
        }
        const dx = e.target.x - m.position.x, dz = e.target.z - m.position.z, d = Math.hypot(dx, dz);
        const walking = d > 0.12;
        if (walking) {
          const step = Math.min(d, dt * WALK_SPEED);
          m.position.x += dx / d * step;
          m.position.z += dz / d * step;
          m.rotation.y = Math.atan2(dx, dz);
        }
        e.stand.position.set(m.position.x, 0, m.position.z);
        e.stand.rotation.y = m.rotation.y;
        if (full) animateCharacter(m, phase + e.offset, walking);
      }
    },
  };
}
