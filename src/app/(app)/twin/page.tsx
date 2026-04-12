'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import TwinChatPanel from '@/components/TwinChatPanel';

const DigitalTwinEngine = dynamic<any>(() => import('@/components/twin3d/Scene'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 50%, #0d1f35 0%, #060b14 100%)', height: '100%' }}>
      <div style={{ textAlign: 'center', color: 'var(--t3)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚙️</div>
        <div style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>Loading 3D Engine...</div>
      </div>
    </div>
  ),
});

// No metadata export allowed in Client Components

function TwinDashboardEngine() {
  const searchParams = useSearchParams();
  const focus = searchParams?.get('focus');
  const [filter, setFilter] = useState('RT');
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* 3D Dashboard Time Filter Overlay */}
      <div style={{ position: 'absolute', top: 20, zIndex: 10, alignSelf: 'center', width: '100%', display: 'flex', justifyContent: 'center' }}>
         <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: 24, border: '1px solid var(--border-blue)', padding: 4, backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
           {['RT', '1H', '24H', '7D', 'ALL'].map(f => (
             <button 
               key={f} 
               onClick={() => setFilter(f)} 
               style={{ 
                 padding: '6px 14px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 600, border: 'none',
                 background: filter === f ? '#00d4ff' : 'transparent',
                 color: filter === f ? '#000' : 'var(--t3)',
                 transition: 'all 0.2s',
               }}>
                 {f === 'RT' ? 'Real-Time' : f === '1H' ? 'Past 1H' : f === '24H' ? 'Past 24H' : f === '7D' ? 'Past 7D' : 'All History'}
             </button>
           ))}
         </div>
      </div>

      {/* Floating Chat Button */}
      <button 
        onClick={() => setChatOpen(!chatOpen)}
        style={{
          position: 'absolute', bottom: 24, right: 24, zIndex: 50,
          background: chatOpen ? '#00d4ff' : 'rgba(10, 14, 23, 0.8)',
          color: chatOpen ? '#000' : '#00d4ff',
          border: '1px solid rgba(0, 212, 255, 0.4)', borderRadius: 30, padding: '10px 20px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: 8
        }}
      >
        <span>{chatOpen ? '✖ Close AI' : '✦ AI Agent'}</span>
      </button>

      {/* Slide-out Chat Panel */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 400, height: '100%',
        transform: chatOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 40, background: '#0a0e17', borderLeft: '1px solid var(--border)',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'
      }}>
         <TwinChatPanel fullPage />
      </div>

      <DigitalTwinEngine focusedAsset={focus} timeFilter={filter} />
    </div>
  );
}

export default function TwinPage() {
  return (
    <Suspense fallback={<div style={{color:'white'}}>Loading...</div>}>
       <TwinDashboardEngine />
    </Suspense>
  )
}
