/**
 * Sensor type configuration — defines visual and behavioral properties
 * for each sensor category.
 */

export const sensorTypeConfig = {
  temperature: {
    icon: '🌡',
    label: 'Temperature',
    color: '#ff6b35',
    glowColor: '#ff4500',
    unit: '°C',
    format: (v) => `${v.toFixed(1)}°C`,
    getColor: (value, thresholds) => {
      if (value >= thresholds.critical) return '#ef4444';
      if (value >= thresholds.warning) return '#f59e0b';
      return '#22c55e';
    },
  },
  pressure: {
    icon: '⏲',
    label: 'Pressure',
    color: '#3b82f6',
    glowColor: '#1d4ed8',
    unit: 'bar',
    format: (v) => `${v.toFixed(1)} bar`,
    getColor: (value, thresholds) => {
      if (value >= thresholds.critical) return '#ef4444';
      if (value >= thresholds.warning) return '#f59e0b';
      return '#22c55e';
    },
  },
  level: {
    icon: '📊',
    label: 'Level',
    color: '#06b6d4',
    glowColor: '#0891b2',
    unit: '%',
    format: (v) => `${v.toFixed(1)}%`,
    getColor: (value, thresholds) => {
      // Level can be too high OR too low
      if (value >= thresholds.critical || value <= 5) return '#ef4444';
      if (value >= thresholds.warning || value <= 15) return '#f59e0b';
      return '#22c55e';
    },
  },
  flow: {
    icon: '🌊',
    label: 'Flow',
    color: '#8b5cf6',
    glowColor: '#7c3aed',
    unit: 'm³/h',
    format: (v) => `${v.toFixed(1)} m³/h`,
    getColor: (value, thresholds) => {
      if (value >= thresholds.critical) return '#ef4444';
      if (value >= thresholds.warning) return '#f59e0b';
      return '#22c55e';
    },
  },
  vibration: {
    icon: '📳',
    label: 'Vibration',
    color: '#ec4899',
    glowColor: '#db2777',
    unit: 'mm/s',
    format: (v) => `${v.toFixed(2)} mm/s`,
    getColor: (value, thresholds) => {
      if (value >= thresholds.critical) return '#ef4444';
      if (value >= thresholds.warning) return '#f59e0b';
      return '#22c55e';
    },
  },
};

/**
 * Get the status level for a sensor value based on its thresholds.
 * Returns 'normal', 'warning', or 'critical'.
 */
export function getSensorStatus(value, thresholds, type = 'default') {
  if (type === 'level') {
    if (value >= thresholds.critical || value <= 5) return 'critical';
    if (value >= thresholds.warning || value <= 15) return 'warning';
    return 'normal';
  }
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning) return 'warning';
  return 'normal';
}
