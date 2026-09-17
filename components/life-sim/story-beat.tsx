'use client';
import type { StoryEvent } from './story';

/**
 * The story-beat spotlight. Instead of leaving the chapter's authored moments to
 * a side tab, each one takes the stage: title, scene, and the choice that moves
 * the story on. This is what makes the game read as a story you're walking
 * through rather than a sandbox of buttons.
 */
export function StoryBeat({ stageName, chapter, total, event, onChoose, onClose }: {
  stageName: string; chapter: number; total: number; event: StoryEvent;
  onChoose: (index: number) => void; onClose: () => void;
}): JSX.Element {
  return (
    <div className="story-beat-backdrop">
      <section className="story-beat" role="dialog" aria-modal="true" aria-label="Story moment">
        <p className="story-beat-eyebrow">{stageName.toUpperCase()} · MOMENT {Math.min(chapter + 1, total)} OF {total}</p>
        <h2>{event.title}</h2>
        <p className="story-beat-body">{event.body}</p>
        <div className="story-beat-choices">
          {event.choices.map((c, i) => (
            <button key={c.label} onClick={() => onChoose(i)}>
              <span>{c.label}</span>
              <small>Shapes your {c.skill}</small>
            </button>
          ))}
        </div>
        <button className="story-beat-defer" onClick={onClose}>Sit with it — look around first</button>
      </section>
    </div>
  );
}
