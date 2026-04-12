/**
 * useLiveTelemetrySimulator
 *
 * Simulates live telemetry by replaying a known fault scenario:
 * SCENARIO: 2024-03-15 Pressure escalation event on V-101 with concurrent
 * P-101A bearing vibration anomaly.
 *
 * 20-step timeline: normal → building → fault → recovery
 * Each step is 3 seconds in real-time (configurable).
 * 
 * Returns a rich state object used by Scene.jsx to drive all 3D visuals.
 */

import { useState, useEffect, useRef } from 'react';

// ── Fault scenario timeline ──────────────────────────────────────────────────
// Based on historical data from 2024-03-15 event WO-01022 / FE-2024-001
const SCENARIO_STEPS = [
  // t=0 Normal operations
  {
    label: 'Normal Operations',
    phase: 'normal',
    'V-101_PRESSURE': 67.2, 'V-101_LEVEL': 48.5, 'V-101_TEMP': 74.1,
    'V-101_GAS_FLOW': 9.8, 'V-101_OIL_FLOW': 118.2,
    'E-101_TEMP': 87.3, 'E-101_LEVEL': 51.2,
    'P-101A_VIB': 3.2, 'P-101A_FLOW': 117.4,
    'P-101B_VIB': 2.8,
    'LCV-101_OPEN': 55, 'PCV-101_OPEN': 42, 'TCV-101_OPEN': 65,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'Normal Operations',
    phase: 'normal',
    'V-101_PRESSURE': 67.5, 'V-101_LEVEL': 49.2, 'V-101_TEMP': 74.3,
    'V-101_GAS_FLOW': 9.9, 'V-101_OIL_FLOW': 119.0,
    'E-101_TEMP': 87.5, 'E-101_LEVEL': 51.0,
    'P-101A_VIB': 3.4, 'P-101A_FLOW': 118.5,
    'P-101B_VIB': 2.9,
    'LCV-101_OPEN': 55, 'PCV-101_OPEN': 43, 'TCV-101_OPEN': 65,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  // t=6s Pressure begins creeping up
  {
    label: 'Pressure Building',
    phase: 'warning',
    'V-101_PRESSURE': 68.8, 'V-101_LEVEL': 51.3, 'V-101_TEMP': 74.8,
    'V-101_GAS_FLOW': 10.1, 'V-101_OIL_FLOW': 120.5,
    'E-101_TEMP': 88.2, 'E-101_LEVEL': 52.1,
    'P-101A_VIB': 4.1, 'P-101A_FLOW': 119.2,
    'P-101B_VIB': 3.0,
    'LCV-101_OPEN': 60, 'PCV-101_OPEN': 50, 'TCV-101_OPEN': 65,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'Pressure Warning',
    phase: 'warning',
    'V-101_PRESSURE': 69.8, 'V-101_LEVEL': 52.4, 'V-101_TEMP': 75.2,
    'V-101_GAS_FLOW': 10.4, 'V-101_OIL_FLOW': 122.1,
    'E-101_TEMP': 89.0, 'E-101_LEVEL': 53.0,
    'P-101A_VIB': 5.1, 'P-101A_FLOW': 120.0,
    'P-101B_VIB': 3.1,
    'LCV-101_OPEN': 68, 'PCV-101_OPEN': 58, 'TCV-101_OPEN': 70,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'PCV-101 Opening',
    phase: 'warning',
    'V-101_PRESSURE': 70.1, 'V-101_LEVEL': 53.0, 'V-101_TEMP': 75.5,
    'V-101_GAS_FLOW': 11.2, 'V-101_OIL_FLOW': 123.0,
    'E-101_TEMP': 89.4, 'E-101_LEVEL': 53.5,
    'P-101A_VIB': 5.9, 'P-101A_FLOW': 121.2,
    'P-101B_VIB': 3.1,
    'LCV-101_OPEN': 72, 'PCV-101_OPEN': 70, 'TCV-101_OPEN': 70,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  // t=15s Vibration anomaly on P-101A
  {
    label: 'P-101A Vibration Anomaly',
    phase: 'warning',
    'V-101_PRESSURE': 70.5, 'V-101_LEVEL': 54.2, 'V-101_TEMP': 75.9,
    'V-101_GAS_FLOW': 11.5, 'V-101_OIL_FLOW': 119.5,
    'E-101_TEMP': 89.8, 'E-101_LEVEL': 54.1,
    'P-101A_VIB': 7.2, 'P-101A_FLOW': 115.0,
    'P-101B_VIB': 3.2,
    'LCV-101_OPEN': 75, 'PCV-101_OPEN': 75, 'TCV-101_OPEN': 72,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'ALARM: High Pressure',
    phase: 'alarm',
    'V-101_PRESSURE': 71.2, 'V-101_LEVEL': 55.8, 'V-101_TEMP': 76.4,
    'V-101_GAS_FLOW': 11.9, 'V-101_OIL_FLOW': 113.0,
    'E-101_TEMP': 90.5, 'E-101_LEVEL': 55.0,
    'P-101A_VIB': 8.8, 'P-101A_FLOW': 110.0,
    'P-101B_VIB': 3.3,
    'LCV-101_OPEN': 80, 'PCV-101_OPEN': 85, 'TCV-101_OPEN': 72,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'ALARM: High Pressure',
    phase: 'alarm',
    'V-101_PRESSURE': 71.8, 'V-101_LEVEL': 57.0, 'V-101_TEMP': 76.9,
    'V-101_GAS_FLOW': 12.3, 'V-101_OIL_FLOW': 108.0,
    'E-101_TEMP': 91.1, 'E-101_LEVEL': 55.8,
    'P-101A_VIB': 10.5, 'P-101A_FLOW': 104.0,
    'P-101B_VIB': 3.3,
    'LCV-101_OPEN': 85, 'PCV-101_OPEN': 90, 'TCV-101_OPEN': 74,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  // t=24s CRITICAL — PSHH-101 Trip Point
  {
    label: '⚠ CRITICAL: PSHH-101 TRIP',
    phase: 'trip',
    'V-101_PRESSURE': 72.4, 'V-101_LEVEL': 58.5, 'V-101_TEMP': 77.5,
    'V-101_GAS_FLOW': 12.8, 'V-101_OIL_FLOW': 101.0,
    'E-101_TEMP': 91.8, 'E-101_LEVEL': 56.5,
    'P-101A_VIB': 12.1, 'P-101A_FLOW': 98.0,
    'P-101B_VIB': 3.4,
    'LCV-101_OPEN': 90, 'PCV-101_OPEN': 95, 'TCV-101_OPEN': 75,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'cracking',
  },
  {
    label: '⚠ PSV-101 Lifting',
    phase: 'trip',
    'V-101_PRESSURE': 73.1, 'V-101_LEVEL': 59.2, 'V-101_TEMP': 78.0,
    'V-101_GAS_FLOW': 13.5, 'V-101_OIL_FLOW': 92.0,
    'E-101_TEMP': 92.5, 'E-101_LEVEL': 57.2,
    'P-101A_VIB': 13.8, 'P-101A_FLOW': 85.0,
    'P-101B_VIB': 3.5,
    'LCV-101_OPEN': 92, 'PCV-101_OPEN': 98, 'TCV-101_OPEN': 60,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'open',
  },
  // t=30s SDV-101 closes (ESD sequence)
  {
    label: 'ESD: SDV-101 CLOSING',
    phase: 'esd',
    'V-101_PRESSURE': 73.5, 'V-101_LEVEL': 59.8, 'V-101_TEMP': 78.3,
    'V-101_GAS_FLOW': 14.0, 'V-101_OIL_FLOW': 78.0,
    'E-101_TEMP': 92.0, 'E-101_LEVEL': 56.0,
    'P-101A_VIB': 15.2, 'P-101A_FLOW': 70.0,
    'P-101B_VIB': 3.5,
    'LCV-101_OPEN': 95, 'PCV-101_OPEN': 100, 'TCV-101_OPEN': 30,
    'SDV-101_STATE': 'closed', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'open',
  },
  {
    label: 'ESD Active — P-101B Auto-Start',
    phase: 'esd',
    'V-101_PRESSURE': 72.8, 'V-101_LEVEL': 59.0, 'V-101_TEMP': 77.8,
    'V-101_GAS_FLOW': 13.2, 'V-101_OIL_FLOW': 85.0,
    'E-101_TEMP': 91.5, 'E-101_LEVEL': 55.0,
    'P-101A_VIB': 14.0, 'P-101A_FLOW': 40.0,
    'P-101B_VIB': 8.5, // P-101B starting
    'LCV-101_OPEN': 90, 'PCV-101_OPEN': 100, 'TCV-101_OPEN': 20,
    'SDV-101_STATE': 'closed', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'open',
  },
  {
    label: 'Pressure Dropping',
    phase: 'recovery',
    'V-101_PRESSURE': 71.5, 'V-101_LEVEL': 57.5, 'V-101_TEMP': 77.0,
    'V-101_GAS_FLOW': 12.0, 'V-101_OIL_FLOW': 105.0,
    'E-101_TEMP': 90.5, 'E-101_LEVEL': 53.5,
    'P-101A_VIB': 12.5, 'P-101A_FLOW': 20.0,
    'P-101B_VIB': 7.2, // P-101B running
    'LCV-101_OPEN': 82, 'PCV-101_OPEN': 88, 'TCV-101_OPEN': 30,
    'SDV-101_STATE': 'closed', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'Pressure Normalizing',
    phase: 'recovery',
    'V-101_PRESSURE': 70.2, 'V-101_LEVEL': 55.0, 'V-101_TEMP': 76.0,
    'V-101_GAS_FLOW': 10.8, 'V-101_OIL_FLOW': 110.0,
    'E-101_TEMP': 89.2, 'E-101_LEVEL': 52.0,
    'P-101A_VIB': 10.0, 'P-101A_FLOW': 0,
    'P-101B_VIB': 6.5,
    'LCV-101_OPEN': 68, 'PCV-101_OPEN': 70, 'TCV-101_OPEN': 50,
    'SDV-101_STATE': 'closed', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'Operators Investigating',
    phase: 'recovery',
    'V-101_PRESSURE': 69.0, 'V-101_LEVEL': 52.8, 'V-101_TEMP': 75.5,
    'V-101_GAS_FLOW': 10.1, 'V-101_OIL_FLOW': 112.0,
    'E-101_TEMP': 88.5, 'E-101_LEVEL': 51.0,
    'P-101A_VIB': 8.5, 'P-101A_FLOW': 0,
    'P-101B_VIB': 5.8,
    'LCV-101_OPEN': 58, 'PCV-101_OPEN': 55, 'TCV-101_OPEN': 62,
    'SDV-101_STATE': 'closed', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'SDV-101 Reopened',
    phase: 'recovery',
    'V-101_PRESSURE': 68.1, 'V-101_LEVEL': 50.5, 'V-101_TEMP': 75.0,
    'V-101_GAS_FLOW': 9.8, 'V-101_OIL_FLOW': 114.0,
    'E-101_TEMP': 87.9, 'E-101_LEVEL': 50.5,
    'P-101A_VIB': 7.0, 'P-101A_FLOW': 0,
    'P-101B_VIB': 4.5,
    'LCV-101_OPEN': 52, 'PCV-101_OPEN': 45, 'TCV-101_OPEN': 65,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  // Recovering...
  {
    label: 'Stabilizing',
    phase: 'recovery',
    'V-101_PRESSURE': 67.8, 'V-101_LEVEL': 49.5, 'V-101_TEMP': 74.8,
    'V-101_GAS_FLOW': 9.7, 'V-101_OIL_FLOW': 116.0,
    'E-101_TEMP': 87.5, 'E-101_LEVEL': 50.2,
    'P-101A_VIB': 5.5, 'P-101A_FLOW': 0,
    'P-101B_VIB': 3.9,
    'LCV-101_OPEN': 54, 'PCV-101_OPEN': 43, 'TCV-101_OPEN': 65,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'Near Normal',
    phase: 'recovery',
    'V-101_PRESSURE': 67.4, 'V-101_LEVEL': 49.0, 'V-101_TEMP': 74.5,
    'V-101_GAS_FLOW': 9.8, 'V-101_OIL_FLOW': 117.0,
    'E-101_TEMP': 87.3, 'E-101_LEVEL': 50.8,
    'P-101A_VIB': 4.2, 'P-101A_FLOW': 0,
    'P-101B_VIB': 3.3,
    'LCV-101_OPEN': 54, 'PCV-101_OPEN': 42, 'TCV-101_OPEN': 65,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
  {
    label: 'Normal Operations Resumed',
    phase: 'normal',
    'V-101_PRESSURE': 67.2, 'V-101_LEVEL': 48.8, 'V-101_TEMP': 74.2,
    'V-101_GAS_FLOW': 9.8, 'V-101_OIL_FLOW': 118.0,
    'E-101_TEMP': 87.2, 'E-101_LEVEL': 51.0,
    'P-101A_VIB': 3.5, 'P-101A_FLOW': 0,
    'P-101B_VIB': 3.0,
    'LCV-101_OPEN': 55, 'PCV-101_OPEN': 42, 'TCV-101_OPEN': 65,
    'SDV-101_STATE': 'open', 'SDV-201_STATE': 'open', 'SDV-102_STATE': 'open',
    'PSV-101_STATE': 'closed',
  },
];

const STEP_DURATION_MS = 3000; // 3s per step

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpStep(prev, next, t) {
  const result = {};
  for (const key of Object.keys(next)) {
    const a = prev[key];
    const b = next[key];
    if (typeof a === 'number' && typeof b === 'number') {
      result[key] = lerp(a, b, t);
    } else {
      result[key] = t > 0.5 ? b : a;
    }
  }
  return result;
}

export function useLiveTelemetrySimulator() {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepT, setStepT] = useState(0);
  const [data, setData] = useState(SCENARIO_STEPS[0]);
  const [paused, setPaused] = useState(false);
  const stepStart = useRef(Date.now());
  const animFrameRef = useRef(null);
  const pausedRef = useRef(false);
  const pausedAt = useRef(0); // elapsed when paused

  // Keep ref in sync so rAF callback doesn't close over stale value
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    function tick() {
      if (!pausedRef.current) {
        const now = Date.now();
        const elapsed = now - stepStart.current;
        const t = Math.min(elapsed / STEP_DURATION_MS, 1.0);
        setStepT(t);
        setStepIndex(prev => {
          const si = prev;
          const ni = (si + 1) % SCENARIO_STEPS.length;
          const interpolated = lerpStep(SCENARIO_STEPS[si], SCENARIO_STEPS[ni], t);
          setData(interpolated);
          if (t >= 1.0) {
            stepStart.current = Date.now();
            return ni;
          }
          return si;
        });
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const togglePause = () => {
    setPaused(p => {
      if (!p) {
        // pausing — record how far through step we are
        pausedAt.current = Date.now() - stepStart.current;
      } else {
        // resuming — shift stepStart so elapsed is preserved
        stepStart.current = Date.now() - pausedAt.current;
      }
      return !p;
    });
  };

  const restart = () => {
    setStepIndex(0);
    setStepT(0);
    setData(SCENARIO_STEPS[0]);
    stepStart.current = Date.now();
    pausedAt.current = 0;
    setPaused(false);
    pausedRef.current = false;
  };

  const current = SCENARIO_STEPS[stepIndex];
  const phase = current?.phase || 'normal';
  const label = current?.label || '';

  return { data, phase, label, stepIndex, totalSteps: SCENARIO_STEPS.length, stepT, paused, togglePause, restart };
}
