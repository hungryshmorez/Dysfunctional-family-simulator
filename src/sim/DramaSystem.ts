import type { Character } from '../characters/Character';

export interface DramaEvent {
  speaker: Character;
  line: string;
  /** Positive = warm moment, negative = conflict. */
  tone: number;
}

type Listener = (event: DramaEvent) => void;

const CONFLICT_LINES = [
  'You ALWAYS do this.',
  "That's it, I'm in the study.",
  'Nobody in this house listens to me.',
  'I did the dishes LAST time.',
  'Fine. Great. Wonderful.',
  'Why is it always my fault?',
  'I am not raising my voice!',
];

const WARM_LINES = [
  "Okay... I'm sorry. Truce?",
  'I made you a coffee.',
  'Hey. We good?',
  "Come here, you're alright.",
  "I didn't mean it earlier.",
];

/**
 * Drives the "dysfunctional" part: pairs of family members who share a room
 * periodically have a moment — usually friction, occasionally a thaw — that
 * shifts both moods and their private relationship score.
 */
export class DramaSystem {
  private readonly rel = new Map<string, number>();
  private readonly listeners: Listener[] = [];
  private timer = 0;
  private interval: number;

  constructor(
    private readonly family: Character[],
    interval = 3.5
  ) {
    this.interval = interval;
  }

  onEvent(fn: Listener): void {
    this.listeners.push(fn);
  }

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.interval * (0.6 + Math.random() * 0.8);
    this.tick();
  }

  private tick(): void {
    const pair = this.pickRoommates();
    if (!pair) return;
    const [a, b] = pair;

    const key = relKey(a, b);
    const bond = this.rel.get(key) ?? 0;

    // A frayed bond (or a sour mood) makes conflict more likely.
    const warmChance = 0.28 + bond * 0.2 + (a.mood.valence + b.mood.valence) * 0.1;
    const warm = Math.random() < warmChance;

    if (warm) {
      const line = pick(WARM_LINES);
      this.rel.set(key, clampRel(bond + 0.15));
      a.mood.nudge(0.25);
      b.mood.nudge(0.2);
      this.emit({ speaker: a, line, tone: 0.6 });
    } else {
      const line = pick(CONFLICT_LINES);
      this.rel.set(key, clampRel(bond - 0.2));
      a.mood.nudge(-0.3);
      b.mood.nudge(-0.22);
      this.emit({ speaker: a, line, tone: -0.6 });
    }
  }

  private pickRoommates(): [Character, Character] | null {
    const shuffled = [...this.family].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        if (shuffled[i].room.id === shuffled[j].room.id) {
          return [shuffled[i], shuffled[j]];
        }
      }
    }
    return null;
  }

  private emit(event: DramaEvent): void {
    for (const fn of this.listeners) fn(event);
  }
}

function relKey(a: Character, b: Character): string {
  return [a.id, b.id].sort().join('|');
}

function clampRel(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
