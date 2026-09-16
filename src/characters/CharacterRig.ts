import type * as THREE from 'three';

/**
 * The seam that makes the hybrid character decision concrete.
 *
 * Every family member is driven through this interface. Most render as cheap
 * procedural primitives (ProceduralRig); the few that need real skeletal
 * motion can be backed by a rigged GLB (GltfRig) without the simulation,
 * movement, or drama code knowing the difference.
 *
 *   "render + rig the characters that need special movement,
 *    generate straight-in primitives for most of them."
 */
export interface CharacterRig {
  /** Root object added to the scene and moved/rotated by the Character. */
  readonly object: THREE.Object3D;

  /**
   * Advance any animation.
   * @param dt    seconds since last frame
   * @param speed normalized locomotion speed, 0 (idle) .. 1 (walking)
   */
  update(dt: number, speed: number): void;

  /**
   * Reflect emotional state on the body.
   * @param valence mood from -1 (miserable) .. 1 (content)
   */
  setMood(valence: number): void;

  /** Approximate height so speech bubbles / selection rings sit correctly. */
  readonly height: number;

  dispose(): void;
}
