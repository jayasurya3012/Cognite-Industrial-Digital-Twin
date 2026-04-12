import { useState, useEffect } from 'react';
import usePlantStore from '../../hooks/usePlantStore';

/**
 * TopBar — main navigation bar with system status and controls.
 */
export default function TopBar() {
  const sensorValues = usePlantStore((s) => s.sensorValues);
  const currentTimestamp = usePlantStore((s) => s.currentTimestamp);
  const plantLayout = usePlantStore((s) => s.plantLayout);
  const isPlaying = usePlantStore((s) => s.isPlaying);
  const setIsPlaying = usePlantStore((s) => s.setIsPlaying);

  // Calculate overall system status
  const getSystemStatus = () => {
    const values = Object.values(sensorValues);
    const hasCritical = values.some((v) => v.q === 'BAD');
    const hasWarning = values.some((v) => v.q === 'UNCERTAIN');
    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'operational';
  };

  const getAlertCount = () => {
    const values = Object.values(sensorValues);
    return values.filter((v) => v.q === 'BAD' || v.q === 'UNCERTAIN').length;
  };

  const systemStatus = getSystemStatus();
  const alertCount = getAlertCount();

  const statusLabels = {
    operational: 'All Systems Operational',
    warning: 'Warnings Detected',
    critical: 'Critical Quality Alert',
  };

  const rawSensors = plantLayout?.sensors || [];

  return (
    <div className="topbar">
      <div className="topbar-left">
        {/* Logo */}
        <div className="topbar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>CogniteTwin</span>
        </div>

        <div className="topbar-divider" />

        <span className="topbar-plant-name">
          Oil Separation Unit — Train 1
        </span>
      </div>

      <div className="topbar-center">
        <div className={`topbar-status ${systemStatus}`}>
          <span className="topbar-status-dot" />
          {statusLabels[systemStatus]}
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button 
           onClick={() => setIsPlaying(!isPlaying)}
           style={{
             background: 'none', border: '1px solid #4a5568', color: '#fff', 
             padding: '4px 12px', borderRadius: '4px', cursor: 'pointer'
           }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        {alertCount > 0 && (
          <div
            className="topbar-status"
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
              color: 'var(--status-warning)',
            }}
          >
            ⚠ {alertCount} Alert{alertCount !== 1 ? 's' : ''}
          </div>
        )}

        <span className="topbar-clock" style={{ minWidth: '150px', textAlign: 'right' }}>
          {currentTimestamp ? currentTimestamp.replace('Z', '').replace('T', ' ') : '--:--'}
        </span>

        <div className="topbar-plant-name" style={{ fontSize: '11px', opacity: 0.7 }}>
          SVG Parsing: {rawSensors.length} Sensors
        </div>
      </div>
    </div>
  );
}
