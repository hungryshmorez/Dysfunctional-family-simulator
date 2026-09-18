'use client';
import { useState } from 'react';
import type { ConsequenceBeat, ConsequenceResponse } from './consequences';

/**
 * The fallout of the fights you started, on the same spotlight surface as the
 * story beats — so a caseworker at your table or a summons in the mail reads as
 * a scene the story walks you into, not a number that quietly moved. Two phases:
 * you choose how to face it, then live with what that choice cost.
 */
export function ConsequenceSpotlight({ beat, onRespond, onClose }: {
  beat: ConsequenceBeat; onRespond: (response: ConsequenceResponse) => void; onClose: () => void;
}): JSX.Element {
  const [chosen, setChosen] = useState<ConsequenceResponse | null>(null);
  const picked = chosen === null ? null : beat[chosen];

  return (
    <div className="story-beat-backdrop">
      <section className="story-beat" role="dialog" aria-modal="true" aria-label="A consequence">
        <p className="story-beat-eyebrow">{beat.eyebrow}</p>
        <h2>{beat.title}</h2>

        {picked ? (
          <>
            <p className="story-beat-choice-echo">You chose: {picked.label}</p>
            <p className="story-beat-body">{picked.aftermath}</p>
            <button className="story-beat-continue" onClick={() => onRespond(chosen!)}>Live with it →</button>
          </>
        ) : (
          <>
            <p className="story-beat-body">{beat.body}</p>
            <div className="story-beat-choices">
              <button onClick={() => setChosen('own')}><span>{beat.own.label}</span><small>Take responsibility</small></button>
              <button onClick={() => setChosen('deflect')}><span>{beat.deflect.label}</span><small>Push back — it costs more later</small></button>
            </div>
            <button className="story-beat-defer" onClick={onClose}>Not now — look around first</button>
          </>
        )}
      </section>
    </div>
  );
}
