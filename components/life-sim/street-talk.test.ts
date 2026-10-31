import { describe, expect, it } from 'vitest';
import { newLife, type LifeState } from './engine';
import { starterHome } from './home';
import { adjustRegard, newNeighborhood } from './neighborhood';
import { frontDoorOf, planStreet } from './street';
import { resolveTalk, talkScene, talkTarget } from './street-talk';

const home = starterHome();
const plan = planStreet({ width: home.width, depth: home.height }, frontDoorOf(home));
const households = plan.lots.filter((l) => !l.isPlayer).map((l) => l.household);
const adult = (over: Partial<LifeState> = {}): LifeState => ({ ...newLife('Alex'), stage: 3, minute: 600, ...over });
const who = (name: string) => talkTarget(plan, plan.people.find((p) => p.name === name)!.id)!;

describe('adjustRegard', () => {
  it('moves a townsperson’s regard within 0..100 and records what happened', () => {
    const s = newNeighborhood(0);
    const up = adjustRegard(s, 'della', 7, 'content', 'Helped out.', 3);
    expect(up.npcs.della!.affinity).toBe(27);
    expect(up.npcs.della!.lastEvent).toBe('Helped out.');
    expect(up.npcs.della!.lastDay).toBe(3);
    expect(adjustRegard(s, 'della', -500, 'low', 'x', 1).npcs.della!.affinity).toBe(0);
    expect(adjustRegard(s, 'della', 500, 'content', 'x', 1).npcs.della!.affinity).toBe(100);
  });
  it('ignores people the game does not track and leaves the original untouched', () => {
    const s = newNeighborhood(0);
    expect(adjustRegard(s, 'nobody', 5, 'content', 'x', 1)).toBe(s);
    adjustRegard(s, 'ren', 5, 'content', 'x', 1);
    expect(s.npcs.ren!.affinity).toBe(20);
  });
});

describe('talking to the game’s own townspeople', () => {
  it('finds each of them on the street', () => {
    for (const name of ['Della', 'Ren', 'Ozzie', 'Sim']) expect(who(name).rosterId, name).not.toBeNull();
  });

  it('warms them up when you chat or help, and costs a little time', () => {
    const s = adult();
    const chat = resolveTalk(s, who('Della'), 'chat');
    expect(chat.life.neighborhood.npcs.della!.affinity).toBeGreaterThan(s.neighborhood.npcs.della!.affinity);
    expect(chat.life.minute).toBeGreaterThan(s.minute);
    const help = resolveTalk(s, who('Della'), 'help');
    expect(help.life.neighborhood.npcs.della!.affinity).toBeGreaterThan(chat.life.neighborhood.npcs.della!.affinity);
    expect(help.life.skills.kindness).toBe(s.skills.kindness + 1);
    expect(chat.life.memories[0]!.text).toContain('Della');
  });

  it('cools them off when you snap at them', () => {
    const s = adult();
    const r = resolveTalk(s, who('Ren'), 'needle');
    expect(r.life.neighborhood.npcs.ren!.affinity).toBeLessThan(s.neighborhood.npcs.ren!.affinity);
    expect(r.life.neighborhood.npcs.ren!.mood).toBe('restless');
    expect(r.life.needs.social).toBeLessThan(s.needs.social);
  });

  it('only changes the person you spoke to', () => {
    const s = adult();
    const r = resolveTalk(s, who('Sim'), 'help');
    expect(r.life.neighborhood.npcs.della).toEqual(s.neighborhood.npcs.della);
  });

  it('greets you according to how they feel about you', () => {
    const cold = talkScene(adult(), who('Della')).greeting;
    const base = adult();
    const fond = talkScene({ ...base, neighborhood: adjustRegard(base.neighborhood, 'della', 60, 'content', 'x', 1) }, who('Della')).greeting;
    expect(cold).not.toBe(fond);
    expect(fond).toContain('sweetheart');
  });

  it('says what they are doing right now', () => {
    expect(talkScene(adult({ minute: 360 + 5 }), who('Ozzie')).greeting).toMatch(/Ozzie is /);
  });
});

