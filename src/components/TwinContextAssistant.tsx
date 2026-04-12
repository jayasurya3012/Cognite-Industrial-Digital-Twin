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
            right: open ? 392 : 18,
            zIndex: 25,
            width: 280,
            background: 'rgba(8,13,22,0.92)',
            border: '1px solid rgba(120,180,255,0.28)',
            borderRadius: 14,
            padding: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,0.32)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Focused Asset
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--t1)', fontWeight: 700, marginTop: 6 }}>
            {selectedAssetData.name}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--t3)', marginTop: 2 }}>
            {selectedAssetData.asset_id}
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
            {selectedAssetData.sensors.map(sensor => (
              <div
                key={sensor.sensor_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: '0.68rem',
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <span style={{ color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace' }}>{sensor.sensor_id}</span>
                <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{formatReading(sensor.value, sensor.unit)}</span>
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
            bottom: 72,
            width: 356,
            zIndex: 28,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(7,12,20,0.96)',
            border: '1px solid rgba(120,180,255,0.28)',
            borderRadius: 18,
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(18px)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--t1)', fontWeight: 700 }}>3D Context Chat</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--t3)', marginTop: 3 }}>
              Tag assets to focus the twin and pull contextual answers.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, padding: '10px 12px 0', flexWrap: 'wrap' }}>
            {quickAssets.map(asset => (
              <button
                key={`${asset.sceneId}-${asset.tag}`}
                onClick={() => focusAsset(asset.sceneId)}
                style={{
                  border: '1px solid rgba(120,180,255,0.22)',
                  background: 'rgba(120,180,255,0.08)',
                  color: 'var(--blue)',
                  borderRadius: 999,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                }}
              >
                @{asset.tag}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: message.role === 'user' ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'rgba(255,255,255,0.05)',
                  color: '#f8fafc',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.76rem',
                  lineHeight: 1.55,
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
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
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
