'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import OperationalCommandPanel from '@/components/OperationalCommandPanel';
import StatefulChatPanel from '@/components/StatefulChatPanel';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';

// Dynamic import for 3D viewer — prevents SSR issues with Three.js
const DigitalTwinViewer = dynamic(() => import('@/components/DigitalTwinViewer'), {
  ssr: false,
  loading: () => (
    <div className="panel" style={{ alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 50%, #0d1f35 0%, #060b14 100%)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚙️</div>
        <div style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>Loading 3D Engine...</div>
      </div>
    </div>
  ),
});

function LiveClock() {
  const [time, setTime] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' }) + ' UTC');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  // Render nothing on server to avoid SSR/client timestamp mismatch
  if (!mounted) return <span className="timestamp" suppressHydrationWarning>--:--:-- UTC</span>;
  return <span className="timestamp" suppressHydrationWarning>{time}</span>;
}

function PlatformStatusBadge() {
  const { proactiveAlerts, loading } = useLiveTelemetry();
  const hasTrip = proactiveAlerts.some(a => a.severity === 'CRITICAL');
  const hasAlarm = proactiveAlerts.some(a => a.severity === 'WARNING');

  if (loading) return <div className="platform-status"><div className="status-dot unknown" />Connecting...</div>;
  if (hasTrip) return <div className="platform-status" style={{ color: 'var(--color-trip)' }}><div className="status-dot trip" />CRITICAL ALERT</div>;
  if (hasAlarm) return <div className="platform-status" style={{ color: 'var(--color-alarm)' }}><div className="status-dot alarm" />ALARM ACTIVE</div>;
  return <div className="platform-status"><div className="status-dot good" />Platform Operational</div>;
}

export default function ThreePanelDashboard() {
  return (
    <div className="dashboard-root">
      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <div className="logo">NPA</div>
          <div>
            <h1>North Sea Platform Alpha — Digital Twin</h1>
            <div className="subtitle">HP Separation Train · Deck A · Block 14/29 · Field Manager Console</div>
          </div>
        </div>

        <div className="header-right">
          {/* Innovation Track badges */}
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Removed Track Labels */}
          </div>
          <PlatformStatusBadge />
          <LiveClock />
        </div>
      </header>

      {/* ── Three-Panel Layout ── */}
      <main className="three-panel">
        {/* Panel 1: Operational Command Dashboard */}
        <OperationalCommandPanel />

        {/* Panel 2: 3D Visual Twin (Three.js) */}
        <DigitalTwinViewer />

        {/* Panel 3: Stateful AI Chat (Groq) */}
        <StatefulChatPanel />
      </main>
    </div>
  );
}
