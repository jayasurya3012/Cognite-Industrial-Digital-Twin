/**
 * Enriched Plant Data — Oil Separation Unit Train 1
 *
 * All positions are derived from the original SVG P&ID coordinates,
 * normalized with a consistent scale factor and centered around origin.
 */

const SCALE = 0.015;
const CENTER_X = 1400;
const CENTER_Y = 900;

function pos(x, y, elevation = 0) {
  return {
    x: (x - CENTER_X) * SCALE,
    y: elevation,
    z: (y - CENTER_Y) * SCALE,
  };
}

export const assets = [
  {
    id: 'E-101',
    name: 'Inlet Heater',
    type: 'heater',
    description: 'Shell & tube heat exchanger — heats incoming crude',
    position: pos(430, 855, 1),
    status: 'operational',
  },
  {
    id: 'V-101',
    name: 'Three-Phase Separator',
    type: 'separator',
    description: 'Separates oil, gas, and water phases',
    position: pos(940, 840, 1.5),
    status: 'operational',
  },
  {
    id: 'P-101A',
    name: 'Oil Transfer Pump A',
    type: 'pump',
    description: 'Centrifugal pump — transfers oil downstream',
    position: pos(680, 1235, 0.5),
    status: 'operational',
  },
  {
    id: 'P-101B',
    name: 'Oil Transfer Pump B',
    type: 'pump',
    description: 'Standby centrifugal pump',
    position: pos(890, 1235, 0.5),
    status: 'standby',
  },
  {
    id: 'V-102',
    name: 'Water Knockout Drum',
    type: 'separator',
    description: 'Removes residual water from oil stream',
    position: pos(2300, 1260, 1.5),
    status: 'operational',
  },
  {
    id: 'E-102',
    name: 'Gas Cooler',
    type: 'heater',
    description: 'Cools separated gas before compression',
    position: pos(2380, 465, 1),
    status: 'warning',
  },
];

export const valves = [
  {
    id: 'TCV-101',
    name: 'Temperature Control Valve',
    type: 'control',
    position: pos(760, 777, 0.8),
    state: 'throttled',
    openPercent: 65,
    connectedAsset: 'E-101',
  },
  {
    id: 'SDV-101',
    name: 'Inlet Shutdown Valve',
    type: 'shutdown',
    position: pos(245, 731, 0.8),
    state: 'open',
    openPercent: 100,
    connectedAsset: 'E-101',
  },
  {
    id: 'PSV-101',
    name: 'Pressure Safety Valve',
    type: 'relief',
    position: pos(860, 727, 0.8),
    state: 'closed',
    openPercent: 0,
    connectedAsset: 'V-101',
  },
  {
    id: 'PCV-101',
    name: 'Pressure Control Valve',
    type: 'control',
    position: pos(1420, 612, 0.8),
    state: 'throttled',
    openPercent: 42,
    connectedAsset: 'V-101',
  },
  {
    id: 'SDV-201',
    name: 'Gas Outlet Shutdown Valve',
    type: 'shutdown',
    position: pos(1620, 456, 0.8),
    state: 'open',
    openPercent: 100,
    connectedAsset: 'E-102',
  },
  {
    id: 'LCV-101',
    name: 'Level Control Valve',
    type: 'control',
    position: pos(1310, 1032, 0.8),
    state: 'throttled',
    openPercent: 55,
    connectedAsset: 'V-101',
  },
  {
    id: 'SDV-102',
    name: 'Pump Suction Shutdown Valve',
    type: 'shutdown',
    position: pos(700, 1192, 0.8),
    state: 'open',
    openPercent: 100,
    connectedAsset: 'P-101A',
  },
];

