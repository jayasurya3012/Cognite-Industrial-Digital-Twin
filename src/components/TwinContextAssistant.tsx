'use client';

import { useMemo, useState } from 'react';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';

type TwinContextAssistantProps = {
  selectedAsset: string | null;
  onSelectAsset: (assetId: string) => void;
};

type TwinChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const ASSET_TAGS = [
  { tag: 'V-101', assetId: 'AREA-HP-SEP:V-101', label: 'HP Separator' },
  { tag: 'V-102', assetId: 'AREA-HP-SEP:V-102', label: 'Test Separator' },
  { tag: 'E-101', assetId: 'AREA-HP-SEP:E-101', label: 'Wellstream Heater' },
  { tag: 'E-102', assetId: 'AREA-HP-SEP:E-102', label: 'Glycol Reboiler' },
  { tag: 'P-101', assetId: 'AREA-HP-SEP:P-101', label: 'Drain Pumps' },
  { tag: 'P-101A', assetId: 'AREA-HP-SEP:P-101', label: 'Drain Pump A' },
  { tag: 'P-101B', assetId: 'AREA-HP-SEP:P-101', label: 'Drain Pump B' },
  { tag: 'PCV-101', assetId: 'AREA-HP-SEP:V-101', label: 'Pressure Control Valve' },
  { tag: 'LCV-101', assetId: 'AREA-HP-SEP:V-101', label: 'Level Control Valve' },
] as const;

function detectAssetTag(text: string) {
  const upper = text.toUpperCase();
  return ASSET_TAGS.find(asset => upper.includes(`@${asset.tag}`) || upper.includes(asset.tag)) || null;
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
    () => assetHealth.find(asset => asset.asset_id === selectedAsset) || null,
    [assetHealth, selectedAsset]
  );

  const quickAssets = ASSET_TAGS.filter((asset, index, all) =>
    all.findIndex(item => item.assetId === asset.assetId) === index
  );

  const focusAsset = (assetId: string) => {
    onSelectAsset(assetId);
    const asset = assetHealth.find(item => item.asset_id === assetId);
    if (!asset) return;

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Focused ${asset.name} in the 3D view.\n${buildAssetSummary(asset)}`,
      },
    ]);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const assetTag = detectAssetTag(text);
    if (assetTag) {
      onSelectAsset(assetTag.assetId);
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
          assetContext: assetTag?.assetId || selectedAsset || '',
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
                key={asset.assetId}
                onClick={() => focusAsset(asset.assetId)}
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
                {message.content.replace(/\*\*(.*?)\*\*/g, '$1')}
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
      )}
    </>
  );
}
