'use client';
import { useEffect, useState } from 'react';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import { useRouter } from 'next/navigation';

export default function ProactiveAgentToaster() {
  const { proactiveAlerts } = useLiveTelemetry();
  const [activeToast, setActiveToast] = useState<{id: string, text: string, time: number} | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (proactiveAlerts.length > 0) {
      // Get the latest alert object
      const alert = proactiveAlerts[0];
      const alertId = alert.id; // unique string
      
      // Only pop toast if it's a new or different alert
      if (activeToast?.id !== alertId) {
        setActiveToast({
          id: alertId,
          text: alert.message,
          time: Date.now()
        });
      }
    } else {
      setActiveToast(null);
    }
  }, [proactiveAlerts, activeToast]);

  if (!activeToast) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 30,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.95)', // Slate 900
      border: '1px solid #f59e0b',
      borderLeft: '4px solid #f59e0b',
      borderRadius: 12,
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 10px 40px rgba(0,0,0,0.6), 0 0 20px rgba(245, 158, 11, 0.2)',
      backdropFilter: 'blur(10px)',
      animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'pointer'
    }} onClick={() => router.push('/twin?focus=V-101')}>
      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        color: '#f59e0b',
        padding: '8px',
        borderRadius: '50%',
        display: 'flex'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>Background Agent Alert</h4>
          <span style={{ fontSize: '0.6rem', color: '#000', background: '#f59e0b', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>TRACK 2</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1', maxWidth: 400, lineHeight: 1.4 }}>
          {activeToast.text}
        </p>
      </div>

      <div style={{ paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
        <button style={{
          background: 'transparent',
          border: '1px solid #f59e0b',
          color: '#f59e0b',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: '0.7rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}>
          Investigate
        </button>
      </div>
    </div>
  );
}