export const sensors = [
  // Temperature sensors on E-101
  {
    id: 'TT101A',
    name: 'Inlet Temperature',
    type: 'temperature',
    unit: '°C',
    position: pos(560, 738, 2.5),
    attachedTo: 'E-101',
    range: [20, 150],
    setpoint: 85,
    thresholds: { warning: 110, critical: 130 },
  },
  {
    id: 'TT101B',
    name: 'Outlet Temperature',
    type: 'temperature',
    unit: '°C',
    position: pos(600, 738, 2.5),
    attachedTo: 'E-101',
    range: [20, 150],
    setpoint: 95,
    thresholds: { warning: 120, critical: 140 },
  },
  {
    id: 'TIC101',
    name: 'Temperature Controller',
    type: 'temperature',
    unit: '°C',
    position: pos(668, 670, 2.5),
    attachedTo: 'E-101',
    range: [20, 150],
    setpoint: 90,
    thresholds: { warning: 115, critical: 135 },
  },
  // Pressure sensors on V-101
  {
    id: 'PT101A',
    name: 'Separator Pressure A',
    type: 'pressure',
    unit: 'bar',
    position: pos(980, 658, 2.5),
    attachedTo: 'V-101',
    range: [0, 50],
    setpoint: 12,
    thresholds: { warning: 35, critical: 45 },
  },
  {
    id: 'PT101B',
    name: 'Separator Pressure B',
    type: 'pressure',
    unit: 'bar',
    position: pos(1060, 658, 2.5),
    attachedTo: 'V-101',
    range: [0, 50],
    setpoint: 12,
    thresholds: { warning: 35, critical: 45 },
  },
  {
    id: 'PIC101',
    name: 'Pressure Controller',
    type: 'pressure',
    unit: 'bar',
    position: pos(1190, 580, 2.5),
    attachedTo: 'V-101',
    range: [0, 50],
    setpoint: 12,
    thresholds: { warning: 35, critical: 45 },
  },
  {
    id: 'PSHH101',
    name: 'High-High Pressure Switch',
    type: 'pressure',
    unit: 'bar',
    position: pos(920, 658, 2.5),
    attachedTo: 'V-101',
    range: [0, 50],
    setpoint: 12,
    thresholds: { warning: 30, critical: 42 },
  },
  // Level sensors on E-101
  {
    id: 'LT101A',
    name: 'Heater Level A',
    type: 'level',
    unit: '%',
    position: pos(591, 795, 2.5),
    attachedTo: 'E-101',
    range: [0, 100],
    setpoint: 50,
    thresholds: { warning: 80, critical: 95 },
  },
  {
    id: 'LT101B',
    name: 'Heater Level B',
    type: 'level',
    unit: '%',
    position: pos(591, 895, 2.5),
    attachedTo: 'E-101',
    range: [0, 100],
    setpoint: 50,
    thresholds: { warning: 80, critical: 95 },
  },
  // Level on V-101
  {
    id: 'LIC101',
    name: 'Separator Level Controller',
    type: 'level',
    unit: '%',
    position: pos(878, 705, 2.5),
    attachedTo: 'V-101',
    range: [0, 100],
    setpoint: 45,
    thresholds: { warning: 75, critical: 90 },
  },
  {
    id: 'LALL101',
    name: 'Low-Low Level Alarm',
    type: 'level',
    unit: '%',
    position: pos(591, 925, 2.5),
    attachedTo: 'E-101',
    range: [0, 100],
    setpoint: 50,
    thresholds: { warning: 15, critical: 5 },
  },
  // Flow sensors
  {
    id: 'FT101',
    name: 'Gas Outlet Flow',
    type: 'flow',
    unit: 'm³/h',
    position: pos(1300, 468, 2.5),
    attachedTo: 'V-101',
    range: [0, 500],
    setpoint: 250,
    thresholds: { warning: 400, critical: 470 },
  },
  {
    id: 'FIC101',
    name: 'Gas Flow Controller',
    type: 'flow',
    unit: 'm³/h',
    position: pos(1408, 405, 2.5),
    attachedTo: 'V-101',
    range: [0, 500],
    setpoint: 250,
    thresholds: { warning: 400, critical: 470 },
  },
  {
    id: 'PT201',
    name: 'Gas Cooler Pressure',
    type: 'pressure',
    unit: 'bar',
    position: pos(1900, 468, 2.5),
    attachedTo: 'E-102',
    range: [0, 30],
    setpoint: 8,
    thresholds: { warning: 20, critical: 27 },
  },
  {
    id: 'FT102',
    name: 'Oil Outlet Flow',
    type: 'flow',
    unit: 'm³/h',
    position: pos(1380, 1082, 2.5),
    attachedTo: 'V-101',
    range: [0, 200],
    setpoint: 120,
    thresholds: { warning: 170, critical: 190 },
  },
  {
    id: 'FIC102',
    name: 'Oil Flow Controller',
    type: 'flow',
    unit: 'm³/h',
    position: pos(1488, 1145, 2.5),
    attachedTo: 'P-101B',
    range: [0, 200],
    setpoint: 120,
    thresholds: { warning: 170, critical: 190 },
  },
  {
    id: 'VT301',
    name: 'Pump Vibration',
    type: 'vibration',
    unit: 'mm/s',
    position: pos(573, 1170, 2.5),
    attachedTo: 'P-101A',
    range: [0, 25],
    setpoint: 4,
    thresholds: { warning: 11, critical: 18 },
  },
  {
    id: 'FT103',
    name: 'Water Outlet Flow',
    type: 'flow',
    unit: 'm³/h',
    position: pos(1800, 1048, 2.5),
    attachedTo: 'V-102',
    range: [0, 100],
    setpoint: 40,
    thresholds: { warning: 80, critical: 95 },
  },
  {
    id: 'LT103',
    name: 'Knockout Drum Level',
    type: 'level',
    unit: '%',
    position: pos(2031, 1235, 2.5),
    attachedTo: 'V-102',
    range: [0, 100],
    setpoint: 40,
    thresholds: { warning: 75, critical: 90 },
  },
  {
    id: 'PT103',
    name: 'Knockout Drum Pressure',
    type: 'pressure',
    unit: 'bar',
    position: pos(2290, 1098, 2.5),
    attachedTo: 'V-102',
    range: [0, 20],
    setpoint: 5,
    thresholds: { warning: 14, critical: 18 },
  },
];

