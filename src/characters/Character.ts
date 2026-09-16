import * as THREE from 'three';
import type { CharacterRig } from './CharacterRig';
import { Mood } from '../sim/Mood';
import { ROOMS, randomPointInRoom, type RoomDef } from '../world/rooms';

export interface CharacterConfig {
  id: string;
  name: string;
  role: string;
  rig: CharacterRig;
  spawn: THREE.Vector3;
  mood?: number;
  /** Base wander speed in units/sec. */
  speed?: number;
}

/**
 * A family member: owns a rig, a mood, a wander target, and a current room.
 * Movement and mood are rig-agnostic — procedural and GLB members behave
 * identically here.
 */
export class Character {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly rig: CharacterRig;
  readonly mood: Mood;
  readonly position = new THREE.Vector3();

  private target = new THREE.Vector3();
  private readonly baseSpeed: number;
  private currentSpeed = 0;
  private pauseTimer = 0;
  private _room: RoomDef;

  constructor(cfg: CharacterConfig) {
    this.id = cfg.id;
    this.name = cfg.name;
    this.role = cfg.role;
    this.rig = cfg.rig;
    this.mood = new Mood(cfg.mood ?? 0);
    this.baseSpeed = cfg.speed ?? 0.9;
    this.position.copy(cfg.spawn);
    this.rig.object.position.copy(cfg.spawn);
    this._room = nearestRoom(cfg.spawn);
    this.target.copy(cfg.spawn);
  }

  get object(): THREE.Object3D {
    return this.rig.object;
  }

  get room(): RoomDef {
    return this._room;
  }

  /** Send this character to wander toward a specific room. */
  goTo(room: RoomDef): void {
    this._room = room;
    this.target.copy(randomPointInRoom(room));
    this.pauseTimer = 0;
  }

  update(dt: number): void {
    this.mood.decay(dt);

    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.currentSpeed = 0;
    } else {
      const toTarget = this.target.clone().sub(this.position);
      toTarget.y = 0;
      const dist = toTarget.length();
      if (dist < 0.15) {
        // Arrived: idle a beat, then pick a new destination.
        this.pauseTimer = 1 + Math.random() * 3;
        this.pickNewTarget();
        this.currentSpeed = 0;
      } else {
        const step = Math.min(dist, this.baseSpeed * dt);
        toTarget.normalize();
        this.position.addScaledVector(toTarget, step);
        this.currentSpeed = 1;
        const angle = Math.atan2(toTarget.x, toTarget.z);
        this.rig.object.rotation.y = angle;
      }
    }

    this.rig.object.position.copy(this.position);
    this.rig.update(dt, this.currentSpeed);
    this.rig.setMood(this.mood.valence);
  }

  private pickNewTarget(): void {
    // Unhappy members are more likely to storm off to another room.
    const wander = Math.random() < 0.4 - this.mood.valence * 0.2;
    if (wander) {
      const other = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      this._room = other;
    }
    this.target.copy(randomPointInRoom(this._room));
  }
}

function nearestRoom(p: THREE.Vector3): RoomDef {
  let best = ROOMS[0];
  let bestDist = Infinity;
  for (const room of ROOMS) {
    const dx = p.x - room.center.x;
    const dz = p.z - room.center.y;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      best = room;
    }
  }
  return best;
}
