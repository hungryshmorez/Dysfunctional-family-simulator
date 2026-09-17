'use client';
export type HairStyle = 'bald' | 'short' | 'long';
export type Accessory = 'none' | 'glasses' | 'cap';
export interface Appearance {
  skin: string; hair: string; shirt: string; bottoms: string; shoes: string;
  hairStyle: HairStyle; accessory: Accessory; build: number;
}
export const DEFAULT_APPEARANCE: Appearance = {
  skin: '#d6a27d', hair: '#352b2b', shirt: '#d8a14c', bottoms: '#354252', shoes: '#f0e9df',
  hairStyle: 'short', accessory: 'none', build: 1,
};

const HAIR_STYLES: readonly HairStyle[] = ['bald', 'short', 'long'];
const ACCESSORIES: readonly Accessory[] = ['none', 'glasses', 'cap'];

/** Tolerant parse: unknown/invalid fields fall back to the default, so old
 *  three-colour saves migrate cleanly. Only a non-object is rejected. */
export function parseAppearance(raw: unknown): Appearance | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Partial<Appearance>;
  const D = DEFAULT_APPEARANCE;
  const hex = (v: unknown, d: string): string => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  return {
    skin: hex(a.skin, D.skin), hair: hex(a.hair, D.hair), shirt: hex(a.shirt, D.shirt),
    bottoms: hex(a.bottoms, D.bottoms), shoes: hex(a.shoes, D.shoes),
    hairStyle: HAIR_STYLES.includes(a.hairStyle as HairStyle) ? (a.hairStyle as HairStyle) : D.hairStyle,
    accessory: ACCESSORIES.includes(a.accessory as Accessory) ? (a.accessory as Accessory) : D.accessory,
    build: typeof a.build === 'number' && Number.isFinite(a.build) ? Math.max(0.8, Math.min(1.3, a.build)) : D.build,
  };
}

/** Structural fields that require rebuilding the mesh (colours update live). */
export function structuralKey(a: Appearance): string {
  return `${a.hairStyle}|${a.accessory}|${a.build.toFixed(2)}`;
}

export function AppearancePanel({ value, onChange, onClose, onUploadRig, onClearRig, hasRig }: { value: Appearance; onChange: (next: Appearance) => void; onClose: () => void; onUploadRig?: (file: File) => void; onClearRig?: () => void; hasRig?: boolean }): JSX.Element {
  const colors = [['skin', 'Skin tone'], ['hair', 'Hair color'], ['shirt', 'Top color'], ['bottoms', 'Bottoms color'], ['shoes', 'Shoes color']] as const;
  return (
    <section className="appearance-panel" aria-label="Character appearance">
      <div><strong>Your look</strong><button aria-label="Close appearance" onClick={onClose}>×</button></div>
      <p>Make this character yours.</p>
      {colors.map(([key, label]) => (
        <label key={key}>{label}<input aria-label={label} type="color" value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} /></label>
      ))}
      <label>Hair style
        <select aria-label="Hair style" value={value.hairStyle} onChange={(e) => onChange({ ...value, hairStyle: e.target.value as HairStyle })}>
          <option value="bald">Shaved</option><option value="short">Short</option><option value="long">Long</option>
        </select>
      </label>
      <label>Accessory
        <select aria-label="Accessory" value={value.accessory} onChange={(e) => onChange({ ...value, accessory: e.target.value as Accessory })}>
          <option value="none">None</option><option value="glasses">Glasses</option><option value="cap">Cap</option>
        </select>
      </label>
      <label>Build
        <input aria-label="Build" type="range" min={0.8} max={1.3} step={0.05} value={value.build} onChange={(e) => onChange({ ...value, build: Number(e.target.value) })} />
      </label>
      {onUploadRig && (
        <div className="appearance-rig">
          <strong>Your own model</strong>
          <p>{hasRig ? 'A custom model is in use for your character.' : 'The built-in character is procedural. Upload a rigged .glb to use your own instead.'}</p>
          <label className="appearance-upload">Upload .glb / .gltf<input aria-label="Upload a character model" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUploadRig(file); e.target.value = ''; }} /></label>
          {hasRig && onClearRig && <button type="button" onClick={onClearRig}>Use the built-in character</button>}
        </div>
      )}
      <small>Saved in this browser separately from household backups.</small>
    </section>
  );
}
