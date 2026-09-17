'use client';
import { useEffect, useRef, useState } from 'react';
import { decideOutcome, type FightResult, type FightSetup } from './fight';

type BeatKind = 'strike' | 'dodge';
interface Beat { kind: BeatKind; }

// Nine beats: mostly the opponent attacking (dodge), with openings to strike.
const SEQUENCE: readonly BeatKind[] = ['dodge', 'strike', 'dodge', 'dodge', 'strike', 'dodge', 'strike', 'dodge', 'strike'];

interface Tuning { window: number; strikeDmg: number; oppDmg: number; }
function tuning(instigated: boolean): Tuning {
  // Instigating: the opponent hits harder and the windows are meaner. Combined
  // with the fight rule, a fight you started is one you lose.
  return instigated ? { window: 820, strikeDmg: 9, oppDmg: 24 } : { window: 1150, strikeDmg: 17, oppDmg: 14 };
}

/** A stylized timing brawl. STRIKE the openings, DODGE the attacks. */
export function FightPanel({ setup, onComplete, onClose }: { setup: FightSetup; onComplete: (result: FightResult) => void; onClose: () => void }): JSX.Element {
  const [playerHP, setPlayerHP] = useState(100);
  const [oppHP, setOppHP] = useState(100);
  const [phase, setPhase] = useState<'ready' | 'live' | 'over'>('ready');
  const [beat, setBeat] = useState<Beat | null>(null);
  const [flash, setFlash] = useState<'' | 'hit' | 'block' | 'miss' | 'took'>('');
  const [progress, setProgress] = useState(0);

  const game = useRef({ i: 0, resolved: true, started: 0, gapUntil: 0, pHP: 100, oHP: 100, kind: 'dodge' as BeatKind });
  const t = useRef(tuning(setup.instigatedByPlayer));
  const raf = useRef(0);

  useEffect(() => {
    if (phase !== 'live') return;
    const tune = t.current;
    const g = game.current;
    const resolve = (success: boolean): void => {
      if (g.resolved) return;
      g.resolved = true;
      if (g.kind === 'strike') {
        if (success) { g.oHP = Math.max(0, g.oHP - tune.strikeDmg); setOppHP(g.oHP); setFlash('hit'); }
        else setFlash('miss');
      } else {
        if (success) setFlash('block');
        else { g.pHP = Math.max(0, g.pHP - tune.oppDmg); setPlayerHP(g.pHP); setFlash('took'); }
      }
      g.gapUntil = performance.now() + 460;
      setBeat(null);
    };
    const act = (kind: BeatKind): void => { if (!g.resolved) resolve(g.kind === kind); };
    const key = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      if (k === 'j' || k === ' ') { e.preventDefault(); act('strike'); }
      if (k === 'k') { e.preventDefault(); act('dodge'); }
    };
    window.addEventListener('keydown', key);
    (game.current as unknown as { act: (k: BeatKind) => void }).act = act;

    const loop = (): void => {
      raf.current = requestAnimationFrame(loop);
      const now = performance.now();
      if (g.pHP <= 0 || g.oHP <= 0 || (g.i >= SEQUENCE.length && g.resolved)) {
        cancelAnimationFrame(raf.current);
        setPhase('over');
        return;
      }
      if (g.resolved) {
        if (now >= g.gapUntil && g.i < SEQUENCE.length) {
          g.kind = SEQUENCE[g.i]!; g.i += 1; g.resolved = false; g.started = now;
          setBeat({ kind: g.kind }); setFlash(''); setProgress(0);
        }
        return;
      }
      const elapsed = now - g.started;
      setProgress(Math.min(1, elapsed / tune.window));
      if (elapsed > tune.window) resolve(false); // missed the window
    };
    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener('keydown', key); };
  }, [phase]);

  const result: FightResult = { opponent: setup.opponent, instigatedByPlayer: setup.instigatedByPlayer, playerHP, opponentHP: oppHP, familyId: setup.familyId };
  const outcome = decideOutcome(result);
  const act = (kind: BeatKind): void => (game.current as unknown as { act?: (k: BeatKind) => void }).act?.(kind);

  return (
    <div className="fight-backdrop" role="dialog" aria-modal="true" aria-label={`Fight with ${setup.opponent}`}>
      <section className={'fight-arena' + (flash ? ' fx-' + flash : '')}>
        <header>
          <div className="fight-side"><span>YOU</span><div className="fight-hp"><i style={{ width: playerHP + '%' }} /></div></div>
          <strong className="fight-vs">VS</strong>
          <div className="fight-side fight-side--opp"><span>{setup.opponent.toUpperCase()}</span><div className="fight-hp fight-hp--opp"><i style={{ width: oppHP + '%' }} /></div></div>
        </header>

        {phase === 'ready' && (
          <div className="fight-center">
            <p className="fight-kicker">{setup.instigatedByPlayer ? 'YOU STARTED THIS' : `${setup.opponent.toUpperCase()} SQUARED UP`}</p>
            <h2>{setup.instigatedByPlayer ? 'Bad idea.' : 'Defend yourself.'}</h2>
            <p className="fight-rule">{setup.instigatedByPlayer ? 'Throw the first punch and you lose — that’s how it always goes. Land what you can anyway.' : 'STRIKE the openings, DODGE the swings.'}</p>
            <p className="fight-controls">J / Space = STRIKE · K = DODGE</p>
            <button className="fight-go" onClick={() => setPhase('live')}>{setup.instigatedByPlayer ? 'Swing first' : 'Put ’em up'}</button>
          </div>
        )}

        {phase === 'live' && (
          <div className="fight-center">
            <div className={'fight-prompt' + (beat ? ' fight-prompt--' + beat.kind : '')}>
              {beat ? (beat.kind === 'strike' ? 'STRIKE!' : 'DODGE!') : '…'}
            </div>
            {beat && <div className="fight-timer"><i style={{ width: (1 - progress) * 100 + '%' }} /></div>}
            <div className="fight-buttons">
              <button className="fight-strike" onClick={() => act('strike')}>STRIKE<small>J</small></button>
              <button className="fight-dodge" onClick={() => act('dodge')}>DODGE<small>K</small></button>
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="fight-center">
            <p className="fight-kicker">{outcome === 'won' ? 'YOU WON' : 'YOU LOST'}</p>
            <h2>{outcome === 'won' ? 'You stood your ground.' : setup.instigatedByPlayer ? 'You started it. It ended you.' : 'They got the better of it.'}</h2>
            <p className="fight-rule">{setup.instigatedByPlayer && 'Starting a fight is starting a loss. Read the memory for the fallout.'}</p>
            <button className="fight-go" onClick={() => { onComplete(result); onClose(); }}>Live with it</button>
          </div>
        )}
        <button className="fight-close" aria-label="Leave the fight" onClick={onClose}>×</button>
      </section>
    </div>
  );
}
