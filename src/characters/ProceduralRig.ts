import * as THREE from 'three';
import type { CharacterRig } from './CharacterRig';

export interface ProceduralRigOptions {
  /** Overall scale — children are smaller than adults. */
  scale?: number;
  /** Base clothing color. */
  color?: number;
  /** Skin tone. */
  skin?: number;
}

/**
 * A little humanoid assembled from primitives, with a hip/limb bob driven by
 * locomotion speed. No downloaded assets — everything is generated in code.
 */
export class ProceduralRig implements CharacterRig {
  readonly object = new THREE.Group();
  readonly height: number;

  private readonly torsoMat: THREE.MeshStandardMaterial;
  private readonly leftArm: THREE.Object3D;
  private readonly rightArm: THREE.Object3D;
  private readonly leftLeg: THREE.Object3D;
  private readonly rightLeg: THREE.Object3D;
  private readonly body: THREE.Group;
  private readonly baseColor: THREE.Color;
  private phase = Math.random() * Math.PI * 2;

  constructor(opts: ProceduralRigOptions = {}) {
    const scale = opts.scale ?? 1;
    this.baseColor = new THREE.Color(opts.color ?? 0x8a7bd8);
    this.torsoMat = new THREE.MeshStandardMaterial({
      color: this.baseColor.clone(),
      roughness: 0.6,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: opts.skin ?? 0xdca87e,
      roughness: 0.7,
    });

    this.body = new THREE.Group();

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.34, 4, 8),
      this.torsoMat
    );
    torso.position.y = 0.62;
    torso.castShadow = true;
    this.body.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 12),
      skinMat
    );
    head.position.y = 1.0;
    head.castShadow = true;
    this.body.add(head);

    this.leftArm = makeLimb(0.055, 0.34, this.torsoMat);
    this.leftArm.position.set(-0.21, 0.78, 0);
    this.rightArm = makeLimb(0.055, 0.34, this.torsoMat);
    this.rightArm.position.set(0.21, 0.78, 0);
    this.body.add(this.leftArm, this.rightArm);

    this.leftLeg = makeLimb(0.07, 0.4, skinMat);
    this.leftLeg.position.set(-0.09, 0.42, 0);
    this.rightLeg = makeLimb(0.07, 0.4, skinMat);
    this.rightLeg.position.set(0.09, 0.42, 0);
    this.body.add(this.leftLeg, this.rightLeg);

    this.body.scale.setScalar(scale);
    this.object.add(this.body);
    this.height = 1.15 * scale;
  }

  update(dt: number, speed: number): void {
    this.phase += dt * (4 + speed * 6);
    const swing = Math.sin(this.phase) * 0.5 * speed;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.8;
    this.rightArm.rotation.x = swing * 0.8;
    // Subtle vertical bob while walking.
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.04 * speed;
  }

  setMood(valence: number): void {
    // Miserable -> desaturated + slumped; content -> saturated + upright.
    const t = (valence + 1) / 2; // 0..1
    const hsl = { h: 0, s: 0, l: 0 };
    this.baseColor.getHSL(hsl);
    this.torsoMat.color.setHSL(hsl.h, hsl.s * (0.35 + 0.65 * t), hsl.l);
    this.body.rotation.x = (1 - t) * 0.18; // slump when low
  }

  dispose(): void {
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

function makeLimb(
  radius: number,
  length: number,
  material: THREE.Material
): THREE.Group {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 3, 6),
    material
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}
