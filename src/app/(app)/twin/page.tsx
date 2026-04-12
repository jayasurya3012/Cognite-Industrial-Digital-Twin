import PidTwinViewer from '@/components/PidTwinViewer';

export const metadata = {
  title: 'P&ID Twin | NPA Digital Twin',
  description: 'Interactive P&ID diagram with live sensor overlays for the HP Separation Train.',
};

export default function TwinPage() {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      <PidTwinViewer />
    </div>
  );
}
