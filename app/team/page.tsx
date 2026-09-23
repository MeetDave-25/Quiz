'use client';

import { useState } from 'react';
import { useSocket } from '@/app/socket-provider';

export default function TeamScreen() {
  const { socket, gameState: state, isConnected } = useSocket();
  const [teamId, setTeamId] = useState<number | null>(null);

  if (!isConnected || !state) {
    return (
      <div className="team-login-root">
        <h2 style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Connecting…</h2>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="team-login-root">
        <div className="team-login-card">
          <h1 className="team-login-title">Join as your team</h1>
          <div className="team-login-list">
            {[1, 2, 3, 4, 5].map(id => {
              const t = state.all_teams?.find((team: any) => team.id === id);
              return (
                <button key={id} className="team-login-btn" onClick={() => setTeamId(id)}>
                  {t ? t.name : `Team ${id}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const team = state.all_teams?.find((t: any) => t.id === teamId);
  const isMyTurn = state.current_team_id === teamId;
  const inBuzzerMode = state.phase === 'buzzer_mode';
  const iBuzzed = state.phase === 'buzzer_locked' && state.buzzed_team_id === teamId;
  const someoneElseBuzzed = state.phase === 'buzzer_locked' && state.buzzed_team_id !== teamId;

  const handleBuzz = () => {
    if (inBuzzerMode && socket) {
      socket.emit('team:buzz', teamId);
    }
  };

  return (
    <div className="team-shell">
      <header className="team-header">
        <div className="team-header-name">{team?.name}</div>
        <div className="team-header-score">{team?.score} pts</div>
        <button onClick={() => setTeamId(null)} className="team-leave-btn">Leave</button>
      </header>

      <div className="team-body">
        <div className={`team-status-banner ${
          isMyTurn && state.phase === 'timer' ? 'team-status-timer'
          : isMyTurn && state.phase === 'question' ? 'team-status-turn'
          : inBuzzerMode ? 'team-status-buzzer'
          : iBuzzed ? 'team-status-won'
          : someoneElseBuzzed ? 'team-status-lost'
          : ''
        }`}>
          {isMyTurn && state.phase === 'question' && <span>It&apos;s your turn — get ready</span>}
          {isMyTurn && state.phase === 'timer' && (
            <span>Answer now — {Math.max(0, Math.ceil((state.timer_duration || 30) - Number(state.timer_elapsed_seconds || 0)))}s left</span>
          )}
          {!isMyTurn && !inBuzzerMode && state.phase !== 'buzzer_locked' && <span>Waiting for your turn…</span>}
          {inBuzzerMode && <span>Buzzer active — press now</span>}
          {iBuzzed && <span>You buzzed first!</span>}
          {someoneElseBuzzed && <span>Too late — another team buzzed</span>}
        </div>

        {['question', 'options', 'timer', 'answered', 'answered_correct', 'answered_wrong', 'buzzer_mode', 'buzzer_locked'].includes(state.phase) && state.question_text && (
          <div className="team-question-card">
            <div className="team-question-label">Current question</div>
            <div className="team-question-text">{state.question_text}</div>

            {state.current_round === 1 && ['options', 'timer', 'answered', 'answered_correct', 'answered_wrong', 'buzzer_mode', 'buzzer_locked'].includes(state.phase) && (
              <div className="team-options">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const isLocked = state.locked_option === opt;
                  const isCorrect = state.show_answer && state.correct_answer === opt;
                  const cls = isCorrect ? 'team-option-correct' : isLocked ? 'team-option-locked' : '';
                  return (
                    <div key={opt} className={`team-option ${cls}`}>
                      <strong>{opt}</strong>
                      {opt === 'A' ? state.option_a : opt === 'B' ? state.option_b : opt === 'C' ? state.option_c : state.option_d}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(inBuzzerMode || iBuzzed) && (
          <div className="buzzer-wrap">
            <button
              onClick={handleBuzz}
              disabled={!inBuzzerMode}
              className={`buzzer-btn ${inBuzzerMode ? 'buzzer-btn-active' : 'buzzer-btn-inactive'}`}
            >
              Buzz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
