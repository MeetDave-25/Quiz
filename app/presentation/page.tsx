'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '@/app/socket-provider';
import { kbcAudio } from '@/lib/kbc-audio';
import { hostVoice } from '@/lib/host-voice';
import { EVENT, TEAM_BRANDS, roundBrand, teamBrand } from '@/lib/quiz-brand';
import './stage.css';

interface Team {
  id: number;
  name: string;
  score: number;
}

type OverlayData =
  | { kind: 'round'; round: number }
  | { kind: 'team'; teamId: number }
  | { kind: 'correct'; team: string }
  | { kind: 'wrong'; answer: string };
type Overlay = OverlayData & { id: number };

const OVERLAY_MS: Record<Overlay['kind'], number> = { round: 4200, team: 3200, correct: 4200, wrong: 4200 };
const EXIT_MS = 450;

function TimerRing({ left, total }: { left: number; total: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? left / total : 0;
  const cls = left <= 5 ? 'st-timer-crit' : left <= 10 ? 'st-timer-warn' : '';
  return (
    <div className={`st-timer ${cls}`}>
      <svg viewBox="0 0 108 108">
        <circle className="track" cx="54" cy="54" r={r} />
        <circle className="bar" cx="54" cy="54" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <div className="st-timer-num">{left}</div>
    </div>
  );
}

export default function PresentationScreen() {
  const { gameState: state } = useSocket();
  const [audioReady, setAudioReady] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [queue, setQueue] = useState<Overlay[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [bumps, setBumps] = useState<Record<number, { delta: number; key: number }>>({});

  const prev = useRef<{
    phase?: string; round?: number; team?: number; locked?: string | null; shown?: boolean; scores?: Record<number, number>;
  } | null>(null);

  const nextId = useRef(0);
  const push = useCallback((o: OverlayData) => setQueue((q) => [...q, { ...o, id: ++nextId.current }]), []);

  // Play overlays one after another
  const overlay = queue[0];
  useEffect(() => {
    if (!overlay) return;
    const ms = OVERLAY_MS[overlay.kind];
    const hold = setTimeout(() => setLeaving(true), ms);
    const next = setTimeout(() => { setLeaving(false); setQueue((q) => q.slice(1)); }, ms + EXIT_MS);
    return () => { clearTimeout(hold); clearTimeout(next); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay?.id]);

  const enableAudio = () => {
    kbcAudio.init();
    setAudioReady(true);
    kbcAudio.playIntro();
    if (voiceOn) setTimeout(() => hostVoice.welcome(), 700);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // React to state changes: overlays, sounds, and host voice
  useEffect(() => {
    if (!state) return;
    const teams: Team[] = state.all_teams || [];
    const scores = Object.fromEntries(teams.map((t) => [t.id, t.score]));
    const p = prev.current;

    // First load: remember current state without replaying anything
    if (!p) {
      prev.current = {
        phase: state.phase, round: state.current_round, team: state.current_team_id,
        locked: state.locked_option, shown: !!state.show_answer, scores,
      };
      return;
    }

    if (state.current_round && state.current_round !== p.round) {
      push({ kind: 'round', round: state.current_round });
      if (audioReady) {
        kbcAudio.playIntro();
        if (voiceOn) setTimeout(() => hostVoice.speakRound(state.current_round), 600);
      }
    }

    if (state.current_team_id && state.current_team_id !== p.team) {
      push({ kind: 'team', teamId: state.current_team_id });
      // On a round change the round announcement plays instead
      if (audioReady && voiceOn && state.current_round === p.round) {
        const idx = teams.findIndex((t) => t.id === state.current_team_id);
        setTimeout(() => hostVoice.speakTeamTurn(state.current_team_name || '', Math.max(idx, 0)), 800);
      }
    }

    if (state.phase === 'question' && p.phase !== 'question' && audioReady) {
      kbcAudio.playQuestion();
      if (voiceOn) setTimeout(() => hostVoice.speakQuestion(), 500);
    }

    if (state.phase === 'options' && p.phase !== 'options' && audioReady) kbcAudio.playOption();

    if (state.phase === 'timer' && p.phase !== 'timer' && audioReady) {
      kbcAudio.startClock();
      if (voiceOn) hostVoice.speakTimerStart();
    }
    if (state.phase !== 'timer') kbcAudio.stopClock();

    if (state.locked_option && state.locked_option !== p.locked && audioReady) {
      kbcAudio.playLock();
      if (voiceOn) setTimeout(() => hostVoice.speakLock(state.locked_option), 350);
    }

    if (state.show_answer && !p.shown) {
      const correct = state.phase === 'answered_wrong'
        ? false
        : state.phase === 'answered_correct'
          ? true
          : state.locked_option === state.correct_answer;
      if (correct) {
        push({ kind: 'correct', team: state.current_team_name || '' });
        if (audioReady) {
          kbcAudio.playCorrect();
          if (voiceOn) setTimeout(() => hostVoice.speakCorrect(), 600);
        }
      } else {
        push({ kind: 'wrong', answer: state.correct_answer || '' });
        if (audioReady) {
          kbcAudio.playWrong();
          if (voiceOn) setTimeout(() => hostVoice.speakWrong(state.correct_answer), 600);
        }
      }
    }

    // Floating "+10" on a team podium when its score changes
    const changed: Record<number, { delta: number; key: number }> = {};
    for (const t of teams) {
      const before = p.scores?.[t.id];
      if (before != null && before !== t.score) changed[t.id] = { delta: t.score - before, key: Date.now() };
    }
    if (Object.keys(changed).length) setBumps((b) => ({ ...b, ...changed }));

    prev.current = {
      phase: state.phase, round: state.current_round, team: state.current_team_id,
      locked: state.locked_option, shown: !!state.show_answer, scores,
    };
  }, [state, audioReady, voiceOn, push]);

  // Timer: time-up cue fires once per countdown
  const duration = state?.timer_duration || 30;
  const timeLeft = state?.phase === 'timer' && state?.timer_elapsed_seconds != null
    ? Math.max(0, Math.ceil(duration - Number(state.timer_elapsed_seconds)))
    : duration;
  const timeUpFired = useRef(false);
  useEffect(() => {
    if (state?.phase !== 'timer') { timeUpFired.current = false; return; }
    if (timeLeft === 0 && !timeUpFired.current && audioReady) {
      timeUpFired.current = true;
      kbcAudio.playTimeUp();
      if (voiceOn) hostVoice.speakTimeUp();
    }
  }, [timeLeft, state?.phase, audioReady, voiceOn]);

  const allTeams: Team[] = state?.all_teams || [];
  const sortedTeams = [...allTeams].sort((a, b) => b.score - a.score);
  const currentTeamId = state?.current_team_id;
  const currentRound = state?.current_round || 1;
  const round = roundBrand(currentRound);
  const brand = teamBrand(allTeams, currentTeamId);
  const phase: string = state?.phase || 'idle';
  const lockedOpt = state?.locked_option;
  const showAns = !!state?.show_answer;
  const correctAns = state?.correct_answer;
  const isMCQ = currentRound === 1 && !!state?.option_a;
  const optionsVisible = isMCQ && phase !== 'question';
  const media: string | null = state?.media_url || null;

  const qIndex = (() => {
    const qs = (state?.all_questions || []).filter((q: { round_number: number }) => q.round_number === currentRound);
    const i = qs.findIndex((q: { id: number }) => q.id === state?.current_question_id);
    return i >= 0 ? (i % 5) + 1 : null;
  })();

  return (
    <div className="stage">
      <div className="stage-rays" />
      <div className="stage-vignette" />

      <header className="st-header">
        <div className="st-brand">
          <div className="st-crest">LJ</div>
          <div>
            <div className="st-brand-name">{EVENT.university} · {EVENT.city}</div>
            <div className="st-brand-sub">{EVENT.festival} · {EVENT.title}</div>
          </div>
        </div>

        <div className="st-round-pill">
          <b>{round.label}</b>
          <span>{round.hi}</span>
        </div>

        <div className="st-controls">
          {!audioReady
            ? <button onClick={enableAudio} className="st-ctrl">Enable sound</button>
            : <span className="st-ctrl st-ctrl-on">Sound on</span>}
          <button onClick={() => { hostVoice.setEnabled(!voiceOn); setVoiceOn(!voiceOn); }} className={`st-ctrl ${voiceOn ? 'st-ctrl-on' : ''}`}>
            Voice {voiceOn ? 'on' : 'off'}
          </button>
          <button onClick={toggleFullscreen} className="st-ctrl" title="Fullscreen">{isFullscreen ? 'Exit full' : 'Fullscreen'}</button>
        </div>
      </header>

      <nav className="st-teams">
        {allTeams.map((team, idx) => {
          const b = TEAM_BRANDS[idx % TEAM_BRANDS.length];
          const bump = bumps[team.id];
          return (
            <div key={team.id} className={`st-pod ${team.id === currentTeamId ? 'st-pod-active' : ''}`}>
              <img src={b.banner} alt="" />
              <div>
                <div className="st-pod-name">{team.name}</div>
                <div className="st-pod-sub">{b.name}</div>
              </div>
              <div className="st-pod-score">{team.score}</div>
              {bump && (
                <span key={bump.key} className={`st-bump ${bump.delta < 0 ? 'st-bump-neg' : ''}`}>
                  {bump.delta > 0 ? `+${bump.delta}` : bump.delta}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      <main className="st-arena">
        {phase === 'leaderboard' ? (
          <div className="st-board">
            <h2>Leaderboard</h2>
            {sortedTeams.map((team, i) => {
              const idx = allTeams.findIndex((t) => t.id === team.id);
              const b = TEAM_BRANDS[idx % TEAM_BRANDS.length];
              const max = Math.max(1, sortedTeams[0]?.score || 1);
              return (
                <div key={team.id} className={`st-row ${i === 0 ? 'st-row-first' : ''}`} style={{ animationDelay: `${i * 180}ms` }}>
                  <div className="st-row-bar" style={{ width: `${(team.score / max) * 100}%`, animationDelay: `${300 + i * 180}ms` }} />
                  <div className="st-row-rank">#{i + 1}</div>
                  <img src={b.banner} alt="" />
                  <div className="st-row-name">{team.name}<small>{b.name} · {b.hi}</small></div>
                  <div className="st-row-score">{team.score}</div>
                </div>
              );
            })}
          </div>
        ) : !state?.current_question_id || phase === 'idle' ? (
          <div className="st-idle">
            <div className="st-idle-frame"><div><img src={EVENT.opening} alt={EVENT.festival} /></div></div>
            <div className="st-idle-next">
              <small>अब मंच पर · Now on stage</small>
              <b>{state?.current_team_name || 'Team 1'} · {brand.name}</b>
            </div>
          </div>
        ) : (
          <div className="st-q-stage" key={state.current_question_id}>
            <div className="st-meta">
              <div className="st-onstage">
                <img src={brand.banner} alt="" />
                <div>
                  <small>ON STAGE</small>
                  <b>{state.current_team_name}</b>
                </div>
              </div>
              {qIndex && <div className="st-qcount">QUESTION {qIndex} / 5</div>}
              <TimerRing left={timeLeft} total={duration} />
            </div>

            {media ? (
              <>
                {currentRound !== 2 && <div className="st-prompt">{state.question_text}</div>}
                <div className="st-media"><img src={media} alt="Question" /></div>
              </>
            ) : (
              <div className="st-rail">
                <div className="st-loz st-question">
                  <div className="st-loz-inner"><p>{state.question_text}</p></div>
                </div>
              </div>
            )}

            {isMCQ && (
              <div className="st-options" key={optionsVisible ? 'shown' : 'hidden'}>
                {(['A', 'B', 'C', 'D'] as const).map((key, i) => {
                  const text = state[`option_${key.toLowerCase()}`];
                  if (!text) return null;
                  const isLocked = lockedOpt === key;
                  const isCorrect = showAns && correctAns === key;
                  const isWrong = showAns && isLocked && correctAns !== key;
                  const cls = !optionsVisible ? 'st-opt-hidden'
                    : isCorrect ? 'st-opt-correct'
                    : isWrong ? 'st-opt-wrong'
                    : isLocked ? 'st-opt-locked'
                    : (lockedOpt || showAns) ? 'st-opt-dim' : '';
                  return (
                    <div key={key} className={`st-loz st-opt ${cls}`} style={{ animationDelay: `${i * 380}ms` }}>
                      <div className="st-loz-inner">
                        <span className="st-opt-key">{key}</span>
                        <span className="st-opt-text">{text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isMCQ && (showAns ? (
              <div className="st-loz st-answer">
                <div className="st-loz-inner">
                  <small>उत्तर</small>
                  <b>{correctAns}</b>
                </div>
              </div>
            ) : (
              <div className="st-waiting">टीम जवाब दे — quiz master will reveal the answer</div>
            ))}
          </div>
        )}
      </main>

      {overlay && (
        <div className={`st-overlay ${leaving ? 'st-overlay-out' : ''}`} key={overlay.id}>
          {overlay.kind === 'round' && (() => {
            const r = roundBrand(overlay.round);
            return (
              <>
                <div className="st-overlay-label">{r.label} · {r.name}</div>
                <div className="st-overlay-img"><img src={r.banner} alt={r.label} /></div>
                <div className="st-overlay-title">{r.hi}</div>
              </>
            );
          })()}
          {overlay.kind === 'team' && (() => {
            const b = teamBrand(allTeams, overlay.teamId);
            const t = allTeams.find((x) => x.id === overlay.teamId);
            return (
              <>
                <div className="st-overlay-label">अब मंच पर · Now on stage</div>
                <div className="st-overlay-img"><img src={b.banner} alt={b.name} /></div>
                <div className="st-overlay-title">{t?.name}<small>{b.name} · {b.hi}</small></div>
              </>
            );
          })()}
          {overlay.kind === 'correct' && (
            <>
              <div className="st-ring" /><div className="st-ring" />
              <div className="st-verdict st-verdict-good">सही जवाब!</div>
              <div className="st-verdict-sub"><b>{overlay.team}</b> · +10 अंक</div>
            </>
          )}
          {overlay.kind === 'wrong' && (
            <>
              <div className="st-ring st-ring-bad" />
              <div className="st-verdict st-verdict-bad">गलत जवाब</div>
              <div className="st-verdict-sub">सही उत्तर: <b>{overlay.answer}</b></div>
            </>
          )}
        </div>
      )}

      <footer className="st-footer">
        <span>{EVENT.university} · {EVENT.festival} · Coordinator: {EVENT.coordinator}</span>
        <span>{EVENT.credit}</span>
      </footer>
    </div>
  );
}
