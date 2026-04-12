'use client';

import { useState, useEffect } from 'react';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import type { LiveSensorReading, AssetHealth, ProactiveAlert } from '@/lib/types';
import { supabase } from '@/lib/supabase';

// ── Helpers ──────────────────────────────────────────────────────────
function sc(s: string) {
  const u = s?.toUpperCase();
  if (u === 'GOOD')  return 'good';
  if (u === 'ALARM') return 'alarm';
  if (u === 'TRIP')  return 'trip';
  return 'offline';
}
const C: Record<string, string> = {
  good: 'var(--good)', alarm: 'var(--alarm)', trip: 'var(--trip)', offline: 'var(--offline)',
};

function computePHI(r: LiveSensorReading[]) {
  if (!r.length) return 0;
  return Math.round((r.filter(x => x.status === 'GOOD').length / r.length) * 100);
}

// ── Section Header ────────────────────────────────────────────────────
function SH({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 14px' }}>
      <div style={{ width: 3, height: 16, background: 'var(--blue)', borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function StatCard({ label, value, sub, accent, unit, timeRange }: { label: string; value: string | number; sub: string; accent: string; unit?: string, timeRange: string }) {
  // Deterministic mock variances based on label + timeRange
  const variances: Record<string, any> = {
    'Platform Health Index': { '24H': '+1.2%', '7D': '-0.5%', '1M': '+4.0%' },
    'Liquid Production': {     '24H': '-2.1%', '7D': '+5.4%', '1M': '+11.2%' },
    'Gas Production': {        '24H': '0.0%',  '7D': '+1.2%', '1M': '-3.1%' },
    'Env. Compliance': {       '24H': '0.0%',  '7D': '0.0%',  '1M': '+2.0%' }
  };
  const variance = timeRange === 'Real-Time' ? null : variances[label]?.[timeRange];

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
        {variance && (
          <div style={{ fontSize: '0.62rem', fontWeight: 600, color: variance.startsWith('-') ? 'var(--alarm)' : 'var(--good)' }}>
            {variance} <span style={{color: 'var(--t3)', fontWeight: 400}}>vs {timeRange}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: accent, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: '0.9rem', color: 'var(--t3)', fontWeight: 400 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--t3)', marginTop: 8 }}>{sub}</div>
    </div>
  );
}

// ── Production Bar ────────────────────────────────────────────────────
function ProdBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = Math.min(100, (value / target) * 100);
  const color = pct >= 80 ? 'var(--good)' : pct >= 60 ? 'var(--alarm)' : 'var(--trip)';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--t2)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color }}>
          {value.toFixed(1)} <span style={{ fontSize: '0.65rem', color: 'var(--t3)', fontWeight: 400 }}>/ {target} {unit}</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ fontSize: '0.62rem', color: 'var(--t3)', marginTop: 5 }}>{Math.round(pct)}% of design capacity</div>
    </div>
  );
}

// ── Sensor Stat Card (V-101 readings row) ────────────────────────────
function SensorCard({ r }: { r: LiveSensorReading }) {
  const s = sc(r.status);
  const color = C[s];
  const RANGES: Record<string, { alarm: number; trip: number; max: number }> = {
    'V-101-PRESS':    { alarm: 70, trip: 72,  max: 90  },
    'V-101-LEVEL':    { alarm: 75, trip: 90,  max: 100 },
    'V-101-TEMP':     { alarm: 80, trip: 100, max: 120 },
    'V-101-GAS_FLOW': { alarm: 20, trip: 23,  max: 25  },
    'V-101-OIL_FLOW': { alarm: 220, trip: 245, max: 260 },
  };
  const rng = RANGES[r.sensor_id] || { alarm: r.value * 1.4, trip: r.value * 1.5, max: r.value * 2 };
  const pct = Math.min(100, (r.value / rng.max) * 100);
  return (
    <div style={{ background: 'var(--bg-surface)', border: `1px solid ${s !== 'good' ? `${color}40` : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {r.sensor_type?.replace(/_/g, ' ')}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color, lineHeight: 1, marginBottom: 4 }}>
        {r.value.toFixed(1)}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--t3)', marginBottom: 10 }}>{r.unit}</div>
      {/* mini bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, (rng.alarm / rng.max) * 100)}%`, width: 1, background: 'var(--alarm)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, (rng.trip / rng.max) * 100)}%`, width: 1, background: 'var(--trip)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.55rem', color: 'var(--t3)', fontFamily: 'monospace' }}>
        <span>ALH {rng.alarm}</span>
        <span style={{ color }}>{r.sensor_id}</span>
        <span>TPH {rng.trip}</span>
      </div>
    </div>
  );
}

// ── Gauge Row (Operational Envelope) ─────────────────────────────────
const RANGES_FULL: Record<string, { min: number; max: number; alarm: number; trip: number }> = {
  'V-101-PRESS':    { min: 0, max: 90,  alarm: 70, trip: 72 },
  'V-101-LEVEL':    { min: 0, max: 100, alarm: 75, trip: 90 },
  'V-101-TEMP':     { min: 0, max: 120, alarm: 80, trip: 100 },
  'V-101-GAS_FLOW': { min: 0, max: 25,  alarm: 20, trip: 23 },
  'V-101-OIL_FLOW': { min: 0, max: 260, alarm: 220, trip: 245 },
};

function GaugeRow({ r }: { r: LiveSensorReading }) {
  const rng = RANGES_FULL[r.sensor_id] || { min: 0, max: r.value * 1.6 || 100, alarm: 80, trip: 90 };
  const pct      = Math.min(100, ((r.value - rng.min) / (rng.max - rng.min)) * 100);
  const alarmPct = Math.min(100, ((rng.alarm - rng.min) / (rng.max - rng.min)) * 100);
  const tripPct  = Math.min(100, ((rng.trip  - rng.min) / (rng.max - rng.min)) * 100);
  const s = sc(r.status); const color = C[s];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 90px', gap: 14, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace' }}>{r.sensor_id}</span>
      <div style={{ position: 'relative' }}>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${alarmPct}%`, width: 2, background: 'var(--alarm)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${tripPct}%`, width: 2, background: 'var(--trip)', borderRadius: 1 }} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color }}>{r.value.toFixed(1)}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--t3)', marginLeft: 4 }}>{r.unit}</span>
      </div>
    </div>
  );
}

