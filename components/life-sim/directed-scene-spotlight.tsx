'use client';
import { conflictChoiceError } from './core-conflicts';
import { FAMILY_MEMBERS } from './family';
import { FAMILY_EPISODES } from './story-episodes';
import type { LifeState } from './engine';
import type { DirectedResponse, DirectedScene } from './story-director-state';

/**
 * The active family-story scene, brought to the same spotlight surface as the
 * authored chapter beats. A directed scene is dialogue plus a choice — exactly
 * a story beat — so it belongs on the stage, not buried in a sidebar panel. The
 * director panel keeps the meta controls (mode, tone, the family's minds); this
 * is where you actually live the scene.
 */
export function DirectedSceneSpotlight({ life, scene, onChoose, onClose }: {
  life: LifeState; scene: DirectedScene; onChoose: (id: string, response: DirectedResponse) => void; onClose: () => void;
}): JSX.Element {
  const episode = FAMILY_EPISODES[scene.stage];
  const name = (id: string): string => FAMILY_MEMBERS.find((m) => m.id === id)?.name ?? id;
  const title = scene.card?.title ?? episode?.beats[scene.step] ?? 'A family moment';
  const responses: { id: DirectedResponse; label: string }[] = scene.card
    ? scene.card.choices.map((c, i) => ({ id: i === 0 ? 'answer-a' : 'answer-b', label: c.answer }))
    : episode
      ? (['repair', 'escalate', 'avoid'] as const).map((id) => ({ id, label: episode.choices[id] }))
      : [];

  return (
    <div className="story-beat-backdrop">
      <section className="story-beat" role="dialog" aria-modal="true" aria-label="Family story scene">
        <p className="story-beat-eyebrow">{scene.card ? 'A STORY YOU WROTE' : `SCENE ${scene.step + 1} OF 3`} · {scene.kind === 'argument' ? 'TENSION' : 'CONNECTION'}</p>
        <h2>{title}</h2>
        <p className="story-beat-body">{scene.goal}</p>

        <div className="story-beat-dialogue">
          {scene.lines.map((line, i) => (
            <blockquote key={i}><b>{name(line.speaker)}</b> {line.text}</blockquote>
          ))}
        </div>
        {scene.recalled && <p className="story-beat-recalled">What brought this back: {scene.recalled}</p>}

        <div className="story-beat-choices">
          {responses.map((response) => {
            const error = response.id === 'answer-a' || response.id === 'answer-b'
              ? conflictChoiceError(life, scene.card, response.id === 'answer-a' ? 0 : 1)
              : null;
            return (
              <button key={response.id} disabled={!!error} title={error ?? undefined} onClick={() => onChoose(scene.id, response.id)}>
                <span>{response.label}</span>
                {error && <small>{error}</small>}
              </button>
            );
          })}
        </div>
        <button className="story-beat-defer" onClick={onClose}>Step back — look around first</button>
      </section>
    </div>
  );
}
