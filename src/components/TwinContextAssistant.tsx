'use client';

import { useMemo, useState } from 'react';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';

type TwinContextAssistantProps = {
  selectedAsset: string | null;
  onSelectAsset: (assetId: string | null) => void;
};

type TwinChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const DOC_LINKS: Record<string, string> = {
  'SOP-MAINT-001': '/docs/SOP-MAINT-001.pdf',
  'SOP-MAINT-010': '/docs/SOP-MAINT-010.pdf',
  'SOP-OPS-001': '/docs/SOP-OPS-001.pdf',
  'SOP-OPS-002': '/docs/SOP-OPS-002.pdf',
  'SOP-OPS-010': '/docs/SOP-OPS-010.pdf',
  'SOP-ENV-001': '/docs/SOP-ENV-001.pdf',
  'SOP-SAFE-001': '/docs/SOP-SAFE-001.pdf',
  'MAN-MECH-001': '/docs/MAN-MECH-001.pdf',
  'MAN-INST-001': '/docs/MAN-INST-001.pdf',
  'RPT-INSPECT-001': '/docs/RPT-INSPECT-001.pdf',
  'PID-NPA-001': '/docs/PID-NPA-001.pdf',
  'NPA-ESD-CEF-001': '/docs/NPA-ESD-CEF-001.pdf',
};

const ASSET_TAGS = [
  { tag: 'V-101', sceneId: 'V-101', contextId: 'AREA-HP-SEP:V-101', label: 'HP Separator' },
  { tag: 'V-102', sceneId: 'V-102', contextId: 'AREA-HP-SEP:V-102', label: 'Test Separator' },
  { tag: 'E-101', sceneId: 'E-101', contextId: 'AREA-HP-SEP:E-101', label: 'Wellstream Heater' },
  { tag: 'E-102', sceneId: 'E-102', contextId: 'AREA-HP-SEP:E-102', label: 'Glycol Reboiler' },
  { tag: 'P-101', sceneId: 'P-101A', contextId: 'AREA-HP-SEP:P-101', label: 'Drain Pumps' },
  { tag: 'P-101A', sceneId: 'P-101A', contextId: 'AREA-HP-SEP:P-101', label: 'Drain Pump A' },
  { tag: 'P-101B', sceneId: 'P-101B', contextId: 'AREA-HP-SEP:P-101', label: 'Drain Pump B' },
  { tag: 'PCV-101', sceneId: 'PCV-101', contextId: 'AREA-HP-SEP:V-101', label: 'Pressure Control Valve' },
  { tag: 'LCV-101', sceneId: 'LCV-101', contextId: 'AREA-HP-SEP:V-101', label: 'Level Control Valve' },
] as const;

function detectAssetTag(text: string) {
  const upper = text.toUpperCase();
  return ASSET_TAGS.find(asset => upper.includes(`@${asset.tag}`) || upper.includes(asset.tag)) || null;
}

function getContextId(sceneId: string | null) {
  if (!sceneId) return '';
  return ASSET_TAGS.find(asset => asset.sceneId === sceneId)?.contextId || '';
}

function formatReading(value: number, unit?: string) {
  return `${value.toFixed(2)}${unit ? ` ${unit}` : ''}`;
}

function buildAssetSummary(asset: any) {
  if (!asset) return '';
  const readings = asset.sensors.slice(0, 6).map((sensor: any) =>
    `${sensor.sensor_id}: ${formatReading(sensor.value, sensor.unit)} (${sensor.status})`
  );
  return `${asset.name}\n${readings.join('\n')}`;
}

