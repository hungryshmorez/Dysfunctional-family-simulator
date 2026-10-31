import { passTime, remember, type LifeState, type Need } from './engine';
import { adjustRegard, currentActivity, ROSTER } from './neighborhood';
import type { Person, StreetPlan } from './street';

// Face-to-face moments on the street. Townspeople the game already tracks
// (Della, Ren, Ozzie, Sim) answer to how you treat them — their regard moves
// and surfaces in the Town panel and your memories. Other neighbours react to
// who you are right now (the hour, your money, your record, your partner). The
// rich offer a day's work if you are old enough to take it. Everything here is
// authored and deterministic; nothing reaches for a network.

export type TalkChoiceId = 'chat' | 'help' | 'needle' | 'ask' | 'polite' | 'work';
export interface TalkChoice { id: TalkChoiceId; label: string; hint: string }
export interface TalkScene { eyebrow: string; title: string; greeting: string; choices: TalkChoice[] }
export interface TalkResult { life: LifeState; reply: string }
export interface TalkTarget { id: string; name: string; kind: Person['kind']; rosterId: string | null; household: string | null }

const DAY = 1440;
const clamp = (n: number): number => Math.max(0, Math.min(100, n));
const bump = (needs: LifeState['needs'], k: Need, by: number): LifeState['needs'] => ({ ...needs, [k]: clamp(needs[k] + by) });

