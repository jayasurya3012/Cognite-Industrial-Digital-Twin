'use client';

import { useState, useRef } from 'react';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import type { LiveSensorReading } from '@/lib/types';

// Asset positions within the SVG coordinate space (from digital_twin_clean.json)
// These map asset IDs to approximate positions as % of SVG viewport for overlay badges
const ASSET_OVERLAYS: Array<{
  id: string;
  label: string;
  shortId: string;
  xPct: number; // % from left
  yPct: number; // % from top
  sensorIds: string[];
}> = [
  { id: 'AREA-HP-SEP:V-101', shortId: 'V-101', label: 'HP Production Separator', xPct: 36, yPct: 52, sensorIds: ['V-101-PRESS', 'V-101-LEVEL', 'V-101-TEMP'] },
  { id: 'AREA-HP-SEP:P-101', shortId: 'P-101A/B', label: 'HP Drain Pumps', xPct: 28, yPct: 76, sensorIds: ['P-101-VIB'] },
  { id: 'AREA-HP-SEP:E-101', shortId: 'E-101', label: 'Wellstream Heater', xPct: 16, yPct: 52, sensorIds: ['E-101-TEMP'] },
  { id: 'AREA-HP-SEP:V-102', shortId: 'V-102', label: 'Test Separator', xPct: 80, yPct: 76, sensorIds: ['V-102-PRESS', 'V-102-LEVEL'] },
  { id: 'AREA-HP-SEP:E-102', shortId: 'E-102', label: 'HP Glycol Reboiler', xPct: 84, yPct: 28, sensorIds: [] },
];

const STATUS_COLOR: Record<string, string> = {
  GOOD: '#22d3a5',
  ALARM: '#f59e0b',
  TRIP: '#ef4444',
  OFFLINE: '#6b7280',
  UNKNOWN: '#6b7280',
};

function getAssetStatus(assetId: string, readings: LiveSensorReading[]): string {
  const assetReadings = readings.filter(r => r.asset_id === assetId);
  if (assetReadings.length === 0) return 'UNKNOWN';
  if (assetReadings.some(r => r.status === 'TRIP')) return 'TRIP';
  if (assetReadings.some(r => r.status === 'ALARM')) return 'ALARM';
  if (assetReadings.some(r => r.status === 'OFFLINE')) return 'OFFLINE';
  return 'GOOD';
}

function getKeyReading(sensorIds: string[], readings: LiveSensorReading[]): LiveSensorReading | null {
  for (const sid of sensorIds) {
    const r = readings.find(r => r.sensor_id === sid);
    if (r) return r;
  }
  return null;
}

interface AssetOverlayProps {
  overlay: typeof ASSET_OVERLAYS[0];
  readings: LiveSensorReading[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

function AssetOverlay({ overlay, readings, selected, onSelect }: AssetOverlayProps) {
  const status = getAssetStatus(overlay.id, readings);
  const color = STATUS_COLOR[status];
  const isSelected = selected === overlay.id;
  const keyReading = getKeyReading(overlay.sensorIds, readings);
  const isAlarm = status === 'ALARM' || status === 'TRIP';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${overlay.xPct}%`,
        top: `${overlay.yPct}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        cursor: 'pointer',
      }}
      onClick={() => onSelect(isSelected ? null : overlay.id)}
    >
      {/* Pulse ring for alarms */}
      {isAlarm && (
        <div style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          animation: 'pid-pulse 1.5s infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Main badge */}
      <div style={{
        background: isSelected ? `${color}22` : 'rgba(6,11,20,0.88)',
        border: `1.5px solid ${color}`,
        borderRadius: 8,
        padding: '4px 8px',
        minWidth: 70,
        textAlign: 'center',
        boxShadow: `0 0 ${isAlarm ? 16 : 8}px ${color}${isAlarm ? '55' : '33'}`,
        transition: 'all 0.2s',
      }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.2 }}>
          {overlay.shortId}
        </div>
        {keyReading && (
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
            {keyReading.value.toFixed(1)} {keyReading.unit}
          </div>
        )}
        <div style={{
          fontSize: '0.52rem', fontWeight: 700, marginTop: 2, padding: '1px 5px',
          background: `${color}22`, borderRadius: 4, color, letterSpacing: '0.06em',
        }}>
          {status}
        </div>
      </div>
    </div>
  );
}