/**
 * Pipe connections defining the flow topology.
 * Each connection has a source, target, and intermediate waypoints.
 * Flow direction: from → to.
 */
export const connections = [
  // Feed → Inlet Shutdown Valve → E-101
  {
    id: 'pipe-feed-sdv101',
    from: null,
    to: 'SDV-101',
    label: 'Feed Inlet',
    waypoints: [pos(100, 731, 0.8), pos(245, 731, 0.8)],
  },
  {
    id: 'pipe-sdv101-e101',
    from: 'SDV-101',
    to: 'E-101',
    label: 'Feed to Heater',
    waypoints: [pos(245, 731, 0.8), pos(350, 780, 0.8), pos(430, 855, 1)],
  },
  // E-101 → TCV-101 → V-101
  {
    id: 'pipe-e101-tcv101',
    from: 'E-101',
    to: 'TCV-101',
    label: 'Heated Crude',
    waypoints: [pos(430, 855, 1), pos(600, 800, 0.8), pos(760, 777, 0.8)],
  },
  {
    id: 'pipe-tcv101-v101',
    from: 'TCV-101',
    to: 'V-101',
    label: 'To Separator',
    waypoints: [pos(760, 777, 0.8), pos(860, 810, 1.2), pos(940, 840, 1.5)],
  },
  // V-101 gas out → PCV-101 → SDV-201 → E-102
  {
    id: 'pipe-v101-pcv101',
    from: 'V-101',
    to: 'PCV-101',
    label: 'Gas Outlet',
    waypoints: [pos(940, 720, 2.5), pos(1100, 650, 2.0), pos(1420, 612, 0.8)],
  },
  {
    id: 'pipe-pcv101-sdv201',
    from: 'PCV-101',
    to: 'SDV-201',
    label: 'Pressure Controlled Gas',
    waypoints: [pos(1420, 612, 0.8), pos(1520, 530, 0.8), pos(1620, 456, 0.8)],
  },
  {
    id: 'pipe-sdv201-e102',
    from: 'SDV-201',
    to: 'E-102',
    label: 'Gas to Cooler',
    waypoints: [pos(1620, 456, 0.8), pos(2000, 465, 1), pos(2380, 465, 1)],
  },
  // V-101 oil out → LCV-101 → SDV-102 → P-101A
  {
    id: 'pipe-v101-lcv101',
    from: 'V-101',
    to: 'LCV-101',
    label: 'Oil Outlet',
    waypoints: [pos(940, 960, 0.5), pos(1100, 1000, 0.5), pos(1310, 1032, 0.8)],
  },
  {
    id: 'pipe-lcv101-sdv102',
    from: 'LCV-101',
    to: 'SDV-102',
    label: 'Level Controlled Oil',
    waypoints: [pos(1310, 1032, 0.8), pos(1000, 1100, 0.6), pos(700, 1192, 0.8)],
  },
  {
    id: 'pipe-sdv102-p101a',
    from: 'SDV-102',
    to: 'P-101A',
    label: 'Oil to Pump',
    waypoints: [pos(700, 1192, 0.8), pos(680, 1220, 0.5), pos(680, 1235, 0.5)],
  },
  // P-101A → V-102
  {
    id: 'pipe-p101a-v102',
    from: 'P-101A',
    to: 'V-102',
    label: 'Oil to Knockout',
    waypoints: [
      pos(680, 1235, 0.5),
      pos(1200, 1260, 0.5),
      pos(1800, 1260, 0.8),
      pos(2300, 1260, 1.5),
    ],
  },
  // P-101B (standby) connected to same header
  {
    id: 'pipe-p101b-header',
    from: 'P-101B',
    to: 'V-102',
    label: 'Standby Pump Line',
    waypoints: [
      pos(890, 1235, 0.5),
      pos(1200, 1280, 0.5),
      pos(1800, 1280, 0.8),
      pos(2300, 1260, 1.5),
    ],
  },
];

/**
 * Get all sensors attached to a given asset.
 */
export function getSensorsForAsset(assetId) {
  return sensors.filter((s) => s.attachedTo === assetId);
}

/**
 * Get all valves connected to a given asset.
 */
export function getValvesForAsset(assetId) {
  return valves.filter((v) => v.connectedAsset === assetId);
}

/**
 * Get all connections involving a given asset/valve.
 */
export function getConnectionsForNode(nodeId) {
  return connections.filter((c) => c.from === nodeId || c.to === nodeId);
}

/**
 * Build asset hierarchy for the sidebar tree.
 */
export function getAssetHierarchy() {
  const groups = {
    'Heat Exchangers': assets.filter((a) => a.type === 'heater'),
    Vessels: assets.filter((a) => a.type === 'separator'),
    Pumps: assets.filter((a) => a.type === 'pump'),
  };
  return groups;
}
