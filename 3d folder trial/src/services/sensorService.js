/**
 * Sensor Service — Abstraction layer for sensor data.
 *
 * Currently backed by the local simulation.
 * Designed to be swapped out for WebSocket / REST API connections
 * in a production environment.
 */

import usePlantStore from '../hooks/usePlantStore';

/**
 * Get the latest value for a specific sensor.
 * @param {string} sensorId
 * @returns {{ value: number, timestamp: number, status: string } | null}
 */
export function getLatestValue(sensorId) {
  const values = usePlantStore.getState().sensorValues;
  return values[sensorId] || null;
}

/**
 * Get all current sensor values.
 * @returns {Object} Map of sensorId → { value, timestamp, status }
 */
export function getAllValues() {
  return usePlantStore.getState().sensorValues;
}

/**
 * Subscribe to value changes for a specific sensor.
 * @param {string} sensorId
 * @param {function} callback - Called with { value, timestamp, status }
 * @returns {function} Unsubscribe function
 */
export function subscribe(sensorId, callback) {
  return usePlantStore.subscribe(
    (state) => state.sensorValues[sensorId],
    (newVal) => {
      if (newVal) callback(newVal);
    }
  );
}

/**
 * Subscribe to all sensor value changes.
 * @param {function} callback - Called with full sensorValues object
 * @returns {function} Unsubscribe function
 */
export function subscribeAll(callback) {
  return usePlantStore.subscribe(
    (state) => state.sensorValues,
    (newVals) => callback(newVals)
  );
}
