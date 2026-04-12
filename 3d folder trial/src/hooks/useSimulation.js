import { useEffect, useRef } from 'react';
import { sensors } from '../data/plantData';
import { getSensorStatus } from '../data/sensorConfig';
import usePlantStore from './usePlantStore';

/**
 * Simulates realistic time-series sensor data.
 * Each sensor type uses a different generation strategy
 * to produce believable industrial readings.
 */
export default function useSimulation(intervalMs = 1000) {
  const updateSensorValues = usePlantStore((s) => s.updateSensorValues);
  const valuesRef = useRef({});

  useEffect(() => {
    // Initialize values at setpoints
    sensors.forEach((sensor) => {
      valuesRef.current[sensor.id] = sensor.setpoint;
    });

    const tick = () => {
      const time = Date.now() / 1000;
      const updates = {};

      sensors.forEach((sensor) => {
        const prev = valuesRef.current[sensor.id] ?? sensor.setpoint;
        let next;

        switch (sensor.type) {
          case 'temperature':
            // Sinusoidal oscillation around setpoint with noise
            next =
              sensor.setpoint +
              Math.sin(time * 0.3 + sensor.id.charCodeAt(2)) * 8 +
              (Math.random() - 0.5) * 2;
            break;

          case 'pressure':
            // Random walk with mean reversion
            next =
              prev +
              (sensor.setpoint - prev) * 0.05 +
              (Math.random() - 0.5) * 1.5;
            break;

          case 'level':
            // Slow drift with occasional steps
            next =
              prev +
              (sensor.setpoint - prev) * 0.03 +
              (Math.random() - 0.5) * 2 +
              (Math.random() > 0.95 ? (Math.random() - 0.5) * 8 : 0);
            break;

          case 'flow':
            // Correlated with slight oscillation
            next =
              sensor.setpoint +
              Math.sin(time * 0.2 + sensor.id.charCodeAt(2)) * 15 +
              (Math.random() - 0.5) * 5;
            break;

          case 'vibration':
            // Low-frequency with spikes
            next =
              sensor.setpoint +
              Math.sin(time * 0.5) * 1.5 +
              (Math.random() - 0.5) * 0.8 +
              (Math.random() > 0.98 ? Math.random() * 6 : 0);
            break;

          default:
            next = prev + (Math.random() - 0.5) * 2;
        }

        // Clamp to sensor range
        next = Math.max(sensor.range[0], Math.min(sensor.range[1], next));
        valuesRef.current[sensor.id] = next;

        const status = getSensorStatus(next, sensor.thresholds, sensor.type);

        updates[sensor.id] = {
          value: next,
          timestamp: Date.now(),
          status,
        };
      });

      updateSensorValues(updates);
    };

    // Initial tick
    tick();

    const interval = setInterval(tick, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, updateSensorValues]);
}
