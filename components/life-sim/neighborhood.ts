// A living neighbourhood that keeps moving whether the player is present or not.
//
// Design ported (not code) from TheSaiEaranti/living-city's SPEC — its two ideas
// that fit this game's "authored dialogue, local rules, no AI service" ethos:
//   1. Ticks are NARRATIVE, not spatial: an NPC remembers "patched things up
//      with a neighbour," never tile coordinates.
//   2. Lazy catch-up with a hard cap: the world advances deterministically when
//      time passes, but a long absence only simulates the last few in-world days
//      so it can never explode.
// Everything here is original, deterministic, and free of the upstream project's
// LLM / PixiJS / database stack.

/** How many in-world days a single catch-up will ever simulate (SPEC's cap). */
const CATCHUP_DAYS = 3;
const DAY = 1440;

export type NpcMood = 'content' | 'restless' | 'low';

/** Static, authored definition of a townsperson. */
export interface NpcDef {
  id: string;
  name: string;
  role: string;
  /** One-line voice, shown in the Town panel. */
  persona: string;
  /** Daily routine by 6-hour phase: [night, morning, afternoon, evening]. */
  schedule: readonly [string, string, string, string];
}

/** A single authored thing an NPC can do on a given day. */
interface Beat {
  text: string;
  /** Change to the NPC's affinity toward the player, −100..100. */
  affinity: number;
  mood: NpcMood;
  /** 1..10; only the most important beats surface as player memories. */
  importance: number;
}

/** Per-NPC mutable runtime state (saved). */
export interface NpcState {
  affinity: number;
  mood: NpcMood;
  /** The last thing this NPC did, for the Town panel. */
  lastEvent: string;
  /** Day index of that event, or -1 if nothing has happened yet. */
  lastDay: number;
}

export interface NeighborhoodState {
  npcs: Record<string, NpcState>;
  /** Minute up to which the neighbourhood has already been simulated. */
  lastTick: number;
}

/** An event surfaced to the player's memory book after a tick. */
export interface NeighborhoodEvent {
  text: string;
  importance: number;
}

export const ROSTER: readonly NpcDef[] = [
  {
    id: 'della',
    name: 'Della',
    role: 'runs the corner bakery',
    persona: 'Warm and nosy in equal measure; feeds the street and forgets nobody.',
    schedule: ['asleep above the shop', 'pulling loaves from the oven', 'minding the counter', 'sweeping the step'],
  },
  {
    id: 'ren',
    name: 'Ren',
    role: 'the block’s gossip',
    persona: 'Knows everything an hour before you do and can’t sit on any of it.',
    schedule: ['out late, as ever', 'nursing coffee on the bench', 'making the rounds', 'holding court at the tavern'],
  },
  {
    id: 'ozzie',
    name: 'Ozzie',
    role: 'keeps the little park',
    persona: 'Quiet, dependable, talks to the trees more than the people.',
    schedule: ['asleep in the toolshed', 'turning the beds', 'raking the paths', 'locking the gate'],
  },
  {
    id: 'sim',
    name: 'Sim',
    role: 'works the night shop',
    persona: 'Sharp-tongued, soft underneath, always open when nothing else is.',
    schedule: ['restocking shelves', 'asleep in the back', 'signing for deliveries', 'opening up for the night'],
  },
];

/** Authored beats per NPC. Deterministically chosen; text is player-agnostic. */
const BEATS: Record<string, readonly Beat[]> = {
  della: [
    { text: 'Della left a spare loaf on your step "because it was going spare."', affinity: 6, mood: 'content', importance: 6 },
    { text: 'Della grumbled that you never stop by the bakery anymore.', affinity: -4, mood: 'restless', importance: 5 },
    { text: 'Della and Ren fell out over a batch of missing pastries.', affinity: 0, mood: 'low', importance: 4 },
  ],
  ren: [
    { text: 'Ren spread a kind word about you up and down the block.', affinity: 5, mood: 'content', importance: 6 },
    { text: 'Ren repeated something about you that wasn’t quite true.', affinity: -6, mood: 'restless', importance: 7 },
    { text: 'Ren spent the evening trading rumours at the tavern.', affinity: 0, mood: 'content', importance: 3 },
  ],
  ozzie: [
    { text: 'Ozzie planted a row of something new along your fence line.', affinity: 4, mood: 'content', importance: 5 },
    { text: 'Ozzie waved you over but you’d already gone; he seemed put out.', affinity: -3, mood: 'low', importance: 4 },
    { text: 'Ozzie worked the park in the rain and said nothing to anyone.', affinity: 0, mood: 'low', importance: 3 },
  ],
  sim: [
    { text: 'Sim held the shop open a few minutes late so you weren’t stranded.', affinity: 6, mood: 'content', importance: 6 },
    { text: 'Sim short-changed you and refused to admit it.', affinity: -7, mood: 'restless', importance: 6 },
    { text: 'Sim signed for a delivery meant for half the street.', affinity: 0, mood: 'content', importance: 3 },
  ],
};

