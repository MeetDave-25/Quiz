'use client';

import Link from 'next/link';
import { EVENT, ROUND_BRANDS, TEAM_BRANDS, questionsPerTeam } from '@/lib/quiz-brand';
import { useLang, LangSwitcher } from '@/lib/i18n';

export default function LandingPage() {
  const { t } = useLang();

  return (
    <div className="lj-root">
      <div className="lj-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div className="lj-univ-badge" style={{ marginBottom: 0 }}>
            <span className="lj-univ-icon">LJ</span>
            <div>
              <div className="lj-univ-name">{EVENT.university}</div>
              <div className="lj-univ-sub">{t('landing.subBadge', EVENT.city, EVENT.festival)}</div>
            </div>
          </div>
          <LangSwitcher />
        </div>

        <div className="lj-hero-img">
          <img src={EVENT.opening} alt={`${EVENT.festival} — ${EVENT.title}`} />
        </div>

        <div className="lj-hero-section">
          <h1 className="lj-event-name">{t('landing.title')}</h1>
          <p className="lj-subtitle">{t('landing.subtitle', EVENT.coordinator)}</p>
        </div>

        <div className="lj-portals">
          <Link href="/presentation" className="lj-portal lj-portal-display">
            <div className="lj-portal-badge">{t('landing.stageBadge')}</div>
            <h2 className="lj-portal-label">{t('landing.stageLabel')}</h2>
            <p className="lj-portal-desc">{t('landing.stageDesc')}</p>
            <div className="lj-portal-btn"><span>{t('landing.stageBtn')}</span><span>→</span></div>
          </Link>

          <Link href="/admin/live" className="lj-portal lj-portal-admin">
            <div className="lj-portal-badge">{t('landing.adminBadge')}</div>
            <h2 className="lj-portal-label">{t('landing.adminLabel')}</h2>
            <p className="lj-portal-desc">{t('landing.adminDesc')}</p>
            <div className="lj-portal-btn"><span>{t('landing.adminBtn')}</span><span>→</span></div>
          </Link>
        </div>

        <div className="lj-rounds-section">
          <div className="lj-rounds-heading">{t('landing.roundsHeading')}</div>
          <div className="lj-rounds-grid">
            {Object.entries(ROUND_BRANDS).map(([num, r]) => (
              <div key={num} className="lj-round-card">
                <img src={r.banner} alt={r.label} />
                <div className="lj-round-body">
                  <div className="round-card-num">{r.label}</div>
                  <div className="round-card-name">{r.hi}</div>
                  <div className="round-card-meta">{r.name} · {t('landing.perTeam', questionsPerTeam(Number(num)))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lj-rounds-section">
          <div className="lj-rounds-heading">{t('landing.teamsHeading')}</div>
          <div className="lj-team-grid">
            {TEAM_BRANDS.map((tm, i) => (
              <div key={tm.name} className="lj-team-card">
                <img src={tm.banner} alt={tm.name} />
                <div className="lj-team-body">
                  <span className="round-card-num">{t('landing.team')} {i + 1}</span>
                  <b>{tm.name}</b>
                  <small>{tm.hi}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="lj-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div className="footer-title">{EVENT.university} · {EVENT.city}</div>
            <div className="footer-sub">
              {EVENT.festival} · {t('landing.footerJoin')} <Link href="/team" className="lj-inline-link">/team</Link>
            </div>
          </div>
          <div className="footer-sub" style={{ textAlign: 'right' }}>{EVENT.credit}</div>
        </footer>
      </div>
    </div>
  );
}
