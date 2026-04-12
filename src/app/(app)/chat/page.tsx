import StatefulChatPanel from '@/components/StatefulChatPanel';

export const metadata = {
  title: 'AI Agent | NPA Digital Twin',
  description: 'Stateful AI assistant with maintenance history memory and source citations.',
};

export default function ChatPage() {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* @ts-expect-error fullPage is a valid prop defined in StatefulChatPanel */}
      <StatefulChatPanel fullPage />
    </div>
  );
}
