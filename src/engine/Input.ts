import * as THREE from 'three';
import type { Character } from '../characters/Character';

/** Click-to-select picking over the family meshes. */
export class Picker {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.Camera,
    private readonly family: Character[],
    private readonly onSelect: (c: Character | null) => void
  ) {
    this.canvas.addEventListener('pointerdown', this.handle);
  }

  private handle = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const objects = this.family.map((c) => c.object);
    const hits = this.raycaster.intersectObjects(objects, true);
    if (hits.length === 0) {
      this.onSelect(null);
      return;
    }
    // Walk up to the family root that owns the hit mesh.
    const hit = hits[0].object;
    const found = this.family.find((c) => isDescendant(hit, c.object));
    this.onSelect(found ?? null);
  };

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handle);
  }
}

function isDescendant(node: THREE.Object3D, root: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (current === root) return true;
    current = current.parent;
  }
  return false;
}
