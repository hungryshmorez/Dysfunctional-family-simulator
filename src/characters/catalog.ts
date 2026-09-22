import type { FaceStyle, HairStyle } from './appearance';

/**
 * The asset library the character creator draws from. Every option here is
 * interchangeable across any character, adult or child.
 */

export interface Swatch {
  name: string;
  value: number;
}

export const HAIR_STYLES: HairStyle[] = [
  'short',
  'buzz',
  'messy',
  'bob',
  'ponytail',
  'bun',
  'afro',
  'bald',
];

export const FACE_STYLES: FaceStyle[] = ['plain', 'freckles', 'glasses', 'beard'];

export const SKIN_TONES: Swatch[] = [
  { name: 'Porcelain', value: 0xf1d3b8 },
  { name: 'Fair', value: 0xdca87e },
  { name: 'Tan', value: 0xc48a5a },
  { name: 'Brown', value: 0x8a5a38 },
  { name: 'Deep', value: 0x5c3b24 },
];

export const HAIR_COLORS: Swatch[] = [
  { name: 'Black', value: 0x1c1a1f },
  { name: 'Brown', value: 0x3b2a1d },
  { name: 'Blonde', value: 0xc9a24b },
  { name: 'Ginger', value: 0xa5502a },
  { name: 'Grey', value: 0x9a9aa0 },
  { name: 'Blue', value: 0x3f6ad8 },
  { name: 'Pink', value: 0xd85b9b },
];

export const CLOTHING_COLORS: Swatch[] = [
  { name: 'Slate', value: 0x35323f },
  { name: 'Blue', value: 0x5b7bd8 },
  { name: 'Rose', value: 0xd85b9b },
  { name: 'Violet', value: 0x8a5bd8 },
  { name: 'Amber', value: 0xd8b45b },
  { name: 'Teal', value: 0x3fb8a5 },
  { name: 'Crimson', value: 0xd8515b },
  { name: 'Forest', value: 0x4a8a52 },
];

export const BUILDS: Swatch[] = [
  { name: 'Slight', value: 0.85 },
  { name: 'Average', value: 1.0 },
  { name: 'Broad', value: 1.2 },
];
