import Link from 'next/link';
import { EVENT, ROUND_BRANDS, TEAM_BRANDS } from '@/lib/quiz-brand';

export default function LandingPage() {
  return (
    <div className="lj-root">
      <div className="lj-container">
        <div className="lj-univ-badge">
          <span className="lj-univ-icon">LJ</span>
          <div>
            <div className="lj-univ-name">{EVENT.university}</div>
            <div className="lj-univ-sub">{EVENT.city} · {EVENT.festival}</div>
          </div>
        </div>

        <div className="lj-hero-img">
          <img src={EVENT.opening} alt={`${EVENT.festival} — ${EVENT.title}`} />
        </div>

        <div className="lj-hero-section">
          <h1 className="lj-event-name">GK Quiz Competition</h1>
          <p className="lj-subtitle">
            5 teams · 4 rounds · live scoring on the big screen. Coordinated by {EVENT.coordinator}.
          </p>
        </div>

        <div className="lj-portals">
          <Link href="/presentation" className="lj-portal lj-portal-display">
            <div className="lj-portal-badge">For the projector</div>
            <h2 className="lj-portal-label">Stage Display</h2>
            <p className="lj-portal-desc">
              Full-screen KBC-style show for the hall: questions, picture rounds, the 30-second timer, and live scores.
            </p>
            <div className="lj-portal-btn"><span>Open Stage Display</span><span>→</span></div>
          </Link>

          <Link href="/admin/live" className="lj-portal lj-portal-admin">
            <div className="lj-portal-badge">For the quiz master · password</div>
            <h2 className="lj-portal-label">Control Room</h2>
            <p className="lj-portal-desc">
              Run the quiz step by step — pick the team and question, reveal options, start the timer, award points.
            </p>
            <div className="lj-portal-btn"><span>Enter Control Room</span><span>→</span></div>
          </Link>
        </div>

        <div className="lj-rounds-section">
          <div className="lj-rounds-heading">Competition rounds</div>
          <div className="lj-rounds-grid">
            {Object.entries(ROUND_BRANDS).map(([num, r]) => (
              <div key={num} className="lj-round-card">
                <img src={r.banner} alt={r.label} />
                <div className="lj-round-body">
                  <div className="round-card-num">{r.label}</div>
                  <div className="round-card-name">{r.hi}</div>
                  <div className="round-card-meta">{r.name} · 5 questions per team</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lj-rounds-section">
          <div className="lj-rounds-heading">Teams on stage</div>
          <div className="lj-team-grid">
            {TEAM_BRANDS.map((t, i) => (
              <div key={t.name} className="lj-team-card">
                <img src={t.banner} alt={t.name} />
                <div className="lj-team-body">
                  <span className="round-card-num">Team {i + 1}</span>
                  <b>{t.name}</b>
                  <small>{t.hi}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="lj-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div className="footer-title">{EVENT.university} · {EVENT.city}</div>
            <div className="footer-sub">
              {EVENT.festival} · Team members can join from their phones at <Link href="/team" className="lj-inline-link">/team</Link>
            </div>
          </div>
          <div className="footer-sub" style={{ textAlign: 'right' }}>{EVENT.credit}</div>
        </footer>
      </div>
    </div>
  );
}
