'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import TwinContextAssistant from '@/components/TwinContextAssistant';

const FOCUS_MAP: Record<string, string> = {
  'V-101': 'AREA-HP-SEP:V-101',
  'V-102': 'AREA-HP-SEP:V-102',
  'E-101': 'AREA-HP-SEP:E-101',
  'E-102': 'AREA-HP-SEP:E-102',
  'P-101': 'AREA-HP-SEP:P-101',
  'P-101A': 'AREA-HP-SEP:P-101',
  'P-101B': 'AREA-HP-SEP:P-101',
  'LCV-101': 'LCV-101',
  'PCV-101': 'PCV-101',
  'SDV-101': 'SDV-101',
  'SDV-102': 'SDV-102',
  'SDV-201': 'SDV-201',
  'PSV-101': 'PSV-101',
};

function normalizeFocus(value: string | null) {
  if (!value) return null;
  return FOCUS_MAP[value] || value;
}

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
  const focus = normalizeFocus(searchParams?.get('focus') || null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(focus);

  useEffect(() => {
    setSelectedAsset(focus);
  }, [focus]);

  return (
    <div style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      <DigitalTwinEngine focusedAsset={selectedAsset} />
      <TwinContextAssistant selectedAsset={selectedAsset} onSelectAsset={setSelectedAsset} />
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
