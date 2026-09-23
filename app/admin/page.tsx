'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/app/socket-provider';
import Link from 'next/link';
import { verifyAdminPassword } from '@/app/actions';

export default function AdminHome() {
  const { gameState: state } = useSocket();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('quiz_admin_session') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await verifyAdminPassword(password)) {
      localStorage.setItem('quiz_admin_session', 'true');
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (!authenticated) {
    return (
      <div className="admin-auth-root">
        <form onSubmit={handleLogin} className="admin-auth-card">
          <div className="auth-crest" />
          <h2>Quiz Master Dashboard</h2>
          <p>KALANJALI 2026 · LJ UNIVERSITY</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            className={error ? 'input-error' : ''}
          />
          {error && <p className="error-msg">Incorrect password</p>}
          <button type="submit" className="btn-auth-enter">
            Enter Dashboard
          </button>
          <Link href="/" className="back-link">
            ← Back to Home
          </Link>
        </form>
      </div>
    );
  }

  const sortedTeams = state?.all_teams ? [...state.all_teams].sort((a: any, b: any) => b.score - a.score) : [];

  return (
    <div className="admin-control-root">
      <header className="admin-top-header">
        <div className="header-left">
          <span className="header-brand">Quiz Master Dashboard</span>
          <span className="live-pill">{state ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>
        <div className="header-right">
          <Link href="/" className="header-link">← Home</Link>
          <div className="v-divider" />
          <button
            onClick={() => { localStorage.removeItem('quiz_admin_session'); setAuthenticated(false); }}
            className="header-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="admin-main-grid">
        <div>
          <div className="admin-card">
            <div className="card-header"><h3>Current Status</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="sub-tag" style={{ marginBottom: '0.3rem' }}>ROUND</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)' }}>{state?.current_round || 1}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="sub-tag" style={{ marginBottom: '0.3rem' }}>TEAM</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{state?.current_team_name || '—'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="sub-tag" style={{ marginBottom: '0.3rem' }}>PHASE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>{state?.phase || 'idle'}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
            <Link href="/admin/live" className="admin-round-btn" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem' }}>
              <div className="r-title" style={{ fontSize: '1.15rem', marginBottom: '0.3rem' }}>Start / Control Quiz</div>
              <div className="r-desc">Open the live control room to run questions, timers, and scoring</div>
            </Link>
            <Link href="/admin/questions" className="admin-round-btn" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem' }}>
              <div className="r-title" style={{ fontSize: '1.15rem', marginBottom: '0.3rem' }}>Question Bank</div>
              <div className="r-desc">View and search all quiz questions</div>
            </Link>
          </div>
        </div>

        <div>
          <div className="admin-card">
            <div className="card-header"><h3>Scores</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {sortedTeams.length > 0 ? sortedTeams.map((team: any, idx: number) => (
                <div key={team.id} className="score-adjust-row" style={{
                  border: state?.current_team_id === team.id ? '1px solid rgba(224,179,65,0.4)' : '1px solid var(--border)',
                }}>
                  <div className="score-team-meta">
                    <span className="sub-tag">{idx + 1}.</span>
                    <strong>{team.name}</strong>
                  </div>
                  <span className="score-pts">{team.score}</span>
                </div>
              )) : (
                <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1.5rem' }}>Connecting...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
