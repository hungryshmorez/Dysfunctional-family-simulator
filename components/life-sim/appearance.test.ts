import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, parseAppearance, structuralKey } from './appearance';

describe('parseAppearance', () => {
  it('rejects non-objects', () => {
    expect(parseAppearance(null)).toBeNull();
    expect(parseAppearance('nope')).toBeNull();
  });

  it('migrates an old three-colour save by filling new fields with defaults', () => {
    const parsed = parseAppearance({ skin: '#112233', hair: '#445566', shirt: '#778899' });
    expect(parsed).toMatchObject({
      skin: '#112233', hair: '#445566', shirt: '#778899',
      bottoms: DEFAULT_APPEARANCE.bottoms, shoes: DEFAULT_APPEARANCE.shoes,
      hairStyle: DEFAULT_APPEARANCE.hairStyle, accessory: DEFAULT_APPEARANCE.accessory, build: DEFAULT_APPEARANCE.build,
    });
  });

  it('falls back per-field on invalid colours, enums, and build', () => {
    const parsed = parseAppearance({ skin: 'red', hairStyle: 'mohawk', accessory: 'jetpack', build: 9 })!;
    expect(parsed.skin).toBe(DEFAULT_APPEARANCE.skin);
    expect(parsed.hairStyle).toBe(DEFAULT_APPEARANCE.hairStyle);
    expect(parsed.accessory).toBe(DEFAULT_APPEARANCE.accessory);
    expect(parsed.build).toBe(1.3); // clamped to the max
  });

  it('keeps a valid full appearance intact', () => {
    const full = { skin: '#010203', hair: '#040506', shirt: '#070809', bottoms: '#0a0b0c', shoes: '#0d0e0f', hairStyle: 'long', accessory: 'glasses', build: 1.1 };
    expect(parseAppearance(full)).toEqual(full);
  });

  it('accepts the extended hair styles and beard accessory', () => {
    for (const hairStyle of ['buzz', 'curly', 'ponytail', 'bun'] as const) {
      expect(parseAppearance({ ...DEFAULT_APPEARANCE, hairStyle })!.hairStyle).toBe(hairStyle);
    }
    expect(parseAppearance({ ...DEFAULT_APPEARANCE, accessory: 'beard' })!.accessory).toBe('beard');
  });
});

describe('structuralKey', () => {
  it('changes with structure but not with colour-only edits', () => {
    const a = { ...DEFAULT_APPEARANCE };
    const colorOnly = { ...a, skin: '#000000', shirt: '#ffffff' };
    expect(structuralKey(colorOnly)).toBe(structuralKey(a));
    expect(structuralKey({ ...a, hairStyle: 'long' })).not.toBe(structuralKey(a));
    expect(structuralKey({ ...a, accessory: 'cap' })).not.toBe(structuralKey(a));
    expect(structuralKey({ ...a, build: 1.2 })).not.toBe(structuralKey(a));
  });
});
