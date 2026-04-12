/**
 * Live Telemetry Data Hook
 * Fetches latest sensor readings from Supabase, simulates live polling,
 * and computes asset health status based on sensor_metadata safe envelopes.
 * 
 * Track 2: Proactive — continuously monitors for V-101 pressure approaching 72 barg trip point.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { LiveSensorReading, AssetHealth, ProactiveAlert, SensorMetadata } from '@/lib/types';

// V-101 pressure alarm threshold per instructions.md (Track 2)
const V101_PRESSURE_SENSOR = 'PT101A';
const V101_MAWP = 75; // barg — absolute safety limit
const V101_TRIP_WARN = 72; // barg — proactive compliance guardrail

function computeStatus(value: number, meta: SensorMetadata, qualityFlag: string): 'GOOD' | 'ALARM' | 'TRIP' | 'OFFLINE' {
  if (qualityFlag === 'BAD') return 'OFFLINE';
  if (value >= meta.trip_high || value <= meta.trip_low) return 'TRIP';
  if (value >= meta.alarm_high || value <= meta.alarm_low) return 'ALARM';
  return 'GOOD';
}

export function useLiveTelemetry() {
  const [assetHealth, setAssetHealth] = useState<AssetHealth[]>([]);
  const [readings, setReadings] = useState<LiveSensorReading[]>([]);
  const [proactiveAlerts, setProactiveAlerts] = useState<ProactiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      // Fetch latest sensor readings using the DB view
      const { data: latestData, error: err } = await supabase
        .from('latest_sensor_readings')
        .select('*');

      if (err) throw err;
      if (!latestData || latestData.length === 0) {
        // Fallback to mock data when DB is empty (development)
        useMockData(setReadings, setAssetHealth, setProactiveAlerts);
        setLoading(false);
        return;
      }

      const liveReadings: LiveSensorReading[] = latestData.map((row: any) => ({
        sensor_id: row.sensor_id,
        asset_id: row.asset_id,
        value: parseFloat(row.value),
        unit: row.unit,
        quality_flag: row.quality_flag,
        status: row.status as any,
        sensor_type: row.sensor_type,
        timestamp: row.timestamp,
      }));

      setReadings(liveReadings);

      // Group by asset
      const assetMap: Record<string, LiveSensorReading[]> = {};
      liveReadings.forEach(r => {
        if (!assetMap[r.asset_id]) assetMap[r.asset_id] = [];
        assetMap[r.asset_id].push(r);
      });

      const healthArr: AssetHealth[] = Object.entries(assetMap).map(([id, sensors]) => {
        const order: Record<string, number> = { TRIP: 3, ALARM: 2, OFFLINE: 1, GOOD: 0 };
        const worstStatus = sensors.reduce<string>((worst, s) => {
          return ((order[s.status] ?? 0) > (order[worst] ?? 0)) ? s.status : worst;
        }, 'GOOD') as 'GOOD' | 'ALARM' | 'TRIP' | 'OFFLINE';
        return { asset_id: id, name: id, status: worstStatus, sensors };
      });

      setAssetHealth(healthArr);

      // ── Track 2: Proactive Alerts ──────────────────────────────────────
      const newAlerts: ProactiveAlert[] = [];
      const pressReading = liveReadings.find(r => r.sensor_id === V101_PRESSURE_SENSOR);
      if (pressReading) {
        if (pressReading.value >= V101_MAWP) {
          newAlerts.push({
            id: 'V101-MAWP-BREACH',
            asset_id: 'AREA-HP-SEP:V-101',
            asset_name: 'HP Production Separator V-101',
            severity: 'CRITICAL',
            message: `MAWP BREACH: V-101 pressure ${pressReading.value.toFixed(1)} barg exceeds 75 barg MAWP. IMMEDIATE SHUTDOWN REQUIRED.`,
            value: pressReading.value,
            unit: 'barg',
            threshold: V101_MAWP,
            cite: '[SOP-MAINT-001, Section 4.2 — Emergency Pressure Relief]',
            timestamp: new Date(),
          });
        } else if (pressReading.value >= V101_TRIP_WARN) {
          newAlerts.push({
            id: 'V101-PRESS-WARN',
            asset_id: 'AREA-HP-SEP:V-101',
            asset_name: 'HP Production Separator V-101',
            severity: 'WARNING',
            message: `HIGH PRESSURE WARNING: V-101 at ${pressReading.value.toFixed(1)} barg approaching trip at 72 barg. Review PCV-101 setpoint.`,
            value: pressReading.value,
            unit: 'barg',
            threshold: V101_TRIP_WARN,
            cite: '[RPT-INSPECT-001, Section 3 — Pressure Containment]',
            timestamp: new Date(),
          });
        }
      }

      // P-101 lubrication check — 14-day requirement per MAN-MECH-001
      const { data: lubData } = await supabase
        .from('maintenance_history')
        .select('completed_date, work_order_id')
        .eq('asset_id', 'AREA-HP-SEP:P-101')
        .ilike('actions_taken', '%lubrication%')
        .order('completed_date', { ascending: false })
        .limit(1);

      if (lubData && lubData.length > 0) {
        const lastLubDate = new Date(lubData[0].completed_date);
        const daysSince = Math.floor((Date.now() - lastLubDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 14) {
          newAlerts.push({
            id: 'P101-LUBRICATION',
            asset_id: 'AREA-HP-SEP:P-101',
            asset_name: 'HP Separator Drain Pump P-101A/B',
            severity: daysSince >= 21 ? 'CRITICAL' : 'WARNING',
            message: `P-101A/B lubrication OVERDUE by ${daysSince - 14} days (last: ${lastLubDate.toLocaleDateString()}). Bearing failure risk HIGH.`,
            cite: '[MAN-MECH-001 — 14-day Shell Gadus S2 V220 2 lubrication interval; WO-01001 bearing failure precedent]',
            timestamp: new Date(),
          });
        }
      }

      setProactiveAlerts(newAlerts);
      setLoading(false);
    } catch (e: any) {
      console.warn('Supabase query error, using mock data:', e.message);
      useMockData(setReadings, setAssetHealth, setProactiveAlerts);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    pollRef.current = setInterval(fetchTelemetry, 5000); // Poll every 5s for demo responsiveness
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchTelemetry]);

  // ---- TRACK 2 TRIGGER RULE (Database Watcher) ----
  // Runs whenever readings are updated, handling both live data and mock triggers cleanly.
  useEffect(() => {
    const pt101a = readings.find(r => 
      (r.sensor_id === 'PT-101A' || r.sensor_id === 'V-101-PRESS' || r.sensor_id === 'PT101A') &&
      r.quality_flag === 'GOOD'
    );
    
    if (pt101a && pt101a.value >= 72) {
      if (!sessionStorage.getItem('vapi_triggered')) {
        sessionStorage.setItem('vapi_triggered', 'true');
        console.warn(`[Track 2 Initiated] V-101 Pressure Breach detected: ${pt101a.value} barg.`);
        
        // Dispatch DOM event for Chat Panel sync
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('init-vapi-call', { detail: { value: pt101a.value, limit: 72, asset: 'V-101' } }));
        }

        // Trigger server-side Vapi Collaborative Agent outcall
        fetch('/api/vapi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset_id: 'AREA-HP-SEP:V-101', value: pt101a.value, limit: 72 })
        }).then(res => res.json()).catch(err => console.error("Vapi Call failed:", err));
      }
    }
  }, [readings]);

  return { readings, assetHealth, proactiveAlerts, loading, error, refetch: fetchTelemetry };
}

// ── Mock Data Fallback (dev / pre-ingestion) ──────────────────────────────────
function useMockData(
  setReadings: any,
  setAssetHealth: any,
  setProactiveAlerts: any
) {
  const now = new Date().toISOString();
    // Simulate V-101 pressure at 73 barg (trigger point for VAPI outcall test!)
  const readings: LiveSensorReading[] = [
    { sensor_id: 'PT101A', asset_id: 'AREA-HP-SEP:V-101', value: 73.1, unit: 'bar', quality_flag: 'GOOD', status: 'TRIP', sensor_type: 'PRESSURE', timestamp: now },
    { sensor_id: 'V-101-LEVEL', asset_id: 'AREA-HP-SEP:V-101', value: 52.3, unit: '%', quality_flag: 'GOOD', status: 'GOOD', sensor_type: 'LEVEL', timestamp: now },
    { sensor_id: 'V-101-TEMP', asset_id: 'AREA-HP-SEP:V-101', value: 67.4, unit: 'degC', quality_flag: 'GOOD', status: 'GOOD', sensor_type: 'TEMPERATURE', timestamp: now },
    { sensor_id: 'V-101-GAS_FLOW', asset_id: 'AREA-HP-SEP:V-101', value: 9.2, unit: 'MMscfd', quality_flag: 'GOOD', status: 'GOOD', sensor_type: 'FLOW', timestamp: now },
    { sensor_id: 'V-101-OIL_FLOW', asset_id: 'AREA-HP-SEP:V-101', value: 118.5, unit: 'm3/h', quality_flag: 'GOOD', status: 'GOOD', sensor_type: 'FLOW', timestamp: now },
    { sensor_id: 'P-101A-VIB', asset_id: 'AREA-HP-SEP:P-101', value: 7.8, unit: 'mm/s', quality_flag: 'GOOD', status: 'ALARM', sensor_type: 'VIBRATION', timestamp: now },
    { sensor_id: 'P-101B-VIB', asset_id: 'AREA-HP-SEP:P-101', value: 2.4, unit: 'mm/s', quality_flag: 'GOOD', status: 'GOOD', sensor_type: 'VIBRATION', timestamp: now },
    { sensor_id: 'V-102-PRESS', asset_id: 'AREA-HP-SEP:V-102', value: 42.1, unit: 'bar', quality_flag: 'GOOD', status: 'GOOD', sensor_type: 'PRESSURE', timestamp: now },
    { sensor_id: 'E-101-TEMP', asset_id: 'AREA-HP-SEP:E-101', value: 76.3, unit: 'degC', quality_flag: 'GOOD', status: 'GOOD', sensor_type: 'TEMPERATURE', timestamp: now },
  ];
  setReadings(readings);

  setAssetHealth([
    { asset_id: 'AREA-HP-SEP:V-101', name: 'HP Production Separator V-101', status: 'ALARM', sensors: readings.filter(r => r.asset_id.includes('V-101')) },
    { asset_id: 'AREA-HP-SEP:P-101', name: 'HP Separator Drain Pump P-101A/B', status: 'ALARM', sensors: readings.filter(r => r.asset_id.includes('P-101')) },
    { asset_id: 'AREA-HP-SEP:V-102', name: 'Test Separator V-102', status: 'GOOD', sensors: readings.filter(r => r.asset_id.includes('V-102')) },
    { asset_id: 'AREA-HP-SEP:E-101', name: 'Wellstream Heater E-101', status: 'GOOD', sensors: readings.filter(r => r.asset_id.includes('E-101')) },
  ]);

  setProactiveAlerts([
    {
      id: 'V101-PRESS-WARN',
      asset_id: 'AREA-HP-SEP:V-101',
      asset_name: 'HP Production Separator V-101',
      severity: 'WARNING',
      message: 'HIGH PRESSURE WARNING: V-101 at 71.5 barg approaching trip at 72 barg. Review PCV-101 setpoint.',
      value: 71.5,
      unit: 'barg',
      threshold: 72,
      cite: '[RPT-INSPECT-001, Section 3 — Pressure Containment]',
      timestamp: new Date(),
    },
    {
      id: 'P101-LUBRICATION',
      asset_id: 'AREA-HP-SEP:P-101',
      asset_name: 'HP Separator Drain Pump P-101A/B',
      severity: 'WARNING',
      message: 'P-101A/B lubrication OVERDUE. Last completed: Nov 12, 2025. Re-establish 2-weekly schedule immediately.',
      cite: '[MAN-MECH-001 — Shell Gadus S2 V220 2, 14-day interval; WO-01001]',
      timestamp: new Date(),
    },
  ]);
}