function renderInlineMessage(content: string, keyPrefix: string) {
  const parts = content.split(/(\[[A-Z]+-[A-Z]+-\d+(?:#[^\]\s]*)?\]|\*\*.*?\*\*|`.*?`)/g).filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith('[') && part.endsWith(']')) {
      const citation = part.slice(1, -1);
      const [baseId, fragment] = citation.split('#');
      const href = DOC_LINKS[baseId];

      if (href) {
        return (
          <a
            key={key}
            href={`${href}${fragment ? `#${fragment}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              margin: '0 2px',
              color: '#93c5fd',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            {baseId}
          </a>
        );
      }
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} style={{ color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

export default function TwinContextAssistant({ selectedAsset, onSelectAsset }: TwinContextAssistantProps) {
  const { assetHealth } = useLiveTelemetry();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [messages, setMessages] = useState<TwinChatMessage[]>([
    {
      role: 'assistant',
      content: 'Tag an asset like @V-101 or @P-101A. I will focus it in 3D and answer with its current context.',
    },
  ]);

  const selectedAssetData = useMemo(
    () => assetHealth.find(asset => asset.asset_id === getContextId(selectedAsset)) || null,
    [assetHealth, selectedAsset]
  );

  const quickAssets = ASSET_TAGS.filter((asset, index, all) =>
    all.findIndex(item => item.sceneId === asset.sceneId) === index
  );
  const mentionMatches = ASSET_TAGS.filter(asset => asset.tag.toLowerCase().includes(mentionQuery.toLowerCase()));

  const focusAsset = (sceneId: string) => {
    onSelectAsset(sceneId);
    setOpen(true);
    const asset = assetHealth.find(item => item.asset_id === getContextId(sceneId));
    if (!asset) return;

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Focused ${asset.name} in the 3D view.\n${buildAssetSummary(asset)}`,
      },
    ]);
  };

  const resetView = () => {
    onSelectAsset(null);
  };

  const insertMention = (tag: string) => {
    setInput(prev => prev.replace(/@([a-zA-Z0-9-]*)$/, `@${tag} `));
    setMentionQuery('');
  };

  const detectSceneFromText = (text: string) => {
    const match = detectAssetTag(text);
    return match?.sceneId || null;
  };

  const handleInput = (val: string) => {
    setInput(val);
    const cursor = val.lastIndexOf('@');
    if (cursor !== -1) {
      const query = val.slice(cursor + 1);
      // Only show suggestions if '@' is at start or after a space
      if (cursor === 0 || val[cursor - 1] === ' ') {
        setMentionQuery(query);
        return;
      }
    }
    setMentionQuery('');
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const assetTag = detectAssetTag(text);
    if (assetTag) {
      onSelectAsset(assetTag.sceneId);
      setOpen(true);
    }

    const userMessage = { role: 'user' as const, content: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.slice(-6), userMessage].map(message => ({
            role: message.role,
            content: message.content,
          })),
          assetContext: assetTag?.contextId || getContextId(selectedAsset) || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
      }

      const responseSceneId = detectSceneFromText(data.content || '') || assetTag?.sceneId || null;
      if (responseSceneId) {
        onSelectAsset(responseSceneId);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content || 'No response generated.',
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.message || 'Failed to get a response.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(value => !value)}
        style={{
          position: 'absolute',
          right: 18,
          bottom: 18,
          zIndex: 30,
          border: '1px solid rgba(120,180,255,0.35)',
          background: 'rgba(7,12,20,0.92)',
          color: '#dbeafe',
          borderRadius: 999,
          padding: '10px 14px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        {open ? 'Close Asset Chat' : 'Open Asset Chat'}
      </button>

      <button
        onClick={resetView}
        style={{
          position: 'absolute',
          right: 170,
          bottom: 18,
          zIndex: 30,
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(7,12,20,0.9)',
          color: '#e2e8f0',
          borderRadius: 999,
          padding: '10px 14px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
          fontSize: '0.72rem',
          fontWeight: 700,
        }}
      >
        Reset View
      </button>

      {selectedAssetData && (
        <div
          style={{
            position: 'absolute',
            top: 18,
            right: open ? 340 : 18,
            zIndex: 25,
            width: 240,
            background: 'rgba(8,13,22,0.94)',
            border: '1px solid rgba(120,180,255,0.2)',
            borderRadius: 12,
            padding: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            transition: 'right 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Focused Asset
              </div>
              <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700, marginTop: 2 }}>
                {selectedAssetData.name}
              </div>
            </div>
            <button onClick={resetView} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>×</button>
          </div>
          <div style={{ display: 'grid', gap: 4, marginTop: 10 }}>
            {selectedAssetData.sensors.map(sensor => (
              <div
                key={sensor.sensor_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: '0.64rem',
                  padding: '4px 6px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{sensor.sensor_id}</span>
                <span style={{ color: (sensor.status === 'GOOD' ? '#fff' : '#fbbf24'), fontWeight: 600 }}>{formatReading(sensor.value, sensor.unit)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            bottom: 84,
            width: 310,
            zIndex: 28,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(6, 11, 19, 0.98)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 16,
            boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 700 }}>Twin Intelligence Hub</div>
              <div style={{ fontSize: '0.58rem', color: '#64748b', marginTop: 1 }}>Real-time contextual dialogue</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>

          <div style={{ display: 'flex', gap: 5, padding: '10px 12px 6px', flexWrap: 'wrap' }}>
            {quickAssets.map(asset => (
              <button
                key={`${asset.sceneId}-${asset.tag}`}
                onClick={() => focusAsset(asset.sceneId)}
                style={{
                  border: '1px solid rgba(120,180,255,0.18)',
                  background: 'rgba(120,180,255,0.06)',
                  color: '#93c5fd',
                  borderRadius: 6,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(120,180,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(120,180,255,0.06)'}
              >
                @{asset.tag}
              </button>
            ))}
          </div>

          {mentionQuery && mentionMatches.length > 0 && (
            <div style={{ position: 'absolute', bottom: 110, left: 12, right: 12, zIndex: 40 }}>
              <div style={{
                background: 'rgba(13,20,33,0.98)',
                border: '1px solid rgba(59,130,246,0.5)',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
              }}>
                <div style={{ padding: '6px 10px', fontSize: '0.58rem', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Asset Suggestions
                </div>
                {mentionMatches.slice(0, 5).map(asset => (
                  <button
                    key={`mention-${asset.tag}`}
                    onClick={() => insertMention(asset.tag)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 10px',
                      border: 'none',
                      background: 'transparent',
                      color: '#e5eefb',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      fontSize: '0.68rem',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 700, color: '#60a5fa' }}>@{asset.tag}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.62rem' }}>{asset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  padding: '8px 10px',
                  borderRadius: message.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  background: message.role === 'user' ? 'linear-gradient(135deg, #2563eb, #1e4ed8)' : 'rgba(255,255,255,0.04)',
                  color: message.role === 'user' ? '#fff' : '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.72rem',
                  lineHeight: 1.45,
                  boxShadow: message.role === 'user' ? '0 4px 12px rgba(37,99,235,0.2)' : 'none',
                  border: message.role === 'assistant' ? '1px solid rgba(255,255,255,0.03)' : 'none'
                }}
              >
                {renderInlineMessage(message.content, `${message.role}-${index}`)}
              </div>
            ))}
            {loading && (
              <div style={{ fontSize: '0.68rem', color: 'var(--t3)' }}>Thinking...</div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <textarea
              value={input}
              onChange={event => handleInput(event.target.value)}
              onKeyDown={event => {
                if (mentionQuery && mentionMatches.length > 0 && event.key === 'Enter') {
                  event.preventDefault();
                  insertMention(mentionMatches[0].tag);
                  return;
                }
                if (event.key === 'Escape') {
                  setMentionQuery('');
                  return;
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about @V-101, @P-101A, flow, alarms, maintenance..."
              rows={3}
              style={{
                width: '100%',
                resize: 'none',
                border: '1px solid rgba(120,180,255,0.16)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--t1)',
                borderRadius: 12,
                padding: '10px 12px',
                outline: 'none',
                fontSize: '0.74rem',
                lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--t3)' }}>
                {selectedAssetData ? `Focused: ${selectedAssetData.name}` : 'No asset selected'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={resetView}
                  style={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#e2e8f0',
                    borderRadius: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                  style={{
                    border: 'none',
                    background: loading || !input.trim() ? 'rgba(120,180,255,0.18)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '8px 12px',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
