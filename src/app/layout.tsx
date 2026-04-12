import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'NPA Digital Twin | North Sea Platform Alpha Field Manager Dashboard',
  description:
    'Stateful & Proactive Digital Twin Dashboard for the HP Production Separation Train. Real-time telemetry from 3.07M sensor readings, AI-powered anomaly detection, and contextual maintenance intelligence.',
  keywords: ['digital twin', 'offshore platform', 'field management', 'predictive maintenance', 'SCADA'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
