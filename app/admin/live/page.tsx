'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  startRound, setQuestion, showOptions, startTimer,
  stopTimer, revealAnswer, updateTeamScore,
  nextTeam, resetGame, resetRound, setPhase, lockOption, selectTeam, verifyAdminPassword,
  saveMovieClip, deleteMovieClip
} from '@/app/actions';
import { useSocket } from '@/app/socket-provider';
import { kbcAudio } from '@/lib/kbc-audio';
import { hostVoice, VOICE_CLIPS } from '@/lib/host-voice';
import Link from 'next/link';
import { ROUND_BRANDS, TEAM_BRANDS, questionsPerTeam } from '@/lib/quiz-brand';

interface Question {
  id: number;
  round_number: number;
  text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  team_slot?: number | null;
}

interface Team {
  id: number;
  name: string;
  score: number;
}

const ROUND_DATA = Object.entries(ROUND_BRANDS).map(([num, r]) => ({
  num: Number(num),
  title: `${r.label}: ${r.hi}`,
  sub: r.name,
}));

export default function AdminLivePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('quiz_admin_session') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  if (!authenticated) {
    return (
      <div className="admin-auth-root">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await verifyAdminPassword(password)) {
              localStorage.setItem('quiz_admin_session', 'true');
              setAuthenticated(true);
            } else {
              setErr(true);
              setPassword('');
            }
          }}
          className="admin-auth-card"
        >
          <div className="auth-crest" />
          <h2>Quiz Master Control Room</h2>
          <p>Kalanjali 2026 · LJ University</p>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErr(false);
            }}
            placeholder="Password"
            autoFocus
            className={err ? 'input-error' : ''}
          />
          {err && <p className="error-msg">Incorrect password</p>}
          <button type="submit" className="btn-auth-enter">
            Enter Control Room
          </button>
          <Link href="/" className="back-link">
            ← Back to Home
          </Link>
        </form>
      </div>
    );
  }

  return <ControlRoom />;
}