const clampAffinity = (n: number): number => Math.max(0, Math.min(100, n));
const dayOf = (minute: number): number => Math.floor(minute / DAY);
const phaseOf = (minute: number): number =>
  Math.floor(((minute % DAY) + DAY) % DAY / 360); // 0 night · 1 morning · 2 afternoon · 3 evening

/** Deterministic PRNG so the same day always plays out the same way. */
function seeded(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // mulberry32 step → [0,1)
  h += 0x6d2b79f5;
  let t = h;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newNeighborhood(minute = 480): NeighborhoodState {
  const npcs: Record<string, NpcState> = {};
  for (const def of ROSTER) {
    npcs[def.id] = { affinity: 20, mood: 'content', lastEvent: '', lastDay: -1 };
  }
  return { npcs, lastTick: minute };
}

/** What an NPC is doing right now, from its schedule. */
export function currentActivity(def: NpcDef, minute: number): string {
  return def.schedule[phaseOf(minute)] ?? def.schedule[0];
}

/**
 * Advance the neighbourhood from its last tick up to `toMinute`, deterministically.
 * Only whole crossed days generate beats, and never more than {@link CATCHUP_DAYS}
 * of them, so a call every game-minute is cheap and a month-long jump is bounded.
 * Returns the new state plus any beats important enough to become player memories.
 */
export function tickNeighborhood(
  state: NeighborhoodState,
  toMinute: number
): { state: NeighborhoodState; events: NeighborhoodEvent[] } {
  const fromDay = dayOf(state.lastTick);
  const toDay = dayOf(toMinute);
  if (toDay <= fromDay) {
    return { state: { ...state, lastTick: toMinute }, events: [] };
  }

  const firstDay = Math.max(fromDay + 1, toDay - CATCHUP_DAYS + 1);
  const npcs: Record<string, NpcState> = { ...state.npcs };
  const surfaced: NeighborhoodEvent[] = [];

  for (let day = firstDay; day <= toDay; day++) {
    for (const def of ROSTER) {
      const beats = BEATS[def.id];
      if (!beats || beats.length === 0) continue;
      // ~55% chance of a beat on a given day; otherwise a quiet day.
      if (seeded(`${def.id}:act:${day}`) > 0.55) continue;
      const beat = beats[Math.floor(seeded(`${def.id}:pick:${day}`) * beats.length)] ?? beats[0]!;
      const prev = npcs[def.id] ?? { affinity: 20, mood: 'content' as NpcMood, lastEvent: '', lastDay: -1 };
      npcs[def.id] = {
        affinity: clampAffinity(prev.affinity + beat.affinity),
        mood: beat.mood,
        lastEvent: beat.text,
        lastDay: day,
      };
      if (beat.importance >= 6) surfaced.push({ text: beat.text, importance: beat.importance });
    }
  }

  // Surface only the two most notable beats so the memory book never floods.
  surfaced.sort((a, b) => b.importance - a.importance);
  return { state: { npcs, lastTick: toMinute }, events: surfaced.slice(0, 2) };
}

export function parseNeighborhood(raw: unknown): NeighborhoodState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as NeighborhoodState;
  if (typeof s.lastTick !== 'number' || !Number.isFinite(s.lastTick) || s.lastTick < 0) return null;
  if (!s.npcs || typeof s.npcs !== 'object') return null;
  const npcs: Record<string, NpcState> = {};
  for (const def of ROSTER) {
    const n = s.npcs[def.id];
    if (
      !n ||
      typeof n.affinity !== 'number' ||
      !Number.isFinite(n.affinity) ||
      n.affinity < 0 ||
      n.affinity > 100 ||
      (n.mood !== 'content' && n.mood !== 'restless' && n.mood !== 'low') ||
      typeof n.lastEvent !== 'string' ||
      n.lastEvent.length > 500 ||
      typeof n.lastDay !== 'number' ||
      !Number.isInteger(n.lastDay) ||
      n.lastDay < -1
    ) {
      // Missing or malformed NPC → reseed just that one, keeping the rest.
      npcs[def.id] = { affinity: 20, mood: 'content', lastEvent: '', lastDay: -1 };
      continue;
    }
    npcs[def.id] = { affinity: n.affinity, mood: n.mood, lastEvent: n.lastEvent, lastDay: n.lastDay };
  }
  return { npcs, lastTick: s.lastTick };
}
