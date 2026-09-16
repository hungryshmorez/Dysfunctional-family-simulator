'use client';
import { currentActivity, ROSTER } from './neighborhood';
import type { LifeState } from './engine';

const MOOD_LABEL: Record<string, string> = { content: 'Content', restless: 'Restless', low: 'Low' };

/** Read-only view of the townspeople who keep living between your visits. */
export function NeighborhoodPanel({ life }: { life: LifeState }): JSX.Element {
  return (
    <>
      <p className="life-eyebrow">THE STREET KEEPS LIVING</p>
      <h2>Your neighbours</h2>
      <p>They follow their own days and remember how you treat them — even while you are busy at home.</p>
      {ROSTER.map((def) => {
        const npc = life.neighborhood.npcs[def.id];
        const affinity = npc ? Math.round(npc.affinity) : 20;
        return (
          <div className="life-person-row" key={def.id}>
            <strong>
              {def.name} · <span className="life-note">{def.role}</span>
            </strong>
            <small>
              {affinity >= 60 ? 'Fond of you' : affinity >= 35 ? 'Warming up' : affinity >= 15 ? 'Cordial' : 'Wary'} ·{' '}
              {affinity} regard · {MOOD_LABEL[npc?.mood ?? 'content']}
            </small>
            <progress max={100} value={affinity} />
            <small>Right now: {currentActivity(def, life.minute)}.</small>
            {npc?.lastEvent && <small>Lately: {npc.lastEvent}</small>}
          </div>
        );
      })}
      <p className="life-note">
        Their comings and goings surface in your Memories as the days pass. Nothing here needs your input — it is the
        world getting on with itself.
      </p>
    </>
  );
}
