'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';

const ICONS = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  twin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  chat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Command',   sub: 'KPIs & Alerts',  track: 'T2', tc: 'track2' },
  { href: '/twin',      icon: 'twin',      label: 'Digital Twin', sub: 'Live 3D Viewer',  track: 'T1', tc: 'track1' },
  { href: '/chat',      icon: 'chat',      label: 'AI Agent',  sub: 'Stateful Memory',track: 'T3', tc: 'track3' },
] as const;

function SidebarStatus() {
  const { proactiveAlerts, loading } = useLiveTelemetry();
  const hasAlert = proactiveAlerts.length > 0;
  return (
    <div className="sidebar-footer">
      <div style={{ fontSize: '0.6rem', color: 'var(--t3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
        Platform
      </div>
      {[
        { dot: hasAlert ? 'alarm' : 'good', label: 'HP Separation Train' },
        { dot: !loading ? 'good' : 'offline', label: 'Supabase · 3.07M rows' },
        { dot: 'good', label: 'Groq AI · Online' },
      ].map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
          <div className={`status-dot ${s.dot}`} />
          <span style={{ fontSize: '0.7rem', color: 'var(--t2)' }}>{s.label}</span>
        </div>
      ))}
      {hasAlert && (
        <div style={{
          marginTop: 12, padding: '8px 10px',
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 8, fontSize: '0.68rem', color: 'var(--trip)', fontWeight: 600,
          lineHeight: 1.4,
        }}>
          {proactiveAlerts.length} active alert{proactiveAlerts.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo">NPA</div>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--t1)', lineHeight: 1.2 }}>Platform Alpha</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--t3)', marginTop: 2 }}>North Sea · Block 14/29</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div style={{ fontSize: '0.6rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, padding: '4px 4px 10px', marginTop: 4 }}>
          Navigation
        </div>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (pathname === '/' && item.href === '/dashboard');
          return (
            <Link key={item.href} href={item.href} className={`sidebar-item ${active ? 'active' : ''}`}>
              <div className="sidebar-item-icon" style={{ color: active ? 'var(--blue)' : 'var(--t3)' }}>
                {ICONS[item.icon]}
              </div>
              <div className="sidebar-item-text">
                <div className="sidebar-item-label">{item.label}</div>
                <div className="sidebar-item-sub">{item.sub}</div>
              </div>
              <span className={`track-badge ${item.tc}`} style={{ fontSize: '0.5rem', padding: '1px 5px' }}>{item.track}</span>
            </Link>
          );
        })}
      </nav>

      <SidebarStatus />
    </aside>
  );
}
