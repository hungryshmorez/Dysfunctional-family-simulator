import type { ProceduralRig } from '../characters/ProceduralRig';
import {
  makeAppearance,
  type Appearance,
  type BodyType,
} from '../characters/appearance';
import {
  BUILDS,
  CLOTHING_COLORS,
  FACE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  type Swatch,
} from '../characters/catalog';

export interface CreatorResult {
  keep: boolean;
  name: string;
  appearance: Appearance;
}

/**
 * Create-a-character overlay. Edits a live preview rig in the scene as you pick
 * parts; every asset is interchangeable regardless of body type.
 */
export class CharacterCreator {
  private readonly panel: HTMLDivElement;
  private appearance: Appearance;
  private name = 'You';

  constructor(
    private readonly root: HTMLElement,
    private readonly preview: ProceduralRig,
    private readonly onDone: (result: CreatorResult) => void,
    seed?: Appearance
  ) {
    this.appearance = seed ? { ...seed } : makeAppearance({});
    this.preview.setAppearance(this.appearance);

    this.panel = document.createElement('div');
    this.panel.className = 'creator';
    this.root.appendChild(this.panel);
    this.render();
  }

  private apply(patch: Partial<Appearance>): void {
    this.appearance = { ...this.appearance, ...patch };
    this.preview.setAppearance(this.appearance);
    this.render();
  }

  private render(): void {
    this.panel.innerHTML = '';
    const a = this.appearance;

    const title = el('h2', 'Create a character');
    this.panel.appendChild(title);

    // Name
    const nameInput = document.createElement('input');
    nameInput.className = 'creator-name';
    nameInput.value = this.name;
    nameInput.placeholder = 'Name';
    nameInput.addEventListener('input', () => {
      this.name = nameInput.value || 'You';
    });
    this.panel.appendChild(nameInput);

    // Body type
    this.panel.appendChild(
      this.buttonRow<BodyType>(
        'Body',
        ['adult', 'child'],
        a.bodyType,
        (v) => v,
        (v) =>
          this.apply({
            bodyType: v,
            height: v === 'child' ? 0.72 : 1,
          })
      )
    );

    // Build
    this.panel.appendChild(
      this.swatchRow('Build', BUILDS, a.build, (s) => this.apply({ build: s.value }), true)
    );

    // Skin
    this.panel.appendChild(
      this.swatchRow('Skin', SKIN_TONES, a.skin, (s) => this.apply({ skin: s.value }))
    );

    // Hair style
    this.panel.appendChild(
      this.buttonRow(
        'Hair',
        HAIR_STYLES,
        a.hairStyle,
        (v) => v,
        (v) => this.apply({ hairStyle: v })
      )
    );

    // Hair color
    this.panel.appendChild(
      this.swatchRow('Hair color', HAIR_COLORS, a.hairColor, (s) =>
        this.apply({ hairColor: s.value })
      )
    );

    // Face
    this.panel.appendChild(
      this.buttonRow(
        'Face',
        FACE_STYLES,
        a.face,
        (v) => v,
        (v) => this.apply({ face: v })
      )
    );

    // Top
    this.panel.appendChild(
      this.swatchRow('Top', CLOTHING_COLORS, a.topColor, (s) =>
        this.apply({ topColor: s.value })
      )
    );

    // Bottom
    this.panel.appendChild(
      this.swatchRow('Bottom', CLOTHING_COLORS, a.bottomColor, (s) =>
        this.apply({ bottomColor: s.value })
      )
    );

    // Actions
    const actions = document.createElement('div');
    actions.className = 'creator-actions';

    const randomize = button('🎲 Random', () => this.apply(randomAppearance(a.bodyType)));
    randomize.classList.add('ghost');

    const cancel = button('Cancel', () =>
      this.finish({ keep: false, name: this.name, appearance: this.appearance })
    );
    cancel.classList.add('ghost');

    const add = button('Add to family', () =>
      this.finish({ keep: true, name: this.name, appearance: this.appearance })
    );
    add.classList.add('primary');

    actions.append(randomize, cancel, add);
    this.panel.appendChild(actions);
  }

  private finish(result: CreatorResult): void {
    this.panel.remove();
    this.onDone(result);
  }

  private buttonRow<T extends string>(
    label: string,
    options: readonly T[],
    current: T,
    toLabel: (v: T) => string,
    onPick: (v: T) => void
  ): HTMLElement {
    const { row, options: wrap } = labeledRow(label);
    for (const opt of options) {
      const b = button(cap(toLabel(opt)), () => onPick(opt));
      b.classList.add('chip');
      if (opt === current) b.classList.add('active');
      wrap.appendChild(b);
    }
    return row;
  }

  private swatchRow(
    label: string,
    options: readonly Swatch[],
    current: number,
    onPick: (s: Swatch) => void,
    showText = false
  ): HTMLElement {
    const { row, options: wrap } = labeledRow(label);
    for (const s of options) {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.title = s.name;
      if (showText) {
        b.textContent = s.name;
        b.classList.add('chip');
      } else {
        b.style.background = `#${s.value.toString(16).padStart(6, '0')}`;
      }
      if (approxEqual(s.value, current)) b.classList.add('active');
      b.addEventListener('click', () => onPick(s));
      wrap.appendChild(b);
    }
    return row;
  }
}

export function randomAppearance(bodyType: BodyType): Partial<Appearance> {
  const pickNum = (arr: Swatch[]): number =>
    arr[Math.floor(Math.random() * arr.length)].value;
  return {
    bodyType,
    hairStyle: HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)],
    face: FACE_STYLES[Math.floor(Math.random() * FACE_STYLES.length)],
    skin: pickNum(SKIN_TONES),
    hairColor: pickNum(HAIR_COLORS),
    topColor: pickNum(CLOTHING_COLORS),
    bottomColor: pickNum(CLOTHING_COLORS),
    build: pickNum(BUILDS),
  };
}

function labeledRow(label: string): { row: HTMLElement; options: HTMLElement } {
  const row = document.createElement('div');
  row.className = 'creator-row';
  row.appendChild(el('span', label, 'creator-label'));
  const options = document.createElement('div');
  options.className = 'creator-options';
  row.appendChild(options);
  return { row, options };
}

function el(tag: string, text: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  return e;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}