// ── Asset Card ────────────────────────────────────────────────────────
function AssetCard({ asset }: { asset: AssetHealth }) {
  const s = sc(asset.status);
  const color = C[s];
  const shortId = asset.asset_id.split(':')[1] || asset.asset_id;
  const keyR = asset.sensors.reduce<LiveSensorReading | null>((w, r) => {
    if (!w) return r;
    const ord: Record<string, number> = { TRIP: 3, ALARM: 2, OFFLINE: 1, GOOD: 0 };
    return (ord[r.status] ?? 0) > (ord[w.status] ?? 0) ? r : w;
  }, null);

  return (
    <div style={{ background: 'var(--bg-surface)', border: `1px solid ${s !== 'good' ? `${color}35` : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--t1)', fontFamily: 'JetBrains Mono, monospace' }}>{shortId}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--t3)', marginTop: 2 }}>{asset.sensors.length} sensors monitored</div>
        </div>
        <span style={{
          fontSize: '0.62rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          color, border: `1px solid ${color}40`, background: `${color}12`, textTransform: 'uppercase',
        }}>{asset.status}</span>
      </div>
      {keyR && (
        <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--t3)' }}>{keyR.sensor_id}</span>
          <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: C[sc(keyR.status)] }}>
            {keyR.value.toFixed(1)} <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--t3)' }}>{keyR.unit}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Work Order Row ────────────────────────────────────────────────────
interface WO { work_order_id: string; tag: string; findings: string; status: string; priority: string; raised_date: string; }
function WoRow({ wo }: { wo: WO }) {
  const PRI: Record<string, string> = { CRITICAL: 'var(--trip)', HIGH: 'var(--alarm)', MEDIUM: 'var(--blue)', LOW: 'var(--t3)' };
  const STC: Record<string, string> = { OPEN: 'var(--alarm)', 'IN PROGRESS': 'var(--blue)', CLOSED: 'var(--good)' };
  const pc = PRI[wo.priority] || 'var(--t3)';
  const sc2 = STC[wo.status] || 'var(--t3)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 80px', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--t1)' }}>{wo.work_order_id}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {wo.tag} — {wo.findings?.slice(0, 60)}{(wo.findings?.length ?? 0) > 60 ? '…' : ''}
      </span>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: sc2, textAlign: 'center', padding: '2px 8px', border: `1px solid ${sc2}40`, borderRadius: 20, background: `${sc2}12` }}>
        {wo.status}
      </span>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: pc, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {wo.priority}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function OperationalCommandPanel({ fullPage }: { fullPage?: boolean }) {
  const { readings, assetHealth, proactiveAlerts, loading } = useLiveTelemetry();
  const [wos, setWos] = useState<WO[]>([]);
  const [timeRange, setTimeRange] = useState('Real-Time');
  const [activeAsset, setActiveAsset] = useState('V-101');

  useEffect(() => {
    supabase.from('maintenance_history')
      .select('work_order_id, tag, findings, status, priority, raised_date')
      .order('raised_date', { ascending: false }).limit(6)
      .then(({ data }) => { if (data) setWos(data as WO[]); });
  }, []);

  const assetReadings = readings.filter(r => r.sensor_id.startsWith(activeAsset));
  const sensorRow = assetReadings.filter(r => !r.sensor_id.includes('OIL') && !r.sensor_id.includes('GAS'));
  
  const phi       = computePHI(readings);
  const oilFlow   = readings.find(r => r.sensor_id === 'V-101-OIL_FLOW')?.value ?? 0;
  const gasFlow   = readings.find(r => r.sensor_id === 'V-101-GAS_FLOW')?.value ?? 0;
  
  // Specific guards for V-101
  const pressVal  = readings.find(r => r.sensor_id === 'V-101-PRESS')?.value ?? 0;
  const envScore  = readings.some(r => r.status === 'TRIP') ? 82 : 98;
  const phiColor  = phi >= 80 ? 'var(--good)' : phi >= 60 ? 'var(--alarm)' : 'var(--trip)';
  const envColor  = envScore >= 95 ? 'var(--good)' : envScore >= 85 ? 'var(--alarm)' : 'var(--trip)';

  const Skel = ({ h = 60 }: { h?: number }) => <div className="loading-shimmer" style={{ height: h, borderRadius: 10, marginBottom: 6 }} />;

  return (
    <div className="panel" style={fullPage ? { flex: 1 } : {}}>
      {/* ── Header ── */}
      <div className="panel-header">
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            Operational Command
            
            {/* Interactive Filters */}
            <div style={{ display: 'flex', gap: 10, marginLeft: 20 }}>
              <select value={activeAsset} onChange={e => setActiveAsset(e.target.value)} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-blue)', borderRadius: 7, 
                color: 'var(--blue)', fontSize: '0.65rem', padding: '3px 8px', outline: 'none', cursor: 'pointer'
              }}>
                <option value="V-101">V-101 — HP Separator</option>
                <option value="P-101">P-101 — Drain Pumps</option>
                <option value="E-101">E-101 — Heater</option>
                <option value="SDV">SDV — Safety Valves</option>
              </select>

              <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
                {['Real-Time', '24H', '7D', '1M'].map(t => (
                  <button key={t} onClick={() => setTimeRange(t)} style={{
                    background: timeRange === t ? 'rgba(120,180,255,0.1)' : 'transparent',
                    color: timeRange === t ? 'var(--blue)' : 'var(--t3)', border: 'none', cursor: 'pointer',
                    fontSize: '0.6rem', padding: '4px 10px', fontWeight: timeRange === t ? 700 : 500,
                  }}>{t}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--t3)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
            NPA · HP Separation Train · Deck A · Block 14/29
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {proactiveAlerts.length > 0 && (
            <span style={{ fontSize: '0.65rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '3px 10px', color: 'var(--trip)', fontWeight: 700 }}>
              {proactiveAlerts.length} ALERT{proactiveAlerts.length > 1 ? 'S' : ''}
            </span>
          )}
          <span className="track-badge track2">T2 · PROACTIVE</span>
        </div>
      </div>

      <div className="panel-body">

        {/* ── Alerts ── */}
        {proactiveAlerts.length > 0 && (
          <>
            <SH label="Active Alerts" />
            {proactiveAlerts.map(a => (
              <div key={a.id} className={`alert ${a.severity === 'CRITICAL' ? 'critical' : 'warning'}`} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.message}</div>
                <div className="alert-cite" style={{ marginTop: 5 }}>{a.cite}</div>
              </div>
            ))}
          </>
        )}

        {/* ── Platform KPIs — 4 stat cards ── */}
        <SH label="Platform Key Performance Indicators" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 4 }}>
          {loading ? [...Array(4)].map((_, i) => <Skel key={i} h={100} />) : <>
            <StatCard label="Platform Health Index" value={phi} unit="/100" sub={`${readings.filter(r => r.status === 'GOOD').length}/${readings.length} sensors nominal`} accent={phiColor} timeRange={timeRange} />
            <StatCard label="Liquid Production" value={oilFlow.toFixed(1)} unit="m³/h" sub={`Target: 200 m³/h · ${Math.round((oilFlow/200)*100)}% capacity`} accent="var(--blue)" timeRange={timeRange} />
            <StatCard label="Gas Production" value={gasFlow.toFixed(1)} unit="MMscfd" sub={`Target: 12 MMscfd · ${Math.round((gasFlow/12)*100)}% capacity`} accent="var(--blue)" timeRange={timeRange} />
            <StatCard label="Env. Compliance" value={envScore} unit="/100" sub="OSPAR discharge limits" accent={envColor} timeRange={timeRange} />
          </>}
        </div>

        {/* ── Production vs Target + MTBF side-by-side ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 4 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Production vs. Target</div>
            <ProdBar label="Liquid Output" value={oilFlow} target={200}  unit="m³/h"   />
            <ProdBar label="Gas Output"   value={gasFlow} target={12}   unit="MMscfd" />
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>MTBF</div>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--blue)', lineHeight: 1 }}>14.2</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--t3)', marginTop: 6 }}>days · P-101A/B basis</div>
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(251,191,36,0.08)', borderRadius: 8, fontSize: '0.68rem', color: 'var(--alarm)', lineHeight: 1.5 }}>
              WO-01001 — bearing failure precedent
            </div>
          </div>
        </div>

        {/* ── Dynamic Asset Sensor Cards ── */}
        <SH label={`${activeAsset} Live Sensor Readings`} />
        {loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{[...Array(4)].map((_, i) => <Skel key={i} h={90} />)}</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 4 }}>
              {sensorRow.slice(0, 4).map(r => <SensorCard key={r.sensor_id} r={r} />)}
              {sensorRow.length === 0 && <div style={{ fontSize: '0.7rem', color: 'var(--t3)', gridColumn: 'span 4' }}>No immediate sensors matched for {activeAsset}.</div>}
            </div>
        }

        {/* ── Operational Envelope ── */}
        <SH label={`Operational Envelope — ${activeAsset}`} />
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.65rem', color: 'var(--t3)' }}>
              <span>Alarm markers shown in <span style={{ color: 'var(--alarm)' }}>amber</span></span>
              <span>Trip markers shown in <span style={{ color: 'var(--trip)' }}>red</span></span>
            </div>
            {activeAsset === 'V-101' && (
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, padding: '3px 12px', borderRadius: 6,
                background: pressVal < 75 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                color: pressVal < 75 ? 'var(--good)' : 'var(--trip)',
                border: `1px solid ${pressVal < 75 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
              }}>MAWP 75 barg — {pressVal < 75 ? 'COMPLIANT' : 'BREACH'}</span>
            )}
          </div>
          {loading ? <Skel h={110} /> : assetReadings.map(r => <GaugeRow key={r.sensor_id} r={r} />)}
          <div style={{ display: 'flex', gap: 20, paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Pressure below trip (72 barg)', ok: pressVal < 72 },
              { label: 'Pressure below MAWP (75 barg)', ok: pressVal < 75 },
              { label: 'Level within 30–70% band', ok: readings.find(r => r.sensor_id === 'V-101-LEVEL')?.status === 'GOOD' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: item.ok ? 'var(--good)' : 'var(--trip)' }}>
                <div style={{ width: 15, height: 15, borderRadius: '50%', border: `1.5px solid ${item.ok ? 'var(--good)' : 'var(--trip)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700, flexShrink: 0 }}>
                  {item.ok ? '✓' : '✕'}
                </div>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Work Orders ── */}
        <SH label="Work Orders" />
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 16px 12px', marginBottom: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px 80px', gap: 12, padding: '8px 0 6px', borderBottom: '1px solid var(--border-bright)' }}>
            {['Work Order', 'Tag / Summary', 'Status', 'Priority'].map(h => (
              <span key={h} style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
            ))}
          </div>
          {wos.length === 0 ? <div style={{ fontSize: '0.75rem', color: 'var(--t3)', padding: '14px 0' }}>Loading work orders…</div>
            : wos.map(wo => <WoRow key={wo.work_order_id} wo={wo} />)
          }
          <div style={{ fontSize: '0.62rem', color: 'var(--t3)', paddingTop: 10 }}>Per SOP-MAINT-001 · Sign-off required from Platform Supervisor</div>
        </div>

        {/* ── Asset Health Grid ── */}
        <SH label="Asset Health — HP Separation Train" />
        {loading
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>{[...Array(4)].map((_, i) => <Skel key={i} h={80} />)}</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 4 }}>
              {assetHealth.map(a => <AssetCard key={a.asset_id} asset={a} />)}
            </div>
        }

        {/* ── Footer ── */}
        <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-overlay)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--t3)', lineHeight: 1.8 }}>
            <span style={{ color: 'var(--blue)', fontWeight: 600 }}>Data Sources</span>
            {' · '}timeseries.csv · sensor_metadata.csv · maintenance_history.csv · SOP-MAINT-001 · RPT-INSPECT-001 · MAN-MECH-001
          </div>
          <div style={{ fontSize: '0.58rem', color: 'var(--t3)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
            3.07M rows · Polling every 30s · {new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' })} UTC
          </div>
        </div>

      </div>
    </div>
  );
}
