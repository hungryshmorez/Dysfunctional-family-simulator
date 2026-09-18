'use client';
import { FAMILY_MEMBERS, type FamilyMoment } from './family';
import { momentText, type MomentResponse } from './family-moments';

/**
 * Family confrontations and tender moments, presented on the same spotlight
 * surface as the story beats — so every dramatic moment reads as an authored
 * scene you step into, not a sidebar panel you might miss.
 */
export function MomentSpotlight({ moment, onRespond, onClose }: {
  moment: FamilyMoment; onRespond: (response: MomentResponse) => void; onClose: () => void;
}): JSX.Element {
  const actor = FAMILY_MEMBERS.find((m) => m.id === moment.actor)!;
  const argument = moment.kind === 'argument';
  return (
    <div className="story-beat-backdrop">
      <section className="story-beat" role="dialog" aria-modal="true" aria-label="Family moment">
        <p className="story-beat-eyebrow">THE HOUSEHOLD · {argument ? 'A ROW BREAKS OUT' : 'A TENDER MOMENT'}</p>
        <h2>{argument ? 'Voices are rising' : 'A little kindness'}</h2>
        <p className="story-beat-body">{momentText(moment)} How do you step in?</p>
        <div className="story-beat-choices">
          {argument ? (
            <>
              <button onClick={() => onRespond('mediate')}><span>Help them hear each other</span><small>Mediate — depends on their trust in you</small></button>
              <button onClick={() => onRespond('side')}><span>Back {actor.name}</span><small>Take a side</small></button>
            </>
          ) : (
            <button onClick={() => onRespond('join')}><span>Join the moment</span><small>Be part of it</small></button>
          )}
          <button onClick={() => onRespond('leave')}><span>Give them space</span><small>Let it play out without you</small></button>
        </div>
        <button className="story-beat-defer" onClick={onClose}>Not now — look around first</button>
      </section>
    </div>
  );
}
