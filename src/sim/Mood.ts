/** Emotional state on a single valence axis, -1 (miserable) .. 1 (content). */
export class Mood {
  private _valence: number;

  constructor(initial = 0) {
    this._valence = clamp(initial);
  }

  get valence(): number {
    return this._valence;
  }

  nudge(delta: number): void {
    this._valence = clamp(this._valence + delta);
  }

  /** Drift gently back toward neutral over time. */
  decay(dt: number, rate = 0.08): void {
    this._valence += (0 - this._valence) * Math.min(1, dt * rate);
  }

  get label(): string {
    const v = this._valence;
    if (v < -0.6) return 'Fuming';
    if (v < -0.2) return 'Sulking';
    if (v < 0.2) return 'Neutral';
    if (v < 0.6) return 'Content';
    return 'Delighted';
  }

  /** CSS color reflecting the mood, for HUD meters. */
  get color(): string {
    const t = (this._valence + 1) / 2;
    const hue = 10 + t * 120; // red -> green
    return `hsl(${hue}, 65%, 55%)`;
  }
}

function clamp(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
