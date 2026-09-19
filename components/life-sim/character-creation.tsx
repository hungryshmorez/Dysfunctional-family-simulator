'use client';
import { useState } from 'react';
import { DEFAULT_APPEARANCE, type Accessory, type Appearance, type HairStyle } from './appearance';
import { MAX_TRAITS, TRAITS } from './traits';

const SKIN = ['#f2d3b3', '#d6a27d', '#a9714b', '#7a4b31', '#ffe0c0', '#4a2f20'];
const HAIR = ['#1a1a1a', '#352b2b', '#6b4a2f', '#b5892f', '#8a8a8a', '#c04a2a'];
const TOP = ['#d8a14c', '#ff2e88', '#2ce6dd', '#6b7cff', '#4caf7a', '#b0473f'];
const HAIR_STYLES: readonly HairStyle[] = ['bald', 'short', 'long'];
const ACCESSORIES: readonly Accessory[] = ['none', 'glasses', 'cap'];

export interface CreationResult { name: string; gender: 'boy' | 'girl' | null; appearance: Appearance; traits: string[] }

/**
 * The start of a life: name yourself, design your character, and choose the
 * traits that colour the family you're born into before the first story beat.
 */
export function CharacterCreation({ initialName, onBegin }: {
  initialName: string; onBegin: (result: CreationResult) => void;
}): JSX.Element {
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<'boy' | 'girl' | null>(null);
  const [look, setLook] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [traits, setTraits] = useState<string[]>([]);
  const set = (patch: Partial<Appearance>): void => setLook((l) => ({ ...l, ...patch }));
  const toggleTrait = (id: string): void => setTraits((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < MAX_TRAITS ? [...t, id] : t));
  const swatches = ([['skin', 'Skin', SKIN], ['hair', 'Hair', HAIR], ['shirt', 'Top', TOP]] as const);

  return (
    <div className="life-modal-backdrop life-on-top">
      <section className="life-settings creation-panel" role="dialog" aria-modal="true" aria-label="Create your character">
        <p className="life-eyebrow">THE MOROSE HOUSE · BEFORE YOUR STORY</p>
        <h2>Who are you?</h2>
        <p className="creation-intro">You are the middle child, between Casey and Riley, in a family that passes its problems down. Shape who you start as — the rest is the story you live.</p>

        <label className="creation-name">Your name
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Name your character" />
        </label>

        <div className="creation-group">
          <span className="creation-legend">You are…</span>
          <div className="creation-chips">
            {([['boy', 'Boy'], ['girl', 'Girl'], [null, 'Prefer not to say']] as const).map(([g, label]) => (
              <button key={label} className={gender === g ? 'active' : ''} onClick={() => setGender(g)}>{label}</button>
            ))}
          </div>
          <small>Family expectations shift with this — never your abilities.</small>
        </div>

        <div className="creation-group">
          <span className="creation-legend">Design your character</span>
          {swatches.map(([key, label, opts]) => (
            <div className="creation-swatches" key={key}>
              <small>{label}</small>
              <div className="creation-row">{opts.map((c) => (
                <button key={c} className={look[key] === c ? 'sw active' : 'sw'} style={{ background: c }} aria-label={`${label} ${c}`} onClick={() => set({ [key]: c } as Partial<Appearance>)} />
              ))}</div>
            </div>
          ))}
          <div className="creation-swatches"><small>Hair</small><div className="creation-chips">{HAIR_STYLES.map((h) => <button key={h} className={look.hairStyle === h ? 'active' : ''} onClick={() => set({ hairStyle: h })}>{h}</button>)}</div></div>
          <div className="creation-swatches"><small>Extras</small><div className="creation-chips">{ACCESSORIES.map((a) => <button key={a} className={look.accessory === a ? 'active' : ''} onClick={() => set({ accessory: a })}>{a}</button>)}</div></div>
        </div>

        <div className="creation-group">
          <span className="creation-legend">Life traits <em>· pick up to {MAX_TRAITS}</em></span>
          <div className="creation-traits">
            {TRAITS.map((t) => (
              <button key={t.id} className={traits.includes(t.id) ? 'trait active' : 'trait'} disabled={!traits.includes(t.id) && traits.length >= MAX_TRAITS} onClick={() => toggleTrait(t.id)}>
                <strong>{t.name}</strong>
                <span>{t.blurb}</span>
                <em>{t.world}</em>
              </button>
            ))}
          </div>
        </div>

        <button className="life-primary creation-begin" disabled={!name.trim()} onClick={() => onBegin({ name: name.trim(), gender, appearance: look, traits })}>Begin your story →</button>
        <small className="creation-foot">You can restyle your look any time from “Your look” in the scene.</small>
      </section>
    </div>
  );
}
