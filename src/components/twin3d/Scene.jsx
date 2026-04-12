/**
 * SceneCanvas — 3D Digital Twin main viewport
 *
 * Fixes:
 *  - Removed red vertical line (flare pipe removed from always-on rendering)
 *  - Simulation starts only on button click, runs once then stops
 *  - HUD is opaque with solid background
 *  - Alert is a compact corner toast, not full-screen modal
 *  - PCFShadowMap (not deprecated)
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html } from '@react-three/drei';
import { Suspense, useMemo, useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import AssetFactory from './AssetFactory';
import PipeNetwork from './PipeNetwork';
import Ground from './Ground';
import CameraController from './CameraController';
import Sensor3D from './Sensor';
import {
  assets as plantAssets,
  valves as plantValves,
  sensors as plantSensors,
} from '@/data/plantData';
import { useLiveTelemetrySimulator } from './useLiveTelemetrySimulator';

export function mapCoords(x, y) {
  return [(x - 1400) * 0.015, 0, (y - 900) * 0.015];
}

const PHASE_BG = {
  normal:   '#dde4ec',
  warning:  '#e3ddc8',
  alarm:    '#e2d0bc',
  trip:     '#dcc4b4',
  esd:      '#d6bcae',
  recovery: '#d8e4e0',
};

// ── Compact corner toast alert ────────────────────────────────────────────────
const FAULT_EVENTS = {
  trip: {
    severity: 'CRITICAL',
    title: 'PSHH-101 Trip — V-101 Over-Pressure',
    timestamp: '2024-03-15 · 14:32 UTC',
    description: 'V-101 pressure exceeded 72 barg trip point. ESD sequence initiated. SDV-101 closed fail-safe. PSV-101 lifting to flare.',
    root_cause: 'P-101A bearing degradation reduced liquid draw-off → pressure build at ~0.4 barg/min.',
    contacts: [
      { role: 'Process Eng.', name: 'K. Walsh', ref: 'NPA-PID-001' },
      { role: 'Lead Maint.', name: 'B. Thorpe', ref: 'MAN-MECH-001' },
      { role: 'HSE Officer', name: 'C. Wong', ref: 'NPA-ESD-CEF-001' },
      { role: 'Ops Lead', name: 'S. Ahmed', ref: 'SOP-OPS-001' },
    ],
    citations: [
      'NPA-PID-001 Rev 7 — PSHH-101 @ 72 barg trips SDV-101/201',
      'NPA-ESD-CEF-001 Rev 12 — P-101B auto-start on P-101A loss',
      'MAN-MECH-001 — P-101A/B bearing lube every 2000 hrs',
      'WO-01022 · FE-2024-001',
    ],
    actions: ['SDV-101 CLOSED', 'PSV-101 lifting to NPA-FL-001', 'P-101B auto-started', 'Field Operator dispatched'],
  },
  esd: {
    severity: 'ESD ACTIVE',
    title: 'Emergency Shutdown In Progress',
    timestamp: '2024-03-15 · 14:33 UTC',
    description: 'ESD sequence active. SDV-101 closed. P-101B running. Await Area Authority clearance before restart.',
    root_cause: 'Over-pressure event in V-101 (PSHH-101 at 72 barg). Root: P-101A bearing wear.',
    contacts: [
      { role: 'Process Eng.', name: 'K. Walsh', ref: 'NPA-PID-001' },
      { role: 'HSE Officer', name: 'C. Wong', ref: 'NPA-ESD-CEF-001' },
    ],
    citations: ['NPA-ESD-CEF-001 Rev 12', 'SOP-OPS-001 — 30 min cooldown before restart'],
    actions: ['SDV-101 CLOSED (fail-safe)', 'P-101B running', 'PSV-101 lifting'],
  },
};

function FaultToast({ phase, onClose }) {
  const ev = FAULT_EVENTS[phase] || FAULT_EVENTS.trip;
  const isCrit = ev.severity === 'CRITICAL' || ev.severity === 'ESD ACTIVE';
  const borderColor = isCrit ? '#ef4444' : '#f59e0b';
  const badgeColor = ev.severity === 'ESD ACTIVE' ? '#ea580c' : '#dc2626';
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div style={{
        position: 'absolute', top: 84, right: 18,
        zIndex: 50,
        width: expanded ? 380 : 300,
        background: 'rgba(10, 14, 22, 0.97)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 12,
        boxShadow: `0 0 40px ${borderColor}55, 0 12px 32px rgba(0,0,0,0.8)`,
        fontFamily: "'JetBrains Mono', monospace",
        overflow: 'hidden',
        pointerEvents: 'auto',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header row */}
        <div style={{
          background: `linear-gradient(135deg, rgba(220,40,40,0.25), rgba(0,0,0,0.2))`,
          borderBottom: `1px solid ${borderColor}44`,
          padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: badgeColor, color: '#fff',
              fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
              letterSpacing: 1, textTransform: 'uppercase',
            }}>{ev.severity}</span>
            <span style={{ fontSize: 10, color: '#ff8888', fontWeight: 700 }}>
              {ev.title}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setExpanded(x => !x)}
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#999', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 11,
              }}
            >{expanded ? '−' : '+'}</button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#999', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 11,
              }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>{ev.description}</p>

          {/* Actions taken */}
          <div>
            <div style={{ fontSize: 9, color: borderColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>ESD Sequence</div>
            {ev.actions.map((a, i) => (
              <div key={i} style={{ fontSize: 10, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <span style={{ color: '#4ade80', fontSize: 8 }}>▶</span>{a}
              </div>
            ))}
          </div>

          {/* Expanded section */}
          {expanded && (
            <>
              {/* Root cause */}
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>ROOT CAUSE</div>
                <p style={{ margin: 0, fontSize: 10, color: '#fde68a', lineHeight: 1.5 }}>{ev.root_cause}</p>
              </div>

              {/* Contacts */}
              <div>
                <div style={{ fontSize: 9, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Points of Contact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                  {ev.contacts.map((c, i) => (
                    <div key={i} style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: '#93c5fd', fontWeight: 700 }}>{c.role}</div>
                      <div style={{ fontSize: 11, color: '#e0f2fe', fontWeight: 800 }}>{c.name}</div>
                      <div style={{ fontSize: 8, color: '#475569', marginTop: 1 }}>{c.ref}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Citations */}
              <div>
                <div style={{ fontSize: 9, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Citations</div>
                {ev.citations.map((cit, i) => (
                  <div key={i} style={{ fontSize: 9, color: '#c4b5fd', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>📎 {cit}</div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer timestamp */}
        <div style={{ padding: '5px 14px', background: 'rgba(0,0,0,0.3)', fontSize: 9, color: '#475569' }}>
          {ev.timestamp} · Ref: {ev.citations[ev.citations.length - 1]}
        </div>
      </div>

      <style>{`@keyframes pulse-border { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }`}</style>
    </>
  );
}

// ── Phase HUD strip ───────────────────────────────────────────────────────────
function PhaseHUD({ label, phase, step, total, stepT, paused, simRunning, onStart, onTogglePause, onRestart, onShowAlert }) {
  const phaseColors = {
    normal:   { border: '#22c55e', text: '#22c55e', bg: '#0e2218' },
    warning:  { border: '#f59e0b', text: '#f59e0b', bg: '#1e1800' },
    alarm:    { border: '#ef4444', text: '#ef4444', bg: '#200808' },
    trip:     { border: '#ff2200', text: '#ff4444', bg: '#280a00' },
    esd:      { border: '#ff6600', text: '#ff8844', bg: '#261000' },
    recovery: { border: '#3b82f6', text: '#3b82f6', bg: '#081628' },
  };
  const c = phaseColors[phase] || phaseColors.normal;
  const showAlertBtn = phase === 'trip' || phase === 'esd' || phase === 'alarm';

  return (
    <>
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, // Force to very top
        background: 'rgba(10, 18, 30, 0.96)',
        border: `1px solid ${c.border}`,
        borderRadius: 12, padding: '12px 28px',
        display: 'flex', alignItems: 'center', gap: 20,
        boxShadow: `0 0 40px ${c.border}55, 0 10px 40px rgba(0,0,0,0.9)`,
        pointerEvents: 'auto',
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(12px)',
      }}>

        {!simRunning ? (
          /* ── Pre-start: show launch button ── */
          <>
            <span style={{ fontSize: 10, color: '#64748b', letterSpacing: 0.5 }}>
              2024-03-15 Fault Replay
            </span>
            <button
              onClick={onStart}
              style={{
                background: 'rgba(34,197,94,0.2)', border: '1px solid #22c55e',
                color: '#22c55e', borderRadius: 7, padding: '5px 16px',
                cursor: 'pointer', fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                fontFamily: 'inherit',
              }}
            >
              ▶ Start Simulation
            </button>
            <span style={{ fontSize: 9, color: '#334', letterSpacing: 0.4 }}>
              18 steps · {(18 * 3)}s total
            </span>
          </>
        ) : (
          /* ── Running: show controls ── */
          <>
            <span style={{
              fontSize: 11, fontWeight: 800, color: c.text,
              textTransform: 'uppercase', letterSpacing: 1.2, minWidth: 180,
            }}>
              {label || 'SCENARIO REPLAY'}
            </span>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 6 : 4,
                  height: i === step ? 6 : 4,
                  borderRadius: 3,
                  background: i < step ? c.border : i === step ? c.text : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>

            {/* Step progress bar */}
            <div style={{ width: 48, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${stepT * 100}%`, height: '100%',
                background: c.border, borderRadius: 2,
                transition: 'width 0.1s linear',
              }} />
            </div>

            <span style={{ fontSize: 9, color: c.text, opacity: 0.6 }}>2024-03-15</span>

            {/* Pause/Resume */}
            <button
              onClick={onTogglePause}
              style={{
                background: paused ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${paused ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                color: paused ? '#22c55e' : '#ccc',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                fontSize: 13, lineHeight: 1, fontFamily: 'inherit',
              }}
              title={paused ? 'Resume' : 'Pause'}
            >
              {paused ? '▶' : '⏸'}
            </button>

            {/* Restart */}
            <button
              onClick={onRestart}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#999', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                fontSize: 13, lineHeight: 1, fontFamily: 'inherit',
              }}
              title="Restart scenario"
            >↺</button>

            {/* Fault alert button */}
            {showAlertBtn && (
              <button
                onClick={onShowAlert}
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid #ef4444',
                  color: '#ff8888',
                  borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  fontFamily: 'inherit',
                  animation: 'pulse-border 1.5s infinite',
                }}
              >
                ⚠ FAULT REPORT
              </button>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes pulse-border { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)} 50%{box-shadow:0 0 8px rgba(239,68,68,0.6)} }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </>
  );
}

// ── Default (static) sensor values when simulation is not running ─────────────
const STATIC_SENSOR_VALUES = {
  'PT101A':  { v: 67.2, q: 'GOOD', unit: 'barg' },
  'PT101B':  { v: 66.9, q: 'GOOD', unit: 'barg' },
  'PSHH101': { v: 67.2, q: 'GOOD', unit: 'barg' },
  'PIC101':  { v: 65.8, q: 'GOOD', unit: 'barg' },
  'LIC101':  { v: 48.5, q: 'GOOD', unit: '%' },
  'LT101A':  { v: 48.5, q: 'GOOD', unit: '%' },
  'LT101B':  { v: 49.5, q: 'GOOD', unit: '%' },
  'LALL101': { v: 48.5, q: 'GOOD', unit: '%' },
  'TT101A':  { v: 87.3, q: 'GOOD', unit: '°C' },
  'TT101B':  { v: 92.3, q: 'GOOD', unit: '°C' },
  'TIC101':  { v: 89.3, q: 'GOOD', unit: '°C' },
  'FT101':   { v: 9.8, q: 'GOOD', unit: 'MMscfd' },
  'FIC101':  { v: 9.3, q: 'GOOD', unit: 'MMscfd' },
  'FT102':   { v: 118.2, q: 'GOOD', unit: 'm³/h' },
  'FIC102':  { v: 115.8, q: 'GOOD', unit: 'm³/h' },
  'VT301':   { v: 3.2, q: 'GOOD', unit: 'mm/s' },
  'FT103':   { v: 42.5, q: 'GOOD', unit: 'm³/h' },
  'LT103':   { v: 38.2, q: 'GOOD', unit: '%' },
  'PT103':   { v: 4.8, q: 'GOOD', unit: 'barg' },
  'PT201':   { v: 8.2, q: 'GOOD', unit: 'barg' },
};

const STATIC_VALVE_STATES = {
  'LCV-101': { openPercent: 55, state: 'throttled' },
  'PCV-101': { openPercent: 42, state: 'throttled' },
  'TCV-101': { openPercent: 65, state: 'throttled' },
  'SDV-101': { state: 'open', openPercent: 100 },
  'SDV-201': { state: 'open', openPercent: 100 },
  'SDV-102': { state: 'open', openPercent: 100 },
  'PSV-101': { state: 'closed', openPercent: 0 },
};

// ── Main export ───────────────────────────────────────────────────────────────
export default function SceneCanvas({ focusedAsset, onSelectAsset }) {
  const {
    data: simData, phase, label,
    stepIndex, totalSteps, stepT,
    paused, togglePause, restart,
  } = useLiveTelemetrySimulator();

  const [cameraTarget, setCameraTarget] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [simRunning, setSimRunning] = useState(false);   // ← starts idle
  const [simFinished, setSimFinished] = useState(false);
  const alertShownRef = useRef(false);

  // Detect simulation end (looped back to step 0 after running)
  useEffect(() => {
    if (!simRunning) return;
    if (simFinished) return;
    // When we've gone through all steps and returned to 0
    if (stepIndex === 0 && phase === 'normal' && simRunning && alertShownRef.current) {
      setSimFinished(true);
      // Pause at the last frame
      if (!paused) togglePause();
    }
  }, [stepIndex, phase, simRunning]);

  // Auto-show toast first time we hit trip/esd
  useEffect(() => {
    if (!simRunning) return;
    if ((phase === 'trip' || phase === 'esd') && !alertShownRef.current) {
      alertShownRef.current = true;
      setShowAlert(true);
    }
  }, [phase, simRunning]);

  const handleStart = () => {
    restart();
    alertShownRef.current = false;
    setSimFinished(false);
    setSimRunning(true);
    setShowAlert(false);
  };

  const handleRestart = () => {
    restart();
    alertShownRef.current = false;
    setSimFinished(false);
    setShowAlert(false);
  };

  // Choose which data to render
  const activeSimData = simRunning ? simData : null;
  const activePhase  = simRunning ? phase : 'normal';

  // healthMap
  const healthMap = useMemo(() => ({
    'AREA-HP-SEP:V-101': {
      status: activePhase === 'trip' || activePhase === 'esd' ? 'TRIP'
            : activePhase === 'alarm' ? 'ALARM'
            : activePhase === 'warning' ? 'ALARM' : 'GOOD',
    },
    'AREA-HP-SEP:P-101': {
      status: (activeSimData?.['P-101A_VIB'] || 0) > 11 ? 'ALARM' : 'GOOD',
    },
    'AREA-HP-SEP:E-101': { status: 'GOOD' },
    'AREA-HP-SEP:V-102': { status: 'GOOD' },
    'AREA-HP-SEP:E-102': { status: 'GOOD' },
  }), [activeSimData, activePhase]);

  const sensorValues = useMemo(() => {
    if (!activeSimData) return STATIC_SENSOR_VALUES;
    return {
      'PT101A':  { v: activeSimData['V-101_PRESSURE'], q: activeSimData['V-101_PRESSURE'] >= 72 ? 'BAD' : 'GOOD', unit: 'barg' },
      'PT101B':  { v: activeSimData['V-101_PRESSURE'] - 0.3, q: 'GOOD', unit: 'barg' },
      'PSHH101': { v: activeSimData['V-101_PRESSURE'], q: activeSimData['V-101_PRESSURE'] >= 72 ? 'BAD' : 'GOOD', unit: 'barg' },
      'PIC101':  { v: activeSimData['V-101_PRESSURE'] - 1.5, q: 'GOOD', unit: 'barg' },
      'LIC101':  { v: activeSimData['V-101_LEVEL'], q: 'GOOD', unit: '%' },
      'LT101A':  { v: activeSimData['V-101_LEVEL'], q: 'GOOD', unit: '%' },
      'LT101B':  { v: activeSimData['V-101_LEVEL'] + 1, q: 'GOOD', unit: '%' },
      'LALL101': { v: activeSimData['V-101_LEVEL'], q: 'GOOD', unit: '%' },
      'TT101A':  { v: activeSimData['E-101_TEMP'], q: 'GOOD', unit: '°C' },
      'TT101B':  { v: activeSimData['E-101_TEMP'] + 5, q: 'GOOD', unit: '°C' },
      'TIC101':  { v: activeSimData['E-101_TEMP'] + 2, q: 'GOOD', unit: '°C' },
      'FT101':   { v: activeSimData['V-101_GAS_FLOW'], q: 'GOOD', unit: 'MMscfd' },
      'FIC101':  { v: activeSimData['V-101_GAS_FLOW'] * 0.95, q: 'GOOD', unit: 'MMscfd' },
      'FT102':   { v: activeSimData['V-101_OIL_FLOW'], q: 'GOOD', unit: 'm³/h' },
      'FIC102':  { v: activeSimData['V-101_OIL_FLOW'] * 0.98, q: 'GOOD', unit: 'm³/h' },
      'VT301':   { v: activeSimData['P-101A_VIB'], q: activeSimData['P-101A_VIB'] > 11 ? 'BAD' : 'GOOD', unit: 'mm/s' },
      'FT103':   { v: 42.5, q: 'GOOD', unit: 'm³/h' },
      'LT103':   { v: 38.2, q: 'GOOD', unit: '%' },
      'PT103':   { v: 4.8, q: 'GOOD', unit: 'barg' },
      'PT201':   { v: 8.2, q: 'GOOD', unit: 'barg' },
    };
  }, [activeSimData]);

  const valvesWithLiveState = useMemo(() => plantValves.map(v => {
    if (!activeSimData) {
      const s = STATIC_VALVE_STATES[v.id];
      return s ? { ...v, ...s } : v;
    }
    switch (v.id) {
      case 'LCV-101': return { ...v, openPercent: activeSimData['LCV-101_OPEN'], state: activeSimData['LCV-101_OPEN'] >= 95 ? 'open' : activeSimData['LCV-101_OPEN'] <= 5 ? 'closed' : 'throttled' };
      case 'PCV-101': return { ...v, openPercent: activeSimData['PCV-101_OPEN'], state: activeSimData['PCV-101_OPEN'] >= 95 ? 'open' : activeSimData['PCV-101_OPEN'] <= 5 ? 'closed' : 'throttled' };
      case 'TCV-101': return { ...v, openPercent: activeSimData['TCV-101_OPEN'], state: activeSimData['TCV-101_OPEN'] >= 95 ? 'open' : activeSimData['TCV-101_OPEN'] <= 5 ? 'closed' : 'throttled' };
      case 'SDV-101': return { ...v, state: activeSimData['SDV-101_STATE'], openPercent: activeSimData['SDV-101_STATE'] === 'open' ? 100 : 0 };
      case 'SDV-201': return { ...v, state: activeSimData['SDV-201_STATE'], openPercent: activeSimData['SDV-201_STATE'] === 'open' ? 100 : 0 };
      case 'SDV-102': return { ...v, state: activeSimData['SDV-102_STATE'], openPercent: activeSimData['SDV-102_STATE'] === 'open' ? 100 : 0 };
      case 'PSV-101': return { ...v, state: activeSimData['PSV-101_STATE'] || 'closed', openPercent: activeSimData['PSV-101_STATE'] === 'open' ? 100 : activeSimData['PSV-101_STATE'] === 'cracking' ? 30 : 0 };
      default: return v;
    }
  }), [activeSimData]);

  const rawReadings = useMemo(() => {
    if (!activeSimData) return [
      { asset_id: 'AREA-HP-SEP:V-101', sensor_type: 'LEVEL', value: 48.5, quality_flag: 'GOOD' },
      { asset_id: 'AREA-HP-SEP:V-101', sensor_type: 'PRESSURE', value: 67.2, quality_flag: 'GOOD' },
    ];
    return [
      { asset_id: 'AREA-HP-SEP:V-101', sensor_type: 'PRESSURE', value: activeSimData['V-101_PRESSURE'], quality_flag: 'GOOD' },
      { asset_id: 'AREA-HP-SEP:V-101', sensor_type: 'LEVEL',    value: activeSimData['V-101_LEVEL'],    quality_flag: 'GOOD' },
      { asset_id: 'AREA-HP-SEP:V-101', sensor_type: 'TEMPERATURE', value: activeSimData['V-101_TEMP'], quality_flag: 'GOOD' },
      { asset_id: 'AREA-HP-SEP:E-101', sensor_type: 'TEMPERATURE', value: activeSimData['E-101_TEMP'], quality_flag: 'GOOD' },
      { asset_id: 'AREA-HP-SEP:E-101', sensor_type: 'LEVEL',    value: activeSimData['E-101_LEVEL'],    quality_flag: 'GOOD' },
      { asset_id: 'AREA-HP-SEP:P-101', sensor_type: 'VIBRATION', value: activeSimData['P-101A_VIB'],   quality_flag: activeSimData['P-101A_VIB'] > 11 ? 'BAD' : 'GOOD' },
    ];
  }, [activeSimData]);

  const telemetryForPipes = useMemo(() => {
    if (!activeSimData) return { _phase: 'normal', 'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open', 'PSV-101_STATE': 'closed', 'V-101_GAS_FLOW': 9.8, 'V-101_OIL_FLOW': 118, 'P-101A_FLOW': 118, 'P-101B_VIB': 2.8 };
    return { ...activeSimData, _phase: activePhase };
  }, [activeSimData, activePhase]);

  const bgColor = PHASE_BG[activePhase] || PHASE_BG.normal;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ── Fixed Screen HUD ── */}
      <PhaseHUD
        label={label}
        phase={activePhase}
        step={stepIndex}
        total={totalSteps}
        stepT={stepT}
        paused={paused}
        simRunning={simRunning}
        onStart={handleStart}
        onTogglePause={togglePause}
        onRestart={handleRestart}
        onShowAlert={() => setShowAlert(true)}
      />

      {/* ── Compact corner toast (Screen Space) ── */}
      {showAlert && simRunning && (
        <FaultToast
          phase={activePhase === 'esd' ? 'esd' : 'trip'}
          onClose={() => setShowAlert(false)}
        />
      )}

      <Canvas
        camera={{ position: [5, 18, 30], fov: 45, near: 0.1, far: 500 }}
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 55, 130]} />

        <Suspense fallback={<Html center><div style={{ color: '#fff', fontFamily: 'monospace' }}>Loading 3D Twin...</div></Html>}>

        <Environment preset="city" />

        {/* Lighting */}
        <ambientLight intensity={0.75} color="#ffffff" />
        <directionalLight
          position={[20, 30, 15]} intensity={1.4} color="#ffeedd"
          castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-far={120} shadow-camera-near={0.5}
          shadow-camera-left={-50} shadow-camera-right={50}
          shadow-camera-top={50} shadow-camera-bottom={-50}
        />
        <directionalLight position={[-15, 15, -10]} intensity={0.6} color="#aaccff" />
        <pointLight
          position={[-8, 5, -1]}
          intensity={activePhase === 'trip' || activePhase === 'esd' ? 1.4 : 0.4}
          color={activePhase === 'trip' || activePhase === 'esd' ? '#ff3300' : '#00d4ff'}
        />
        <pointLight position={[8, 5, 3]} intensity={0.35} color="#00d4ff" />

        <Ground />
        <Grid
          position={[0, -0.01, 0]}
          args={[100, 100]}
          cellSize={2} cellThickness={0.5} cellColor="#9ca3af"
          sectionSize={10} sectionThickness={1} sectionColor="#6b7280"
          fadeDistance={75} fadeStrength={1} infiniteGrid
        />

        {/* Assets */}
        {plantAssets.map(asset => (
          <AssetFactory
            key={asset.id}
            asset={asset}
            healthMap={healthMap}
            rawReadings={rawReadings}
            sensorValues={sensorValues}
            isFocused={focusedAsset === asset.id}
            onFocus={setCameraTarget}
            onSelect={() => onSelectAsset?.(asset.id)}
          />
        ))}

        {/* Valves */}
        {valvesWithLiveState.map(valve => (
          <AssetFactory
            key={valve.id}
            asset={valve}
            isValve
            healthMap={healthMap}
            rawReadings={rawReadings}
            sensorValues={sensorValues}
            isFocused={focusedAsset === valve.id}
            onFocus={setCameraTarget}
            onSelect={() => onSelectAsset?.(valve.id)}
          />
        ))}

        {/* Pipe network — flare line only shown when PSV is active */}
        <PipeNetwork telemetry={telemetryForPipes} />

        {/* Sensors */}
        {plantSensors.map((sensor, idx) => (
          <Sensor3D
            key={`${sensor.id}-${idx}`}
            sensor={sensor}
            value={sensorValues[sensor.id]}
          />
        ))}

        <CameraController targetPosition={cameraTarget} />
        <OrbitControls
          makeDefault enableDamping dampingFactor={0.08}
          minDistance={4} maxDistance={90} maxPolarAngle={Math.PI / 2.05}
          target={[0, 0, 2]}
        />
      </Suspense>
    </Canvas>
  </div>
  );
}