function ControlRoom() {
  const { gameState: state } = useSocket();
  const [isPending, startTransition] = useTransition();
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'voice' | 'scores' | 'movie' | 'stage'>('voice');

  useEffect(() => {
    if (state?.current_round) {
      setSelectedRound(state.current_round);
    }
  }, [state?.current_round]);

  const act = (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        console.error('Action failed', e);
      }
    });
  };

  if (!state) {
    return (
      <div className="admin-loading-root">
        <div className="admin-loading-spinner" />
        <p>Loading quiz master desk…</p>
      </div>
    );
  }

  const allTeams: Team[] = state.all_teams || [];
  const allQuestions: Question[] = state.all_questions || [];
  const currentTeamId: number = state.current_team_id || 1;
  const phase: string = state.phase || 'idle';
  const currentQuestionId: number | null = state.current_question_id;

  const roundQuestions = allQuestions.filter((q) => q.round_number === selectedRound);
  const isMovieRound = selectedRound === 4;
  const perTeam = questionsPerTeam(selectedRound);

  const activeTeamIndex = Math.max(
    0,
    allTeams.findIndex((t) => t.id === currentTeamId)
  );

  const teamQuestions = isMovieRound
    ? roundQuestions.filter((q) => q.team_slot === activeTeamIndex + 1)
    : roundQuestions.slice(activeTeamIndex * perTeam, activeTeamIndex * perTeam + perTeam);

  const activeQuestion = allQuestions.find((q) => q.id === currentQuestionId) || teamQuestions[0];
  const activeQuestionIndex = teamQuestions.findIndex((q) => q.id === activeQuestion?.id);
  const activeTeam = allTeams.find((t) => t.id === currentTeamId) || allTeams[0];
  const totalForTeam = teamQuestions.length || perTeam;

  const isMCQ = selectedRound === 1 && activeQuestion?.option_a;
  const isVideo = activeQuestion?.media_type === 'video';
  const lockedOpt = state.locked_option;
  const showAns = !!state.show_answer;
  const isTimerRunning = phase === 'timer';

  return (
    <div className="admin-control-root">
      <header className="admin-top-header">
        <div className="header-left">
          <span className="header-brand">Kalanjali 2026 · Control Room</span>
        </div>
        <div className="header-right">
          <a href="/presentation" target="_blank" rel="noopener noreferrer" className="btn-open-stage">
            Open Projector Screen ↗
          </a>
          <Link href="/" className="header-link">Exit</Link>
        </div>
      </header>

      <div className="admin-round-bar">
        {ROUND_DATA.map((r) => (
          <button
            key={r.num}
            onClick={() => {
              setSelectedRound(r.num);
              act(() => startRound(r.num));
            }}
            className={`admin-round-btn ${selectedRound === r.num ? 'round-active' : ''}`}
          >
            <div className="r-text">
              <div className="r-title">{r.title}</div>
              <div className="r-desc">{r.sub}</div>
            </div>
            {selectedRound === r.num && <span className="active-dot">Active</span>}
          </button>
        ))}
      </div>

      <div style={{ padding: '1rem 2rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <span className="sub-tag" style={{ fontWeight: 600 }}>Teams on stage — click to switch whose turn it is</span>
          <span className="sub-tag">Each team plays {questionsPerTeam(selectedRound)} question{questionsPerTeam(selectedRound) === 1 ? '' : 's'} in a row</span>
        </div>

        <div className="admin-teams-grid">
          {allTeams.map((team, idx) => {
            const isActive = team.id === currentTeamId;
            return (
              <button
                key={team.id}
                onClick={() => act(() => selectTeam(team.id))}
                className={`admin-team-card ${isActive ? 'team-card-active' : ''}`}
              >
                <span className="team-num">Team {idx + 1}</span>
                <div className="team-card-name">{team.name}</div>
                <div className="sub-tag">{TEAM_BRANDS[idx % TEAM_BRANDS.length].name}</div>
                <div className="team-card-score">{team.score} pts</div>
                {isActive && <div className="active-badge">On stage</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="brutal-tag tag-yellow">{activeTeam?.name}&apos;s turn</span>
              <span className="brutal-tag tag-orange">
                Question {activeQuestionIndex >= 0 ? activeQuestionIndex + 1 : 1} of {totalForTeam}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {teamQuestions.map((q, idx) => {
                const isSelected = activeQuestion?.id === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => act(() => setQuestion(q.id))}
                    className="btn"
                    style={isSelected ? { background: 'var(--gold)', color: '#241a03', borderColor: 'var(--gold)' } : {}}
                  >
                    Q{idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lock-options-container" style={{ marginBottom: '1.5rem' }}>
            <div className="lock-header-row" style={{ marginBottom: '0.6rem' }}>
              <span>Question on stage</span>
            </div>
            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
              {activeQuestion?.media_url && (
                isVideo ? (
                  <video
                    src={activeQuestion.media_url}
                    controls
                    style={{ width: '260px', borderRadius: '10px', border: '1px solid var(--border)', flexShrink: 0 }}
                  />
                ) : (
                  <img
                    src={activeQuestion.media_url}
                    alt="Question picture"
                    style={{ width: '260px', borderRadius: '10px', border: '1px solid var(--border)', flexShrink: 0 }}
                  />
                )
              )}
              <div style={{ fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.5, color: 'var(--text)' }}>
                {activeQuestion ? activeQuestion.text : 'No question selected. Click Q1 above.'}
                {activeQuestion?.media_url && (
                  <div className="sub-tag" style={{ marginTop: '0.5rem' }}>
                    {isVideo ? 'This clip plays on the projector.' : 'This picture is shown on the projector.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isMCQ && (
            <div>
              <div className="lock-header-row">
                <span>Options — click one to lock it on screen</span>
                {lockedOpt && <span className="locked-opt-tag">Locked: {lockedOpt}</span>}
              </div>

              <div className="lock-btn-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem' }}>
                {[
                  { key: 'A', text: activeQuestion?.option_a },
                  { key: 'B', text: activeQuestion?.option_b },
                  { key: 'C', text: activeQuestion?.option_c },
                  { key: 'D', text: activeQuestion?.option_d },
                ].map((opt) => {
                  if (!opt.text) return null;
                  const isLocked = lockedOpt === opt.key;
                  const isCorrectAnswer = activeQuestion?.correct_answer === opt.key;

                  return (
                    <button
                      key={opt.key}
                      onClick={() => act(() => lockOption(opt.key))}
                      disabled={isPending || showAns}
                      className={`btn-lock-opt ${isLocked ? 'opt-active-lock' : ''}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.8rem', textAlign: 'left',
                        borderColor: isCorrectAnswer && !isLocked ? 'rgba(53,194,133,0.4)' : undefined,
                        background: isCorrectAnswer && !isLocked ? 'var(--success-dim)' : undefined,
                      }}
                    >
                      <span style={{ fontWeight: 700, opacity: 0.7 }}>{opt.key}</span>
                      <span style={{ flex: 1, fontWeight: 500 }}>{opt.text}</span>
                      {isCorrectAnswer && <span className="sub-tag" style={{ color: 'var(--success)' }}>Correct</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!isMCQ && activeQuestion?.correct_answer && (
            <div className="q-direct-ans-row" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="sub-tag" style={{ display: 'block', marginBottom: '0.2rem' }}>Correct answer (host reference)</span>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>
                  {activeQuestion.correct_answer}
                </span>
              </div>
              <span className="brutal-tag tag-green">Verbal answer</span>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <div className="reveal-header">Run the question — follow the steps in order</div>

            <div className="flow-step-grid">
              <button
                onClick={() => { if (activeQuestion) act(() => setQuestion(activeQuestion.id)); }}
                disabled={isPending || !activeQuestion}
                className="step-btn step-btn-accent"
              >
                <span className="step-num">Step 1</span>
                <span className="step-title">Show question</span>
              </button>

              <button
                onClick={() => act(showOptions)}
                disabled={isPending || !activeQuestion?.option_a}
                className="step-btn step-btn-gold"
              >
                <span className="step-num">Step 2</span>
                <span className="step-title">Show options</span>
              </button>

              {!isTimerRunning ? (
                <button onClick={() => act(startTimer)} disabled={isPending} className="step-btn step-btn-success">
                  <span className="step-num">Step 3</span>
                  <span className="step-title">Start 30s timer</span>
                </button>
              ) : (
                <button onClick={() => act(stopTimer)} disabled={isPending} className="step-btn step-btn-danger">
                  <span className="step-num">Timer running</span>
                  <span className="step-title">Stop timer</span>
                </button>
              )}

              <button
                onClick={() => {
                  const nextIdx = (activeQuestionIndex + 1) % totalForTeam;
                  const nextQ = teamQuestions[nextIdx];
                  if (nextQ) act(() => setQuestion(nextQ.id));
                }}
                disabled={isPending || teamQuestions.length < 2}
                className="step-btn"
              >
                <span className="step-num">Step 4</span>
                <span className="step-title">
                  Next question ({activeQuestionIndex + 2 <= totalForTeam ? `Q${activeQuestionIndex + 2}` : 'Q1'})
                </span>
              </button>
            </div>

            <div className="reveal-btn-grid">
              <button
                onClick={() => act(async () => { await revealAnswer(true); await updateTeamScore(currentTeamId, 10); })}
                disabled={isPending || showAns}
                className="btn-reveal-correct"
              >
                <span>Correct (+10 pts)</span>
                <small>Celebration + host voice</small>
              </button>

              <button
                onClick={() => act(async () => { await revealAnswer(false); })}
                disabled={isPending || showAns}
                className="btn-reveal-wrong"
              >
                <span>Wrong (0 pts)</span>
                <small>Reveal answer</small>
              </button>
            </div>

            {activeQuestionIndex === totalForTeam - 1 && (
              <div style={{
                marginTop: '1.2rem', background: 'var(--gold-dim)', border: '1px solid rgba(224,179,65,0.4)',
                borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <strong style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.05rem', color: 'var(--gold)' }}>
                    {activeTeam?.name} has reached question {totalForTeam} of {totalForTeam}
                  </strong>
                  <div className="sub-tag">Ready to advance to the next team on stage?</div>
                </div>
                <button onClick={() => act(nextTeam)} className="btn btn-gold">Switch to next team</button>
              </div>
            )}
          </div>
        </div>

        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="panel-tabs">
            <button onClick={() => setActiveTab('voice')} className={`panel-tab ${activeTab === 'voice' ? 'panel-tab-active' : ''}`}>
              Voice &amp; sounds
            </button>
            <button onClick={() => setActiveTab('scores')} className={`panel-tab ${activeTab === 'scores' ? 'panel-tab-active' : ''}`}>
              Manual score adjust
            </button>
            <button onClick={() => setActiveTab('movie')} className={`panel-tab ${activeTab === 'movie' ? 'panel-tab-active' : ''}`}>
              Movie clips (Round 4)
            </button>
            <button onClick={() => setActiveTab('stage')} className={`panel-tab ${activeTab === 'stage' ? 'panel-tab-active' : ''}`}>
              Leaderboard &amp; reset
            </button>
          </div>

          {activeTab === 'voice' && <VoicePanel />}

          {activeTab === 'movie' && (
            <MovieClipsPanel allTeams={allTeams} allQuestions={allQuestions} isPending={isPending} act={act} />
          )}

          {activeTab === 'scores' && (
            <div className="admin-teams-grid">
              {allTeams.map((team) => (
                <div key={team.id} className="admin-team-card" style={{ cursor: 'default' }}>
                  <div className="team-card-name">{team.name}</div>
                  <div className="team-card-score" style={{ marginBottom: '0.5rem' }}>{team.score} pts</div>
                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                    <button onClick={() => act(() => updateTeamScore(team.id, 10))} className="btn-pts btn-pts-plus">+10</button>
                    <button onClick={() => act(() => updateTeamScore(team.id, 5))} className="btn-pts" style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}>+5</button>
                    <button onClick={() => act(() => updateTeamScore(team.id, -5))} className="btn-pts btn-pts-minus">-5</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stage' && (
            <div style={{ display: 'grid', gap: '1.2rem' }}>
              <div className="advance-actions-container" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button onClick={() => act(() => setPhase('leaderboard'))} className="btn-show-lb">Show leaderboard on screen</button>
                <button onClick={() => act(() => setPhase('idle'))} className="btn btn-ghost">Return stage to idle</button>
              </div>

              <div>
                <div className="reveal-header">Reset one round — takes back that round&apos;s points and restarts it from Team 1</div>
                <div className="sound-fx-grid">
                  {ROUND_DATA.map((r) => {
                    const pts = Number(state.round_points?.[r.num] || 0);
                    return (
                      <button
                        key={r.num}
                        disabled={isPending}
                        className="btn-sfx"
                        style={{ textAlign: 'left' }}
                        onClick={() => {
                          const msg = `Reset ${r.title}?\n\n` +
                            (pts ? `${pts} points given in this round will be taken back from the teams.` : 'No points have been given in this round yet.') +
                            '\nThe round restarts from Team 1. Other rounds are not affected.';
                          if (confirm(msg)) act(() => resetRound(r.num));
                        }}
                      >
                        <div>Reset {ROUND_BRANDS[r.num].label}</div>
                        <div className="sub-tag">{pts ? `${pts} pts given` : 'No points yet'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span className="sub-tag">Reset entire quiz — all scores back to 0, start again from Round 1.</span>
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (confirm('Reset the ENTIRE quiz?\n\nAll team scores go back to 0 and the quiz restarts from Round 1, Team 1.')) {
                      act(resetGame);
                    }
                  }}
                  className="btn btn-danger"
                >
                  Reset entire quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MovieClipsPanel({
  allTeams, allQuestions, isPending, act,
}: {
  allTeams: Team[];
  allQuestions: Question[];
  isPending: boolean;
  act: (fn: () => Promise<void>) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="sub-tag" style={{ lineHeight: 1.5 }}>
        Add a ~30 second movie clip for each team, plus 1–2 questions about it (e.g. name the movie, name the actor).
        Paste a direct video link (a file ending in .mp4/.webm, or a Google Drive/Dropbox direct-download link) —
        there is no file upload here, so host the clip somewhere first and paste its link.
      </div>
      {allTeams.map((team, idx) => {
        const teamSlot = idx + 1;
        const existing = allQuestions.filter((q) => q.round_number === 4 && q.team_slot === teamSlot);
        return (
          <MovieClipEditor
            key={team.id}
            teamName={team.name}
            teamSlot={teamSlot}
            existing={existing}
            isPending={isPending}
            act={act}
          />
        );
      })}
    </div>
  );
}

function MovieClipEditor({
  teamName, teamSlot, existing, isPending, act,
}: {
  teamName: string;
  teamSlot: number;
  existing: Question[];
  isPending: boolean;
  act: (fn: () => Promise<void>) => void;
}) {
  const [videoUrl, setVideoUrl] = useState(existing[0]?.media_url || '');
  const [q1, setQ1] = useState(existing[0]?.text || '');
  const [a1, setA1] = useState(existing[0]?.correct_answer || '');
  const [q2, setQ2] = useState(existing[1]?.text || '');
  const [a2, setA2] = useState(existing[1]?.correct_answer || '');
  const [saved, setSaved] = useState(false);

  const hasClip = existing.length > 0;
  const canSave = videoUrl.trim() && q1.trim() && a1.trim();

  return (
    <div className="lock-options-container" style={{ marginBottom: 0 }}>
      <div className="lock-header-row">
        <span>{teamName}</span>
        {hasClip ? <span className="locked-opt-tag">Clip set</span> : <span className="sub-tag">No clip yet</span>}
      </div>
      <div style={{ display: 'grid', gap: '0.6rem' }}>
        <input
          type="text"
          placeholder="Video link (https://…mp4)"
          value={videoUrl}
          onChange={(e) => { setVideoUrl(e.target.value); setSaved(false); }}
          className="search-input"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <input
            type="text"
            placeholder="Question 1 (required)"
            value={q1}
            onChange={(e) => { setQ1(e.target.value); setSaved(false); }}
            className="search-input"
          />
          <input
            type="text"
            placeholder="Answer 1"
            value={a1}
            onChange={(e) => { setA1(e.target.value); setSaved(false); }}
            className="search-input"
          />
          <input
            type="text"
            placeholder="Question 2 (optional)"
            value={q2}
            onChange={(e) => { setQ2(e.target.value); setSaved(false); }}
            className="search-input"
          />
          <input
            type="text"
            placeholder="Answer 2"
            value={a2}
            onChange={(e) => { setA2(e.target.value); setSaved(false); }}
            className="search-input"
          />
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            disabled={isPending || !canSave}
            className="btn btn-primary"
            onClick={() => {
              const questions = [{ text: q1, correct: a1 }];
              if (q2.trim() && a2.trim()) questions.push({ text: q2, correct: a2 });
              act(() => saveMovieClip(teamSlot, videoUrl, questions));
              setSaved(true);
            }}
          >
            {hasClip ? 'Update clip' : 'Save clip'}
          </button>
          {hasClip && (
            <button
              disabled={isPending}
              className="btn btn-ghost"
              onClick={() => {
                if (confirm(`Remove ${teamName}'s movie clip?`)) {
                  act(() => deleteMovieClip(teamSlot));
                  setVideoUrl(''); setQ1(''); setA1(''); setQ2(''); setA2('');
                }
              }}
            >
              Remove
            </button>
          )}
          {saved && <span className="sub-tag" style={{ color: 'var(--success)' }}>Saved</span>}
        </div>
      </div>
    </div>
  );
}

function VoicePanel() {
  const [info, setInfo] = useState<ReturnType<typeof hostVoice.info> | null>(null);

  useEffect(() => {
    const refresh = () => hostVoice.loadClips().then(() => setInfo(hostVoice.info()));
    refresh();
    const t = setTimeout(refresh, 1500); // browsers load voice lists late
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {info && (
        <div className="lock-options-container" style={{ marginBottom: 0 }}>
          <div className="lock-header-row" style={{ marginBottom: '0.4rem' }}>
            <span>Host voice on this computer</span>
            <span className="locked-opt-tag" style={info.clips ? {} : { background: 'var(--surface)', color: 'var(--text-dim)' }}>
              Recorded clips: {info.clips} / {info.totalClips}
            </span>
          </div>
          <div style={{ fontSize: '0.95rem' }}>
            {info.voiceName}
            {info.natural ? ' · natural' : ''}
            {!info.male && <span style={{ color: 'var(--danger)' }}> · no male Hindi voice found</span>}
          </div>
          <div className="sub-tag" style={{ marginTop: '0.5rem', lineHeight: 1.5 }}>
            Most natural: open the projector screen in <b>Microsoft Edge</b> (uses the &quot;Madhur&quot; male Hindi voice).
            Most real: record your host saying each line and put the MP3s in <code>public/voice/</code> — they play instead of the computer voice.
            File names: {VOICE_CLIPS.map((k) => `${k}.mp3`).join(', ')}.
          </div>
        </div>
      )}
      <div className="sound-fx-grid">
        <button onClick={() => hostVoice.welcome()} className="btn-sfx">Welcome greeting</button>
        <button onClick={() => hostVoice.speakQuestion()} className="btn-sfx">Next question</button>
        <button onClick={() => hostVoice.speakLock('A')} className="btn-sfx">Lock option A</button>
        <button onClick={() => hostVoice.speakCorrect()} className="btn-sfx">Correct answer</button>
        <button onClick={() => hostVoice.speakWrong()} className="btn-sfx">Wrong answer</button>
        <button onClick={() => hostVoice.speakTimerStart()} className="btn-sfx">Timer starts</button>
        <button onClick={() => { kbcAudio.init(); kbcAudio.playIntro(); }} className="btn-sfx">Intro fanfare</button>
        <button onClick={() => { kbcAudio.init(); kbcAudio.playLock(); }} className="btn-sfx">Lock stinger</button>
      </div>
    </div>
  );
}
