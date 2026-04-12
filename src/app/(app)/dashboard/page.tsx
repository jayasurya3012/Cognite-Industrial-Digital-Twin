import OperationalCommandPanel from '@/components/OperationalCommandPanel';

export const metadata = {
  title: 'Operational Command | NPA Digital Twin',
  description: 'Live KPI monitoring, proactive safety alerts, and asset health for NPA HP Separation Train.',
};

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      <OperationalCommandPanel fullPage />
    </div>
  );
}
