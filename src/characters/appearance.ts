/**
 * The interchangeable-asset model. Every character — the built-in roster and
 * anything made in the character creator — is fully described by this spec, so
 * hair, face, body, and clothing all mix and match freely.
 */

export type BodyType = 'adult' | 'child';
export type HairStyle =
  | 'bald'
  | 'buzz'
  | 'short'
  | 'messy'
  | 'bob'
  | 'ponytail'
  | 'bun'
  | 'afro';
export type FaceStyle = 'plain' | 'freckles' | 'glasses' | 'beard';

export interface Appearance {
  bodyType: BodyType;
  /** Overall scale multiplier. */
  height: number;
  /** Torso girth, ~0.85 (slight) .. 1.25 (broad). */
  build: number;
  skin: number;
  hairStyle: HairStyle;
  hairColor: number;
  topColor: number;
  bottomColor: number;
  face: FaceStyle;
}

const DEFAULT: Appearance = {
  bodyType: 'adult',
  height: 1,
  build: 1,
  skin: 0xdca87e,
  hairStyle: 'short',
  hairColor: 0x3b2a1d,
  topColor: 0x5b7bd8,
  bottomColor: 0x35323f,
  face: 'plain',
};

export function makeAppearance(partial: Partial<Appearance> = {}): Appearance {
  return { ...DEFAULT, ...partial };
}

/** Minimal appearance derived from a single clothing color (GLB placeholder). */
export function appearanceFromColor(color: number, scale = 1): Appearance {
  return makeAppearance({ topColor: color, height: scale });
}
