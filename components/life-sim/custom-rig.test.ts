import { describe, expect, it } from 'vitest';
import { normalizeTransform, TARGET_HEIGHT, validateRigFile } from './custom-rig';

describe('custom-rig validation', () => {
  it('accepts .glb and .gltf files within the size cap', () => {
    expect(validateRigFile({ name: 'hero.glb', size: 1000 })).toBeNull();
    expect(validateRigFile({ name: 'HERO.GLTF', size: 1000 })).toBeNull();
  });

  it('rejects the wrong extension, empty, and oversized files', () => {
    expect(validateRigFile({ name: 'hero.png', size: 1000 })).toMatch(/\.glb or \.gltf/);
    expect(validateRigFile({ name: 'hero.glb', size: 0 })).toMatch(/empty/);
    expect(validateRigFile({ name: 'hero.glb', size: 50 * 1024 * 1024 })).toMatch(/too large/);
  });
});

describe('custom-rig normalizeTransform', () => {
  it('scales a model to the target standing height', () => {
    const { scale } = normalizeTransform({ x: 1, y: 3.44, z: 1 }, { x: 0, y: 1.72, z: 0 });
    expect(scale).toBeCloseTo(TARGET_HEIGHT / 3.44, 6);
  });

  it('drops the feet to y=0 and centres x/z', () => {
    // A 2m-tall model centred at (2, 0, -3): its feet sit at y = −1.
    const { scale, offset } = normalizeTransform({ x: 1, y: 2, z: 1 }, { x: 2, y: 0, z: -3 });
    expect(scale).toBeCloseTo(TARGET_HEIGHT / 2, 6);
    // feet (−1) lifted to 0 → +1 * scale; centre pulled back to origin.
    expect(offset[1]).toBeCloseTo(1 * scale, 6);
    expect(offset[0]).toBeCloseTo(-2 * scale, 6);
    expect(offset[2]).toBeCloseTo(3 * scale, 6);
  });

  it('is safe for a degenerate zero-height model', () => {
    const { scale } = normalizeTransform({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    expect(scale).toBe(1);
  });
});
