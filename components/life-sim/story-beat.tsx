'use client';
import { useState } from 'react';
import type { StoryEvent } from './story';

/**
 * The story-beat spotlight. Each authored chapter moment takes the stage in two
 * phases: the choice, then its consequence as its own beat, so a decision lands
 * before the story moves on. This is what makes the game read as a story you're
 * walking through rather than a sandbox of buttons.
 *
 * The parent gives each beat a fresh key, so internal choice state resets per
 * moment; `onChoose` is only called on "continue", advancing the life then.
 */
export function StoryBeat({ stageName, chapter, total, event, onChoose, onClose }: {
  stageName: string; chapter: number; total: number; event: StoryEvent;
  onChoose: (index: number) => void; onClose: () => void;
}): JSX.Element {
  const [chosen, setChosen] = useState<number | null>(null);
  const picked = chosen === null ? null : event.choices[chosen];

  return (
    <div className="story-beat-backdrop">
      <section className="story-beat" role="dialog" aria-modal="true" aria-label="Story moment">
        <p className="story-beat-eyebrow">{stageName.toUpperCase()} · MOMENT {Math.min(chapter + 1, total)} OF {total}</p>
        <h2>{event.title}</h2>

        {picked ? (
          <>
            <p className="story-beat-choice-echo">You chose: {picked.label}</p>
            <p className="story-beat-body">{picked.consequence}</p>
            <button className="story-beat-continue" onClick={() => onChoose(chosen!)}>And so the story goes on →</button>
          </>
        ) : (
          <>
            <p className="story-beat-body">{event.body}</p>
            <div className="story-beat-choices">
              {event.choices.map((c, i) => (
                <button key={c.label} onClick={() => setChosen(i)}>
                  <span>{c.label}</span>
                  <small>Shapes your {c.skill}</small>
                </button>
              ))}
            </div>
            <button className="story-beat-defer" onClick={onClose}>Sit with it — look around first</button>
          </>
        )}
      </section>
    </div>
  );
}
