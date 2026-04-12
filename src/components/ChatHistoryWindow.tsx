'use client';

import { useEffect, useState } from 'react';

type MemoryRecord = {
  content?: string;
  text?: string;
  chunks?: Array<{
    content?: string;
  }>;
  metadata?: {
    role?: string;
    timestamp?: number;
  };
};

function cleanHistoryContent(content: string) {
  return content
    .replace(/^NPA AI responded:\s*/i, '')
    .replace(/^User asked:\s*/i, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[([A-Z]+-[A-Z]+-\d+(?:#[^\]\s]*)?)\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractContent(item: MemoryRecord) {
  const chunkText = item.chunks?.map(chunk => chunk.content || '').filter(Boolean).join('\n\n');
  const raw = item.content || item.text || chunkText || JSON.stringify(item);
  return cleanHistoryContent(raw);
}

function formatMemoryTime(timestamp?: number) {
  if (!timestamp) return 'Unknown time';

  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatHistoryWindow() {
  const [history, setHistory] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch('/api/memory');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Request failed: ${res.status}`);
        }

        if (active) {
          setHistory(Array.isArray(data.history) ? data.history : []);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load chat history.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">
        <div>
          <h1 style={{ fontSize: '0.9rem' }}>Chat History</h1>
          <div style={{ fontSize: '0.6rem', color: 'var(--t3)', marginTop: 2 }}>
            Supermemory archive
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {loading && <div className="chat-bubble assistant">Loading history...</div>}
        {!loading && error && <div className="chat-bubble assistant">{error}</div>}
        {!loading && !error && history.length === 0 && (
          <div className="chat-bubble assistant">No prior chat history found yet.</div>
        )}

        {!loading && !error && history.map((item, index) => {
          const content = extractContent(item);
          const role = item.metadata?.role === 'user' ? 'user' : 'assistant';

          return (
            <div
              key={`${item.metadata?.timestamp || index}-${index}`}
              style={{ alignSelf: role === 'user' ? 'flex-end' : 'flex-start', width: '92%', maxWidth: '92%' }}
            >
              <div style={{ fontSize: '0.62rem', color: 'var(--t3)', marginBottom: 5, paddingLeft: 2 }}>
                {role === 'user' ? 'You' : 'NPA AI'} · {formatMemoryTime(item.metadata?.timestamp)}
              </div>
              <div className={`chat-bubble ${role}`}>{content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
