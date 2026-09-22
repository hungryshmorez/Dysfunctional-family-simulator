import * as THREE from 'three';
import type { CharacterRig } from './CharacterRig';
import { makeAppearance, type Appearance } from './appearance';
import { buildHead } from './parts';

/**
 * A humanoid assembled from interchangeable parts described by an Appearance,
 * with a hip/limb bob driven by locomotion speed. Rebuildable in place so the
 * character creator can swap parts live. No downloaded assets.
 */
export class ProceduralRig implements CharacterRig {
  readonly object = new THREE.Group();
  height = 1.15;

  private appearance: Appearance;
  private readonly body = new THREE.Group();
  private torsoMat!: THREE.MeshStandardMaterial;
  private baseColor = new THREE.Color();
  private leftArm!: THREE.Object3D;
  private rightArm!: THREE.Object3D;
  private leftLeg!: THREE.Object3D;
  private rightLeg!: THREE.Object3D;
  private phase = Math.random() * Math.PI * 2;

  constructor(appearance: Partial<Appearance> = {}) {
    this.appearance = makeAppearance(appearance);
    this.object.add(this.body);
    this.build();
  }

  /** Swap to a new look, reusing the same scene object. */
  setAppearance(appearance: Appearance): void {
    this.appearance = appearance;
    this.clearBody();
    this.build();
  }

  getAppearance(): Appearance {
    return { ...this.appearance };
  }

  private build(): void {
    const app = this.appearance;
    const child = app.bodyType === 'child';

    this.baseColor = new THREE.Color(app.topColor);
    this.torsoMat = new THREE.MeshStandardMaterial({
      color: this.baseColor.clone(),
      roughness: 0.6,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: app.skin,
      roughness: 0.7,
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: app.bottomColor,
      roughness: 0.7,
    });

    const girth = 0.16 * app.build * (child ? 0.85 : 1);
    const torsoLen = child ? 0.24 : 0.34;
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(girth, torsoLen, 4, 10),
      this.torsoMat
    );
    const torsoY = child ? 0.46 : 0.62;
    torso.position.y = torsoY;
    torso.castShadow = true;
    this.body.add(torso);

    const head = buildHead(app, skinMat);
    const headY = child ? 0.78 : 1.0;
    head.group.position.y = headY;
    this.body.add(head.group);

    const armLen = child ? 0.26 : 0.34;
    const armY = child ? 0.6 : 0.78;
    this.leftArm = makeLimb(0.05, armLen, this.torsoMat);
    this.leftArm.position.set(-(girth + 0.05), armY, 0);
    this.rightArm = makeLimb(0.05, armLen, this.torsoMat);
    this.rightArm.position.set(girth + 0.05, armY, 0);
    this.body.add(this.leftArm, this.rightArm);

    const legLen = child ? 0.3 : 0.4;
    const legY = child ? 0.32 : 0.42;
    this.leftLeg = makeLimb(0.07, legLen, legMat);
    this.leftLeg.position.set(-0.09, legY, 0);
    this.rightLeg = makeLimb(0.07, legLen, legMat);
    this.rightLeg.position.set(0.09, legY, 0);
    this.body.add(this.leftLeg, this.rightLeg);

    this.body.scale.setScalar(app.height);
    this.height = (child ? 0.95 : 1.15) * app.height;
  }

  private clearBody(): void {
    for (const child of [...this.body.children]) {
      this.body.remove(child);
      disposeObject(child);
    }
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
  }

  update(dt: number, speed: number): void {
    this.phase += dt * (4 + speed * 6);
    const swing = Math.sin(this.phase) * 0.5 * speed;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.8;
    this.rightArm.rotation.x = swing * 0.8;
    this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.04 * speed;
  }

  setMood(valence: number): void {
    const t = (valence + 1) / 2;
    const hsl = { h: 0, s: 0, l: 0 };
    this.baseColor.getHSL(hsl);
    this.torsoMat.color.setHSL(hsl.h, hsl.s * (0.35 + 0.65 * t), hsl.l);
    this.body.rotation.x = (1 - t) * 0.18;
  }

  dispose(): void {
    disposeObject(this.object);
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

function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
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
