import * as THREE from 'three';
import type { Appearance, FaceStyle, HairStyle } from './appearance';

/**
 * Part builders. Each returns primitive geometry so hair/face/etc. can be
 * swapped independently. The head group is built in local space with the head
 * centered at the origin; the rig positions it on the body.
 */

export interface HeadBuild {
  group: THREE.Group;
  /** Head radius, so the rig can seat hats/bubbles. */
  radius: number;
}

export function buildHead(app: Appearance, skinMat: THREE.Material): HeadBuild {
  const group = new THREE.Group();
  const radius = app.bodyType === 'child' ? 0.165 : 0.15;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 16),
    skinMat
  );
  head.castShadow = true;
  group.add(head);

  const hair = buildHair(app.hairStyle, app.hairColor, radius);
  if (hair) group.add(hair);

  group.add(buildFace(app.face, radius, app.hairColor));

  return { group, radius };
}

export function buildHair(
  style: HairStyle,
  color: number,
  r: number
): THREE.Object3D | null {
  if (style === 'bald') return null;

  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const group = new THREE.Group();

  // A top cap common to most styles (upper hemisphere shell).
  const cap = (scale: number, lift: number): THREE.Mesh => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r * scale, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mat
    );
    m.position.y = lift;
    m.castShadow = true;
    return m;
  };

  switch (style) {
    case 'buzz':
      group.add(cap(1.02, 0));
      break;
    case 'short':
      group.add(cap(1.08, 0.01));
      break;
    case 'messy': {
      group.add(cap(1.08, 0.02));
      for (let i = 0; i < 5; i++) {
        const tuft = new THREE.Mesh(
          new THREE.SphereGeometry(r * 0.28, 8, 6),
          mat
        );
        const a = (i / 5) * Math.PI * 2;
        tuft.position.set(Math.cos(a) * r * 0.6, r * 0.7, Math.sin(a) * r * 0.6);
        group.add(tuft);
      }
      break;
    }
    case 'bob': {
      group.add(cap(1.12, 0));
      const sides = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 1.12, r * 1.05, r * 1.3, 16, 1, true),
        mat
      );
      sides.position.y = -r * 0.35;
      group.add(sides);
      break;
    }
    case 'ponytail': {
      group.add(cap(1.08, 0.01));
      const tail = new THREE.Mesh(
        new THREE.CapsuleGeometry(r * 0.28, r * 1.1, 4, 8),
        mat
      );
      tail.position.set(0, -r * 0.2, -r * 1.0);
      tail.rotation.x = 0.5;
      group.add(tail);
      break;
    }
    case 'bun': {
      group.add(cap(1.08, 0.01));
      const bun = new THREE.Mesh(new THREE.SphereGeometry(r * 0.45, 12, 10), mat);
      bun.position.set(0, r * 0.95, -r * 0.5);
      group.add(bun);
      break;
    }
    case 'afro': {
      const afro = new THREE.Mesh(new THREE.SphereGeometry(r * 1.5, 18, 14), mat);
      afro.position.y = r * 0.35;
      afro.castShadow = true;
      group.add(afro);
      break;
    }
  }
  return group;
}

export function buildFace(
  style: FaceStyle,
  r: number,
  hairColor: number
): THREE.Object3D {
  const group = new THREE.Group();
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a2530, roughness: 0.4 });
  const eyeGeo = new THREE.SphereGeometry(r * 0.14, 8, 8);
  const z = r * 0.92;
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * r * 0.38, r * 0.12, z);
    group.add(eye);
  }

  switch (style) {
    case 'glasses': {
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1f,
        roughness: 0.5,
      });
      for (const sx of [-1, 1]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r * 0.22, r * 0.04, 8, 16),
          frameMat
        );
        ring.position.set(sx * r * 0.38, r * 0.12, z);
        group.add(ring);
      }
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(r * 0.3, r * 0.04, r * 0.04),
        frameMat
      );
      bridge.position.set(0, r * 0.12, z);
      group.add(bridge);
      break;
    }
    case 'beard': {
      const beard = new THREE.Mesh(
        new THREE.SphereGeometry(r * 0.85, 14, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45),
        new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 })
      );
      beard.position.set(0, -r * 0.1, r * 0.1);
      group.add(beard);
      break;
    }
    case 'freckles': {
      const fMat = new THREE.MeshStandardMaterial({ color: 0xb07850 });
      const fGeo = new THREE.SphereGeometry(r * 0.04, 6, 6);
      for (let i = 0; i < 6; i++) {
        const f = new THREE.Mesh(fGeo, fMat);
        const sx = i < 3 ? -1 : 1;
        f.position.set(sx * (r * 0.4 + Math.random() * r * 0.15), -r * 0.05 + Math.random() * r * 0.15, z);
        group.add(f);
      }
      break;
    }
    case 'plain':
      break;
  }
  return group;
}