function AssetDetailCard({ assetId, readings, onClose }: { assetId: string; readings: LiveSensorReading[]; onClose: () => void }) {
  const overlay = ASSET_OVERLAYS.find(o => o.id === assetId);
  if (!overlay) return null;
  const assetReadings = readings.filter(r => r.asset_id === assetId);
  const status = getAssetStatus(assetId, readings);
  const color = STATUS_COLOR[status];

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 12,
      width: 260,
      background: 'rgba(9,18,32,0.95)',
      border: `1px solid ${color}`,
      borderRadius: 12,
      padding: 16,
      zIndex: 20,
      backdropFilter: 'blur(12px)',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${color}22`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color }}>{overlay.shortId}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{overlay.label}</div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2,
        }}>✕</button>
      </div>

      {assetReadings.length === 0 ? (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
          No live sensor data
        </div>
      ) : (
        assetReadings.map(r => {
          const sc = STATUS_COLOR[r.status] || STATUS_COLOR.UNKNOWN;
          return (
            <div key={r.sensor_id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{r.sensor_id}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{r.sensor_type}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: sc, fontFamily: 'JetBrains Mono, monospace' }}>
                  {r.value.toFixed(1)} <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>{r.unit}</span>
                </div>
                <div style={{ fontSize: '0.55rem', color: sc, fontWeight: 600 }}>{r.status}</div>
              </div>
            </div>
          );
        })
      )}

      <div style={{ marginTop: 10, fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
        [timeseries.csv] · [sensor_metadata.csv]
      </div>
    </div>
  );
}

export default function PidTwinViewer() {
  const { readings, proactiveAlerts, loading } = useLiveTelemetry();
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>P&amp;ID Digital Twin — HP Separation Train</h1>
          <div className="subtitle">Source: [pid_hp_separation_train.svg] · [digital_twin_clean.json] · Live sensor overlays from [timeseries.csv]</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {proactiveAlerts.length > 0 && (
            <span style={{ background: 'var(--alarm-dim)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--alarm)', padding: '2px 8px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 600 }}>{proactiveAlerts.length} Alert{proactiveAlerts.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Alerts strip */}
      {proactiveAlerts.map(a => (
        <div key={a.id} className={`alert ${a.severity.toLowerCase()}`} style={{ margin: '6px 12px 0', borderRadius: 6 }}>
          {a.message}
          <span className="alert-cite"> {a.cite}</span>
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '6px 14px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', flexShrink: 0 }}>
        {Object.entries(STATUS_COLOR).filter(([k]) => k !== 'UNKNOWN').map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
            {status}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem' }}>＋</button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem' }}>－</button>
          <button onClick={() => setZoom(1)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.65rem' }}>Reset</button>
        </div>
      </div>

      {/* P&ID SVG Viewer + Overlays */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', position: 'relative', background: '#060b14' }}>
        <div style={{
          position: 'relative',
          width: `${100 * zoom}%`,
          minHeight: '100%',
          margin: '0 auto',
        }}>
          {/* The actual P&ID SVG */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pid_hp_separation_train.svg"
            alt="HP Separation Train P&ID Diagram"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              filter: 'invert(1) hue-rotate(185deg) brightness(0.85) sepia(0.3)',
              userSelect: 'none',
            }}
          />

          {/* Sensor overlay badges */}
          {!loading && ASSET_OVERLAYS.map(overlay => (
            <AssetOverlay
              key={overlay.id}
              overlay={overlay}
              readings={readings}
              selected={selected}
              onSelect={setSelected}
            />
          ))}

          {/* Loading shimmer */}
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(6,11,20,0.6)',
            }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📡</div>
                <div style={{ fontSize: '0.78rem' }}>Loading live sensor data...</div>
              </div>
            </div>
          )}
        </div>

        {/* Asset detail popup */}
        {selected && (
          <AssetDetailCard
            assetId={selected}
            readings={readings}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pid-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