/** Look a street person up in the plan, with the household they belong to. */
export function talkTarget(plan: StreetPlan, personId: string): TalkTarget | null {
  const p = plan.people.find((x) => x.id === personId);
  if (!p) return null;
  const lot = p.lotId ? plan.lots.find((l) => l.id === p.lotId) : null;
  return { id: p.id, name: p.name, kind: p.kind, rosterId: p.rosterId, household: lot?.household ?? null };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = <T>(list: readonly T[], seed: string): T => list[hash(seed) % list.length]!;
const hourOf = (minute: number): number => Math.floor(minute / 60) % 24;
const dayOf = (minute: number): number => Math.floor(minute / DAY);
function partOfDay(minute: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = hourOf(minute);
  return h >= 5 && h < 12 ? 'morning' : h < 18 && h >= 12 ? 'afternoon' : h >= 18 && h < 22 ? 'evening' : 'night';
}
const tier = (affinity: number): 0 | 1 | 2 | 3 => (affinity >= 60 ? 3 : affinity >= 35 ? 2 : affinity >= 15 ? 1 : 0);

// ---------------------------------------------------------------- townspeople
const ROSTER_GREETING: Record<string, readonly [string, string, string, string]> = {
  della: [
    'Oh. You. I’m in the middle of something.',
    'Hello, I suppose. Mind the step — I just swept it.',
    'There’s a heel of bread with your name on it. Don’t tell Ren.',
    'There you are, sweetheart! I saved you the good end of the loaf.',
  ],
  ren: [
    'Heard your family from three trailers down. Not that I was listening.',
    'Funny, I was just about to ask about you. Well. Not ask. Wonder.',
    'You’re one of the few I’d tell the real version to. Come closer.',
    'I’ve been telling everyone how well you’re doing. Mostly true, mostly.',
  ],
  ozzie: [
    'Mm.',
    'Beans are coming in. Tomatoes aren’t. Don’t ask me why.',
    'The old oak’s leafing out early. I’d take it as a good sign.',
    'I put a bench by the oak. Figured you might sit sometime.',
  ],
  sim: [
    'We’re closed. Sign says OPEN, but we’re closed.',
    'You again. What do you need, and is it cheap?',
    'I held a pack of your usual back. Don’t make it weird.',
    'For you? The back door’s always open. Metaphorically. Mostly.',
  ],
};
const ROSTER_REPLY: Record<string, Record<'chat' | 'help' | 'needle', string>> = {
  della: {
    chat: 'You trade five minutes of nothing for something warm. Della’s shoulders come down a little.',
    help: 'You hold the door and carry two trays round the back. Della presses a roll into your hand and pretends she didn’t.',
    needle: 'You say the thing about her prices. Della goes very quiet, then very busy, and the door shuts a little harder than it needed to.',
  },
  ren: {
    chat: 'Ren talks for ten minutes and says four true things. You pocket the true ones and let the rest slide off.',
    help: 'You help Ren carry a folding table to wherever he holds court. He tells you where everything on the block is buried, figuratively.',
    needle: 'You tell Ren to keep it to himself. He smiles like he’s already deciding who to tell first.',
  },
  ozzie: {
    chat: 'You say a little and Ozzie says less. It’s the nicest conversation you’ve had all week.',
    help: 'You hold a tray of seedlings while Ozzie sets them in. He nods once, which is basically a medal.',
    needle: 'You mock the beans. Ozzie doesn’t answer. He turns back to the soil and you feel very tall and very small.',
  },
  sim: {
    chat: 'Sim lets you lean on the counter and doesn’t charge for the view. You leave a little lighter.',
    help: 'You restock a shelf and sort a delivery meant for half the street. Sim slides you a drink on the house.',
    needle: 'You say what you think of the prices. Sim says the receipt’s on the counter, and means something else by it.',
  },
};
const ROSTER_MEMORY: Record<'chat' | 'help' | 'needle', (n: string) => string> = {
  chat: (n) => `You stopped and talked with ${n} on the street.`,
  help: (n) => `You gave ${n} a hand on the street, and it was noticed.`,
  needle: (n) => `You snapped at ${n} out on the street. It hung in the air afterwards.`,
};
const ROSTER_EVENT: Record<'chat' | 'help' | 'needle', (n: string) => string> = {
  chat: (n) => `${n} had a proper chat with you out on the street.`,
  help: (n) => `${n} let you lend a hand, and told someone about it.`,
  needle: (n) => `You snapped at ${n} out on the street.`,
};
const ROSTER_EFFECT = {
  chat: { regard: 4, mood: 'content' as const, minutes: 10, social: 12 },
  help: { regard: 7, mood: 'content' as const, minutes: 30, social: 8 },
  needle: { regard: -6, mood: 'restless' as const, minutes: 5, social: -5 },
};

// ------------------------------------------------------------------ neighbours
const NEIGHBOR_OPEN: Record<'morning' | 'afternoon' | 'evening' | 'night', readonly string[]> = {
  morning: ['Coffee’s on, if you’re brave.', 'Early bird. Or just up late.', 'Morning. The truck was loud again.'],
  afternoon: ['Nice out, if you ignore the smell.', 'Afternoon. Don’t mind the dog.', 'Hot enough for you?'],
  evening: ['Evening. Lights are on, so we’re “home.”', 'Dinner’s on. Not yours. Don’t get ideas.', 'Quiet night so far. Give it time.'],
  night: ['Late for walking around, isn’t it?', 'Can’t sleep either, huh.', 'Keep it down, the walls are thin.'],
};
const NEIGHBOR_REACT = (life: LifeState): string | null => {
  if (life.record > 0) return 'Word is you’ve been throwing hands. Over what, I won’t ask.';
  if (life.partner) return `Saw you out with ${life.partner}. About time somebody did.`;
  if (life.stage >= 3 && life.money < 80) return 'You look like you’re counting quarters. We all do, honey.';
  if (life.stage >= 3 && life.money > 2500) return 'Doing well, I hear. Don’t forget where you came from.';
  return null;
};
const GOSSIP: readonly ((other: string) => string)[] = [
  (other: string) => `${other} had another one of those arguments last night. Whole street heard.`,
  () => `Somebody saw a fancy car up at the gate again. Rich people are bad for property values, they say. Or good. Depends who you ask.`,
  (other: string) => `${other} hasn’t paid the lot fee in two months. Don’t you dare say I told you.`,
  () => `Ozzie’s planting something near the park that’s going to cause trouble. Mark me.`,
  (other: string) => `Heard ${other} found money in the couch cushions and is not sharing. Typical.`,
];

// ------------------------------------------------------------------ the rich
const RICH_GREETING: Record<string, { lines: readonly string[]; work: { pay: number; task: string; refused: string } }> = {
  'Mr. Whitcombe': {
    lines: ['Yes? Are you lost? The road does end here.', 'Hm. One of the trailer people. Yes. Hello.'],
    work: { pay: 120, task: 'cut the far hedge and rake the gravel', refused: 'We have men for that, thank you. Today, anyway.' },
  },
  'Mrs. Whitcombe': {
    lines: ['Oh! How… neighborly. Do keep to the road, dear.', 'You’ve got a kind face. It would suit a kinder neighborhood.'],
    work: { pay: 140, task: 'scrub the fountain and polish the pillars', refused: 'Not today, darling. Perhaps next week.' },
  },
  Sterling: {
    lines: ['Mind the paint, please. It’s worth more than your street.', 'I’d ask you to stand back from the car, if it’s all the same.'],
    work: { pay: 90, task: 'wash the limo and chamois the chrome', refused: 'Nothing today, but I’ll remember you offered.' },
  },
};

export function talkScene(life: LifeState, who: TalkTarget): TalkScene {
  const part = partOfDay(life.minute);
  if (who.rosterId) {
    const def = ROSTER.find((r) => r.id === who.rosterId);
    const affinity = life.neighborhood.npcs[who.rosterId]?.affinity ?? 20;
    const lines = ROSTER_GREETING[who.rosterId] ?? ROSTER_GREETING.della!;
    const doing = def ? currentActivity(def, life.minute) : '';
    return {
      eyebrow: `ON THE STREET · ${(def?.role ?? 'your neighbor').toUpperCase()}`,
      title: who.name,
      greeting: `${lines[tier(affinity)]}${doing ? ` (${who.name} is ${doing}.)` : ''}`,
      choices: [
        { id: 'chat', label: 'Stop and chat', hint: 'A few minutes · warms things up' },
        { id: 'help', label: 'Offer a hand', hint: 'About half an hour · they remember it' },
        { id: 'needle', label: 'Say something sharp', hint: 'You’ll feel better. They won’t.' },
      ],
    };
  }
  if (who.kind === 'rich') {
    const lines = RICH_GREETING[who.name]?.lines ?? RICH_GREETING['Mr. Whitcombe']!.lines;
    return {
      eyebrow: 'THE ESTATE · THE WHITCOMBES',
      title: who.name,
      greeting: pick(lines, who.id + dayOf(life.minute)),
      choices: [
        { id: 'polite', label: 'Greet them politely', hint: 'It costs nothing. Probably.' },
        { id: 'work', label: 'Ask if they need help', hint: life.stage >= 3 ? 'A day’s work, paid in cash' : 'Only if you’re grown' },
        { id: 'needle', label: 'Say what you think of the gate', hint: 'They hear it. They won’t answer.' },
      ],
    };
  }
  const react = NEIGHBOR_REACT(life);
  const open = pick(NEIGHBOR_OPEN[part], who.id + dayOf(life.minute));
  return {
    eyebrow: `ON THE STREET · ${(who.household ?? 'your neighbor').toUpperCase()}`,
    title: who.name,
    greeting: react ? `${open} ${react}` : open,
    choices: [
      { id: 'chat', label: 'Stop and chat', hint: 'A few minutes · a little company' },
      { id: 'ask', label: 'Ask what’s going on around here', hint: 'Street gossip' },
    ],
  };
}

export function resolveTalk(life: LifeState, who: TalkTarget, choice: TalkChoiceId, households: readonly string[] = []): TalkResult {
  if (life.stage < 1 || life.completed || life.health <= 0) return { life, reply: 'They don’t have anything to say to you right now.' };
  const day = dayOf(life.minute);

  if (who.rosterId && (choice === 'chat' || choice === 'help' || choice === 'needle')) {
    const fx = ROSTER_EFFECT[choice];
    let n = passTime(life, fx.minutes);
    n = { ...n, needs: bump(n.needs, 'social', fx.social) };
    if (choice === 'help') n = { ...n, skills: { ...n.skills, kindness: n.skills.kindness + 1 } };
    n = { ...n, neighborhood: adjustRegard(n.neighborhood, who.rosterId, fx.regard, fx.mood, ROSTER_EVENT[choice](who.name), day) };
    n = remember(n, ROSTER_MEMORY[choice](who.name), 'neighborhood', choice === 'chat' ? 3 : choice === 'help' ? 5 : 6);
    return { life: n, reply: ROSTER_REPLY[who.rosterId]?.[choice] ?? `${who.name} nods.` };
  }

  if (who.kind === 'rich') {
    const info = RICH_GREETING[who.name] ?? RICH_GREETING['Mr. Whitcombe']!;
    if (choice === 'polite') {
      const n = remember({ ...life, needs: bump(life.needs, 'social', 2) }, `${who.name} smiled at you the way people smile at furniture.`, 'estate', 3);
      return { life: n, reply: `“How… pleasant.” ${who.name} is already looking past you, toward the gate.` };
    }
    if (choice === 'needle') {
      const n = remember({ ...life, needs: bump(life.needs, 'social', -4) }, `You said what you thought of the Whitcombes’ gate to their faces.`, 'estate', 5);
      return { life: n, reply: `${who.name} doesn’t answer. Somewhere behind the pillars, a window slides shut.` };
    }
    if (choice === 'work') {
      if (life.stage < 3) return { life, reply: '“Come back when you’ve finished growing up, dear.”' };
      if (life.memories.some((m) => m.topic === 'estate-work' && dayOf(m.minute) === day)) {
        return { life, reply: `“${info.work.refused}”` };
      }
      let n = passTime(life, 150);
      n = { ...n, money: n.money + info.work.pay, needs: bump(bump(n.needs, 'energy', -10), 'hygiene', -8) };
      n = remember(n, `You spent a long afternoon at the Whitcombe estate: ${info.work.task}. They paid $${info.work.pay} in crisp bills and did not look at your face.`, 'estate-work', 6);
      return { life: n, reply: `You ${info.work.task}. At the end, $${info.work.pay} in cash is pressed into your palm. Nobody says thank you.` };
    }
  }

  // Ordinary neighbours.
  if (choice === 'ask') {
    const others = households.filter((h) => h !== who.household);
    const other = others.length ? pick(others, who.id + day) : 'someone down the road';
    const line = pick(GOSSIP, who.id + 'g' + day)(other);
    const n = remember(passTime({ ...life, needs: bump(life.needs, 'social', 4) }, 10), `${who.name} told you what they’d heard about the street.`, 'neighborhood', 3);
    return { life: n, reply: line };
  }
  const n = remember(passTime({ ...life, needs: bump(life.needs, 'social', 10) }, 10), `You stopped to talk with ${who.name} in the yard.`, 'neighborhood', 2);
  return { life: n, reply: `${who.name} talks until the coffee goes cold. It’s not nothing.` };
}
