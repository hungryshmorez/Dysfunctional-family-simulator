'use client';
import { useState } from 'react';
import { FAMILY_MEMBERS, type FamilyId } from './family';
import { DEFAULT_SEATS, dinnerError, dinnerMemory, dinnerTension, type DinnerChoice } from './family-dinner';
import type { LifeState } from './engine';
import type { RoomLayout } from '@/components/room-organizer/lib/types';

/**
 * Family dinner as a scene you step into, on the same spotlight surface as the
 * story beats — the table takes the whole stage instead of sitting in a
 * sidebar. You arrange who sits by whom, feel the tension build, then decide
 * how the night goes. The fallout lands in Memories like any other beat.
 */
export function DinnerSpotlight({ life, home, busy, onDinner, onClose }: {
  life: LifeState; home: RoomLayout; busy: boolean; onDinner: (seats: FamilyId[], choice: DinnerChoice) => void; onClose: () => void;
}): JSX.Element {
  const [seats, setSeats] = useState<FamilyId[]>([...DEFAULT_SEATS]);
  const error = dinnerError(life, home);
  const memory = dinnerMemory(life);
  const tension = dinnerTension(life, seats);

  return (
    <div className="story-beat-backdrop">
      <section className="story-beat" role="dialog" aria-modal="true" aria-label="Family dinner">
        <p className="story-beat-eyebrow">THE HOUSEHOLD · EVERYONE AT THE TABLE</p>
        <h2>Dinner is served</h2>
        <p className="story-beat-body">Arrange five seats clockwise. People next to each other work on each other all night — trust and resentment both travel down the table.</p>

        <div className="dinner-seats">
          {seats.map((id, index) => (
            <label key={index}>Seat {index + 1}
              <select aria-label={'Dinner seat ' + (index + 1)} value={id} onChange={(e) => {
                const next = [...seats], other = next.indexOf(e.target.value as FamilyId);
                next[index] = next[other]!; next[other] = id; setSeats(next);
              }}>
                {FAMILY_MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.id === 'self' ? life.name + ' (you)' : m.name}</option>)}
              </select>
            </label>
          ))}
        </div>

        <p className="story-beat-tension"><b>Table tension: {tension} / 100</b></p>
        <small>Dana tends to favor Casey; Morgan tends to favor Riley. Seating a parent beside their favorite adds tension.</small>
        {memory && <p className="story-beat-recalled">Still on your mind: {memory.slice(0, 180)}{memory.length > 180 ? '…' : ''}</p>}

        <div className="story-beat-choices">
          <button disabled={busy || !!error} onClick={() => onDinner(seats, 'include')}><span>Give everyone a turn</span><small>$20 · try to hold the peace</small></button>
          <button disabled={busy || !!error} onClick={() => onDinner(seats, 'sides')}><span>Back the favorites</span><small>$20 · raises the tension</small></button>
        </div>
        <small>{error ?? 'One dinner per day · Advances one hour. Tension of 37+ can overwhelm mediation.'}</small>
        <button className="story-beat-defer" onClick={onClose}>Not now — get up from the table</button>
      </section>
    </div>
  );
}
