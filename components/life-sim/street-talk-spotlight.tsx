'use client';
import type { TalkChoiceId, TalkScene } from './street-talk';

/**
 * A conversation on the street, on the same spotlight surface as the story
 * beats. First the neighbor speaks and you choose; then the outcome is shown
 * and you carry on.
 */
export function StreetTalkSpotlight({ scene, reply, onChoose, onClose }: {
  scene: TalkScene; reply: string | null; onChoose: (id: TalkChoiceId) => void; onClose: () => void;
}): JSX.Element {
  return (
    <div className="story-beat-backdrop">
      <section className="story-beat" role="dialog" aria-modal="true" aria-label={`Talking with ${scene.title}`}>
        <p className="story-beat-eyebrow">{scene.eyebrow}</p>
        <h2>{scene.title}</h2>
        {reply === null ? (
          <>
            <p className="story-beat-body">“{scene.greeting}”</p>
            <div className="story-beat-choices">
              {scene.choices.map((c) => (
                <button key={c.id} onClick={() => onChoose(c.id)}><span>{c.label}</span><small>{c.hint}</small></button>
              ))}
            </div>
            <button className="story-beat-defer" onClick={onClose}>Walk on</button>
          </>
        ) : (
          <>
            <p className="story-beat-body">{reply}</p>
            <div className="story-beat-choices">
              <button autoFocus onClick={onClose}><span>Carry on</span><small>Back to the street</small></button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
