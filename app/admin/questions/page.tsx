'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSocket } from '@/app/socket-provider';

interface Question {
  id: number;
  round_number: number;
  text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
}

const ROUND_LABELS: Record<number, string> = {
  1: 'Round 1: General MCQ',
  2: 'Round 2: Direct Answer',
  3: 'Round 3: Visual / Photo',
  4: 'Round 4: Rapid Fire',
};

export default function QuestionBank() {
  const { gameState } = useSocket();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(false);
  const [filterRound, setFilterRound] = useState<number | 'All'>('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') === 'true') {
      setAuthenticated(true);
    }
  }, []);

  if (!authenticated) {
    return (
      <div className="admin-auth-root">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password === 'admin123') {
              localStorage.setItem('admin_auth', 'true');
              setAuthenticated(true);
            } else {
              setErr(true);
              setPassword('');
            }
          }}
          className="admin-auth-card"
        >
          <div className="auth-crest" />
          <h2>Question Bank</h2>
          <p>Kalanjali 2026 · Confidential questions & answers</p>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErr(false);
            }}
            placeholder="Admin password"
            autoFocus
            className={err ? 'input-error' : ''}
          />
          {err && <p className="error-msg">Incorrect password</p>}
          <button type="submit" className="btn-auth-enter">
            Unlock
          </button>
          <Link href="/" className="back-link">
            ← Back to Home
          </Link>
        </form>
      </div>
    );
  }

  const questions: Question[] = gameState?.all_questions || [];

  const filtered = questions.filter((q) => {
    const matchesRound = filterRound === 'All' || q.round_number === filterRound;
    const matchesSearch =
      !search ||
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      (q.correct_answer && q.correct_answer.toLowerCase().includes(search.toLowerCase())) ||
      (q.option_a && q.option_a.toLowerCase().includes(search.toLowerCase()));
    return matchesRound && matchesSearch;
  });

  return (
    <div className="questions-root">
      <header className="questions-header">
        <div>
          <h1 className="questions-title">Question Bank</h1>
          <p className="questions-subtitle">Kalanjali 2026 · LJ University · {questions.length} questions loaded</p>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <Link href="/admin/live" className="btn btn-primary">Go to control room</Link>
          <Link href="/admin" className="btn btn-ghost">Exit</Link>
        </div>
      </header>

      <div className="questions-filters">
        <input
          type="text"
          placeholder="Search question text or answers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <div className="filter-row">
          {(['All', 1, 2, 3, 4] as const).map((r) => (
            <button
              key={String(r)}
              onClick={() => setFilterRound(r)}
              className={`filter-btn ${filterRound === r ? 'filter-btn-active' : ''}`}
            >
              {r === 'All' ? 'All rounds' : `Round ${r}`}
            </button>
          ))}
        </div>
      </div>

      <div className="questions-count">
        Showing {filtered.length} of {questions.length} questions
      </div>

      <div className="questions-grid">
        {filtered.map((q, idx) => (
          <div key={q.id} className="question-tile">
            <div>
              <div className="question-tile-top">
                <span className="question-tile-round">
                  {ROUND_LABELS[q.round_number] || `Round ${q.round_number}`}
                </span>
                <span className="question-tile-idx">#{idx + 1}</span>
              </div>

              <p className="question-tile-text">{q.text}</p>

              {q.option_a && (
                <div className="question-tile-options">
                  {[
                    { k: 'A', t: q.option_a },
                    { k: 'B', t: q.option_b },
                    { k: 'C', t: q.option_c },
                    { k: 'D', t: q.option_d },
                  ].map((opt) => (
                    <div
                      key={opt.k}
                      className={`question-tile-opt ${q.correct_answer === opt.k ? 'question-tile-opt-correct' : ''}`}
                    >
                      <strong>{opt.k}</strong> {opt.t}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="question-tile-footer">
              <span className="question-tile-footer-label">Correct answer</span>
              <span className="question-tile-footer-answer">{q.correct_answer}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
