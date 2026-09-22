import { makeAppearance, type Appearance } from './appearance';

/**
 * The built-in cast: 5 dads, 5 moms, and 10 kids. Each kid maps to the adult
 * they grow into via `growsInto`, so a child's look carries forward.
 */

export interface RosterEntry {
  id: string;
  name: string;
  kind: 'dad' | 'mom' | 'kid';
  appearance: Appearance;
  /** For kids: id of the adult in this roster they grow into. */
  growsInto?: string;
}

export const DADS: RosterEntry[] = [
  {
    id: 'dad-gary',
    name: 'Gary',
    kind: 'dad',
    appearance: makeAppearance({
      skin: 0xdca87e,
      hairStyle: 'short',
      hairColor: 0x3b2a1d,
      topColor: 0x5b7bd8,
      bottomColor: 0x35323f,
      face: 'beard',
      build: 1.15,
    }),
  },
  {
    id: 'dad-marcus',
    name: 'Marcus',
    kind: 'dad',
    appearance: makeAppearance({
      skin: 0x8a5a38,
      hairStyle: 'buzz',
      hairColor: 0x1c1a1f,
      topColor: 0x3fb8a5,
      bottomColor: 0x2c2a33,
      face: 'plain',
      build: 1.2,
    }),
  },
  {
    id: 'dad-ken',
    name: 'Ken',
    kind: 'dad',
    appearance: makeAppearance({
      skin: 0xf1d3b8,
      hairStyle: 'bald',
      hairColor: 0x9a9aa0,
      topColor: 0xd8b45b,
      bottomColor: 0x4a463f,
      face: 'glasses',
      build: 1.05,
    }),
  },
  {
    id: 'dad-theo',
    name: 'Theo',
    kind: 'dad',
    appearance: makeAppearance({
      skin: 0xc48a5a,
      hairStyle: 'messy',
      hairColor: 0x1c1a1f,
      topColor: 0xd8515b,
      bottomColor: 0x35323f,
      face: 'plain',
      build: 1.0,
    }),
  },
  {
    id: 'dad-sol',
    name: 'Sol',
    kind: 'dad',
    appearance: makeAppearance({
      skin: 0x5c3b24,
      hairStyle: 'short',
      hairColor: 0x1c1a1f,
      topColor: 0x8a5bd8,
      bottomColor: 0x2c2a33,
      face: 'beard',
      build: 1.1,
    }),
  },
];

export const MOMS: RosterEntry[] = [
  {
    id: 'mom-denise',
    name: 'Denise',
    kind: 'mom',
    appearance: makeAppearance({
      skin: 0xdca87e,
      hairStyle: 'bob',
      hairColor: 0xa5502a,
      topColor: 0xd85b9b,
      bottomColor: 0x35323f,
      face: 'plain',
      build: 0.95,
    }),
  },
  {
    id: 'mom-fern',
    name: 'Fern',
    kind: 'mom',
    appearance: makeAppearance({
      skin: 0xf1d3b8,
      hairStyle: 'ponytail',
      hairColor: 0xc9a24b,
      topColor: 0x3fb8a5,
      bottomColor: 0x2c2a33,
      face: 'freckles',
      build: 0.9,
    }),
  },
  {
    id: 'mom-aisha',
    name: 'Aisha',
    kind: 'mom',
    appearance: makeAppearance({
      skin: 0x8a5a38,
      hairStyle: 'bun',
      hairColor: 0x1c1a1f,
      topColor: 0x8a5bd8,
      bottomColor: 0x4a463f,
      face: 'plain',
      build: 0.95,
    }),
  },
  {
    id: 'mom-rosa',
    name: 'Rosa',
    kind: 'mom',
    appearance: makeAppearance({
      skin: 0xc48a5a,
      hairStyle: 'bob',
      hairColor: 0x1c1a1f,
      topColor: 0xd8515b,
      bottomColor: 0x35323f,
      face: 'glasses',
      build: 1.0,
    }),
  },
  {
    id: 'mom-vic',
    name: 'Vic',
    kind: 'mom',
    appearance: makeAppearance({
      skin: 0x5c3b24,
      hairStyle: 'afro',
      hairColor: 0x1c1a1f,
      topColor: 0xd8b45b,
      bottomColor: 0x2c2a33,
      face: 'plain',
      build: 1.0,
    }),
  },
];

/** Kids grow into a specific adult — the look is inherited and aged up. */
export const KIDS: RosterEntry[] = [
  kid('kid-skye', 'Skye', 'mom-denise', { hairStyle: 'ponytail', hairColor: 0xa5502a, topColor: 0x8a5bd8, skin: 0xdca87e }),
  kid('kid-milo', 'Milo', 'dad-gary', { hairStyle: 'messy', hairColor: 0x3b2a1d, topColor: 0xd8b45b, skin: 0xdca87e, face: 'freckles' }),
  kid('kid-ivy', 'Ivy', 'mom-fern', { hairStyle: 'bob', hairColor: 0xc9a24b, topColor: 0x3fb8a5, skin: 0xf1d3b8, face: 'freckles' }),
  kid('kid-omar', 'Omar', 'dad-marcus', { hairStyle: 'buzz', hairColor: 0x1c1a1f, topColor: 0x3fb8a5, skin: 0x8a5a38 }),
  kid('kid-nina', 'Nina', 'mom-aisha', { hairStyle: 'bun', hairColor: 0x1c1a1f, topColor: 0x8a5bd8, skin: 0x8a5a38 }),
  kid('kid-leo', 'Leo', 'dad-theo', { hairStyle: 'short', hairColor: 0x1c1a1f, topColor: 0xd8515b, skin: 0xc48a5a }),
  kid('kid-pia', 'Pia', 'mom-rosa', { hairStyle: 'bob', hairColor: 0x1c1a1f, topColor: 0xd8515b, skin: 0xc48a5a, face: 'glasses' }),
  kid('kid-zane', 'Zane', 'dad-sol', { hairStyle: 'short', hairColor: 0x1c1a1f, topColor: 0x8a5bd8, skin: 0x5c3b24 }),
  kid('kid-mae', 'Mae', 'mom-vic', { hairStyle: 'afro', hairColor: 0x1c1a1f, topColor: 0xd8b45b, skin: 0x5c3b24 }),
  kid('kid-finn', 'Finn', 'dad-ken', { hairStyle: 'messy', hairColor: 0xc9a24b, topColor: 0xd8b45b, skin: 0xf1d3b8, face: 'glasses' }),
];

export const ROSTER: RosterEntry[] = [...DADS, ...MOMS, ...KIDS];

export function rosterById(id: string): RosterEntry | undefined {
  return ROSTER.find((e) => e.id === id);
}

/** Age a kid's look up to the adult they become (keeps hair/skin/clothes). */
export function agedUp(kid: RosterEntry): Appearance {
  const adult = kid.growsInto ? rosterById(kid.growsInto) : undefined;
  return makeAppearance({
    ...kid.appearance,
    bodyType: 'adult',
    height: adult?.appearance.height ?? 1,
    build: adult?.appearance.build ?? 1,
    face: adult?.appearance.face ?? kid.appearance.face,
  });
}

function kid(
  id: string,
  name: string,
  growsInto: string,
  look: Partial<Appearance>
): RosterEntry {
  return {
    id,
    name,
    kind: 'kid',
    growsInto,
    appearance: makeAppearance({ bodyType: 'child', height: 0.72, build: 0.9, ...look }),
  };
}
