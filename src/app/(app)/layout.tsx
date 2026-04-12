import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import Sidebar from '@/components/Sidebar';
import ProactiveAgentToaster from '@/components/ProactiveAgentToaster';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'NPA Digital Twin | North Sea Platform Alpha',
  description: 'Stateful & Proactive Digital Twin Dashboard for the HP Production Separation Train.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`app-shell ${inter.variable}`}>
      <Sidebar />
      <div className="page-content">
        {children}
      </div>
      <ProactiveAgentToaster />
    </div>
  );
}