describe('talking to ordinary neighbors', () => {
  const neighbor = who('Earl');

  it('offers chat and gossip, and chatting brings a little company', () => {
    const scene = talkScene(adult(), neighbor);
    expect(scene.choices.map((c) => c.id)).toEqual(['chat', 'ask']);
    const s = adult({ needs: { energy: 80, hunger: 80, hygiene: 80, fun: 50, social: 40 } });
    expect(resolveTalk(s, neighbor, 'chat', households).life.needs.social).toBeGreaterThan(40);
  });

  it('shares gossip about another household, never their own', () => {
    const r = resolveTalk(adult(), neighbor, 'ask', households);
    expect(r.reply).not.toContain('the Crabbs');
    expect(r.reply.length).toBeGreaterThan(10);
  });

  it('reacts to your record, your partner and your money', () => {
    expect(talkScene(adult({ record: 2 }), neighbor).greeting).toMatch(/throwing hands/);
    expect(talkScene(adult({ partner: 'Jules' }), neighbor).greeting).toContain('Jules');
    expect(talkScene(adult({ money: 10 }), neighbor).greeting).toMatch(/quarters/);
    expect(talkScene(adult({ money: 9000 }), neighbor).greeting).toMatch(/Doing well/);
  });

  it('never changes a tracked townsperson’s regard', () => {
    const s = adult();
    expect(resolveTalk(s, neighbor, 'chat', households).life.neighborhood.npcs).toEqual(s.neighborhood.npcs);
  });
});

describe('talking to the rich', () => {
  const mr = who('Mr. Whitcombe');

  it('lets an adult work a day for cash, once per day', () => {
    const s = adult({ money: 100 });
    const first = resolveTalk(s, mr, 'work');
    expect(first.life.money).toBe(220);
    expect(first.life.minute).toBeGreaterThan(s.minute);
    expect(first.life.needs.energy).toBeLessThan(s.needs.energy);
    const again = resolveTalk(first.life, who('Mrs. Whitcombe'), 'work');
    expect(again.life.money).toBe(first.life.money);
    expect(again.reply).toMatch(/Not today|men for that|Nothing today/);
  });

  it('allows more work the next day', () => {
    const first = resolveTalk(adult(), mr, 'work').life;
    const tomorrow = { ...first, minute: first.minute + 1440 };
    expect(resolveTalk(tomorrow, mr, 'work').life.money).toBeGreaterThan(first.money);
  });

  it('sends the young away with nothing', () => {
    const s = adult({ stage: 2 });
    const r = resolveTalk(s, mr, 'work');
    expect(r.life).toBe(s);
    expect(r.reply).toMatch(/growing up/);
  });

  it('is cold when you are polite and silent when you are rude', () => {
    const s = adult();
    expect(resolveTalk(s, mr, 'polite').life.memories[0]!.text).toMatch(/furniture/);
    expect(resolveTalk(s, mr, 'needle').life.needs.social).toBeLessThan(s.needs.social);
  });

  it('pays each of them differently', () => {
    const pay = (n: string): number => resolveTalk(adult({ money: 0 }), who(n), 'work').life.money;
    expect(new Set([pay('Mr. Whitcombe'), pay('Mrs. Whitcombe'), pay('Sterling')]).size).toBe(3);
  });
});

describe('guards', () => {
  it('does nothing for a baby, a finished life, or the fallen', () => {
    for (const s of [adult({ stage: 0 }), adult({ completed: true }), adult({ health: 0 })]) {
      expect(resolveTalk(s, who('Della'), 'chat').life).toBe(s);
    }
  });
  it('returns null for a stranger who is not on the street', () => {
    expect(talkTarget(plan, 'nobody')).toBeNull();
  });
});
