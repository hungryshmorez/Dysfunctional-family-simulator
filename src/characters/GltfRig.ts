import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CharacterRig } from './CharacterRig';
import { ProceduralRig } from './ProceduralRig';

export interface GltfRigOptions {
  /** URL of a rigged GLB (e.g. a Tripo/VAST-generated + auto-rigged mesh). */
  url: string;
  scale?: number;
  /** Clip names to look for, in priority order. */
  idleClip?: string;
  walkClip?: string;
  /** Placeholder shown while the GLB loads or if it fails. */
  placeholderColor?: number;
}

/**
 * The "special movement" half of the hybrid. Loads a rigged GLB and blends an
 * idle/walk clip via AnimationMixer. Until the asset resolves — and if it ever
 * fails — it falls back to a ProceduralRig so the family is never missing a
 * member. Drop a real GLB URL on a character in family.ts to activate it.
 */
export class GltfRig implements CharacterRig {
  readonly object = new THREE.Group();
  height = 1.6;

  private mixer: THREE.AnimationMixer | null = null;
  private idle: THREE.AnimationAction | null = null;
  private walk: THREE.AnimationAction | null = null;
  private fallback: ProceduralRig | null = null;
  private disposed = false;
  private walkWeight = 0;

  constructor(opts: GltfRigOptions) {
    // Start with the procedural fallback visible immediately.
    this.fallback = new ProceduralRig({
      scale: opts.scale ?? 1,
      color: opts.placeholderColor ?? 0x8a7bd8,
    });
    this.height = this.fallback.height;
    this.object.add(this.fallback.object);

    new GLTFLoader().load(
      opts.url,
      (gltf) => this.onLoaded(gltf, opts),
      undefined,
      (err) => {
        console.warn(`GltfRig: failed to load ${opts.url}, keeping fallback`, err);
      }
    );
  }

  private onLoaded(
    gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] },
    opts: GltfRigOptions
  ): void {
    if (this.disposed) return;

    // Swap the placeholder for the real mesh.
    if (this.fallback) {
      this.object.remove(this.fallback.object);
      this.fallback.dispose();
      this.fallback = null;
    }

    const model = gltf.scene;
    model.scale.setScalar(opts.scale ?? 1);
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.object.add(model);

    const box = new THREE.Box3().setFromObject(model);
    this.height = Math.max(0.5, box.max.y - box.min.y);

    if (gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(model);
      const idleClip =
        findClip(gltf.animations, opts.idleClip) ?? gltf.animations[0];
      const walkClip = findClip(gltf.animations, opts.walkClip);
      this.idle = this.mixer.clipAction(idleClip);
      this.idle.play();
      if (walkClip) {
        this.walk = this.mixer.clipAction(walkClip);
        this.walk.play();
        this.walk.setEffectiveWeight(0);
      }
    }
  }

  update(dt: number, speed: number): void {
    this.fallback?.update(dt, speed);
    if (!this.mixer) return;
    this.mixer.update(dt);
    if (this.walk && this.idle) {
      // Ease the walk/idle blend toward the current locomotion speed.
      this.walkWeight += (speed - this.walkWeight) * Math.min(1, dt * 8);
      this.walk.setEffectiveWeight(this.walkWeight);
      this.idle.setEffectiveWeight(1 - this.walkWeight);
    }
  }

  setMood(valence: number): void {
    this.fallback?.setMood(valence);
  }

  dispose(): void {
    this.disposed = true;
    this.mixer?.stopAllAction();
    this.fallback?.dispose();
    this.object.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  }
}

function findClip(
  clips: THREE.AnimationClip[],
  name: string | undefined
): THREE.AnimationClip | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    clips.find((c) => c.name.toLowerCase().includes(lower)) ?? null
  );
}
