'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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

function TwinDashboardEngine() {
  const searchParams = useSearchParams();
  const focus = searchParams?.get('focus');

  return (
    <div style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      <DigitalTwinEngine focusedAsset={focus} />
    </div>
  );
}

export default function TwinPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: 32 }}>Loading...</div>}>
      <TwinDashboardEngine />
    </Suspense>
  );
}
