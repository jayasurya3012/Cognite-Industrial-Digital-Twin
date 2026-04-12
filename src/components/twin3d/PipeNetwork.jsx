import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Coordinate transform matching Scene.jsx ──────────────────────────────────
const SCALE = 0.015;
const CENTER_X = 1400;
const CENTER_Y = 900;

function p(x, y, elev = 0) {
  return new THREE.Vector3(
    (x - CENTER_X) * SCALE,
    elev,
    (y - CENTER_Y) * SCALE
  );
}

/**
 * Full P&ID pipe network derived from pid_hp_separation_train.svg
 * Every line on the P&ID is represented here by waypoints.
 */
function buildConnections(telemetry) {
  const sdv101Open = telemetry?.['SDV-101_STATE'] !== 'closed';
  const sdv201Open = telemetry?.['SDV-201_STATE'] !== 'closed';
  const sdv102Open = telemetry?.['SDV-102_STATE'] !== 'closed';
  const psvOpen    = telemetry?.['PSV-101_STATE'] === 'open' || telemetry?.['PSV-101_STATE'] === 'cracking';
  const phase      = telemetry?._phase || 'normal';
  const p101aFlow  = telemetry?.['P-101A_FLOW'] ?? 118;
  const p101bVib   = telemetry?.['P-101B_VIB'] ?? 2.8;
  const p101bActive = p101bVib > 5; // P-101B started

  // Flow speed: scaled 0-1 based on flow rate
  const gasFlowSpeed  = Math.min(1, (telemetry?.['V-101_GAS_FLOW'] || 9.8) / 15);
  const oilFlowSpeed  = Math.min(1, (telemetry?.['V-101_OIL_FLOW'] || 118) / 140);
  const waterFlowSpeed = 0.3;
  const p101aSpeed    = p101aFlow > 0 ? Math.min(1, p101aFlow / 120) : 0;
  const p101bSpeed    = p101bActive ? 0.6 : 0;

  return [
    // ── Feed inlet line: Wellstream header → SDV-101 ────────────────────────
    {
      id: 'feed-inlet',
      label: 'Wellstream Feed NPA-01-PL-001',
      type: 'feed',
      flowSpeed: sdv101Open ? 0.8 : 0,
      active: sdv101Open,
      waypoints: [
        p(150, 850, 1.2), p(200, 850, 1.2), p(245, 850, 1.2),
      ],
    },
    // ── Feed: SDV-101 → E-101 ──────────────────────────────────────────────
    {
      id: 'sdv101-e101',
      label: 'Feed to Heater',
      type: 'feed',
      flowSpeed: sdv101Open ? 0.8 : 0,
      active: sdv101Open,
      waypoints: [
        p(245, 850, 1.2), p(280, 850, 1.0), p(350, 850, 0.8), p(430, 855, 0.8),
      ],
    },
    // ── E-101 → TCV-101 → V-101 (main process line) ───────────────────────
    {
      id: 'e101-tcv101',
      label: 'Heated Wellstream NPA-01-PL-001',
      type: 'process',
      flowSpeed: sdv101Open ? 0.75 : 0,
      active: true,
      waypoints: [
        p(510, 850, 0.8), p(600, 840, 0.8), p(680, 820, 0.8), p(760, 777, 0.8),
      ],
    },
    {
      id: 'tcv101-v101',
      label: 'To Separator',
      type: 'process',
      flowSpeed: sdv101Open ? 0.7 : 0,
      active: true,
      waypoints: [
        p(760, 777, 0.8), p(830, 790, 0.9), p(880, 810, 1.2), p(940, 840, 1.5),
      ],
    },
    // ── V-101 Gas Outlet → FT-101 → PCV-101 → SDV-201 → E-102 ─────────────
    {
      id: 'v101-ft101-pcv101',
      label: 'Gas Outlet NPA-01-GS-002',
      type: 'gas',
      flowSpeed: gasFlowSpeed,
      active: true,
      waypoints: [
        p(1040, 740, 2.5), p(1040, 640, 2.5), p(1040, 570, 2.5),
        p(1200, 570, 2.5), p(1300, 570, 2.5), p(1420, 570, 0.8),
      ],
    },
    {
      id: 'pcv101-sdv201',
      label: 'Pressure Controlled Gas NPA-01-GS-003',
      type: 'gas',
      flowSpeed: sdv201Open ? gasFlowSpeed * 0.95 : 0,
      active: sdv201Open,
      waypoints: [
        p(1420, 570, 0.8), p(1530, 570, 0.8), p(1620, 490, 0.8), p(1620, 456, 0.8),
      ],
    },
    {
      id: 'sdv201-e102',
      label: 'Gas to Glycol Unit',
      type: 'gas',
      flowSpeed: sdv201Open ? gasFlowSpeed * 0.9 : 0,
      active: sdv201Open,
      waypoints: [
        p(1620, 456, 0.8), p(1800, 462, 0.8), p(2100, 465, 0.8),
        p(2310, 465, 1.0), p(2380, 465, 1.0),
      ],
    },
    // ── PSV-101 → Flare header (open when tripping) ──────────────────────
    {
      id: 'psv101-flare',
      label: '→ Flare Header NPA-FL-001',
      type: 'flare',
      flowSpeed: psvOpen ? 1.0 : 0,
      active: psvOpen,
      waypoints: [
        p(860, 680, 1.5), p(860, 610, 1.5), p(1200, 610, 1.5),
        p(2000, 610, 1.5), p(2700, 610, 1.5),
      ],
    },
    // ── V-101 Oil Outlet → LCV-101 → SDV-102 → P-101A/B ─────────────────
    {
      id: 'v101-lcv101',
      label: 'Oil Outlet NPA-01-OL-003',
      type: 'oil',
      flowSpeed: oilFlowSpeed,
      active: true,
      waypoints: [
        p(1240, 850, 1.2), p(1290, 880, 0.8), p(1290, 990, 0.5),
        p(1310, 990, 0.5),
      ],
    },
    {
      id: 'lcv101-sdv102',
      label: 'Level Controlled Oil NPA-01-OL-004',
      type: 'oil',
      flowSpeed: sdv102Open ? oilFlowSpeed * 0.95 : 0,
      active: sdv102Open,
      waypoints: [
        p(1310, 990, 0.5), p(1000, 1070, 0.5), p(820, 1070, 0.5),
        p(700, 1150, 0.6), p(700, 1192, 0.8),
      ],
    },
    // ── SDV-102 → Pump suction header → P-101A ───────────────────────────
    {
      id: 'sdv102-p101a',
      label: 'Pump Suction NPA-01-PW-004',
      type: 'oil',
      flowSpeed: sdv102Open ? oilFlowSpeed * 0.9 : 0,
      active: sdv102Open,
      waypoints: [
        p(700, 1150, 0.5), p(680, 1170, 0.5), p(680, 1200, 0.4),
      ],
    },
    // ── P-101A discharge → Oil export header → V-102 ────────────────────
    {
      id: 'p101a-v102',
      label: 'P-101A Discharge NPA-01-PW-005',
      type: 'oil',
      flowSpeed: p101aSpeed,
      active: p101aFlow > 0,
      waypoints: [
        p(680, 1280, 0.3), p(800, 1290, 0.4), p(1000, 1280, 0.5),
        p(1400, 1260, 0.5), p(1800, 1260, 0.6), p(2170, 1260, 1.2),
        p(2300, 1260, 1.5),
      ],
    },
    // ── P-101B → same oil header (standby / auto-start) ──────────────────
    {
      id: 'p101b-header',
      label: 'P-101B Standby Discharge',
      type: 'oil',
      flowSpeed: p101bSpeed,
      active: p101bActive,
      waypoints: [
        p(890, 1280, 0.3), p(1000, 1290, 0.4),
        p(1400, 1275, 0.5), p(1800, 1270, 0.6), p(2170, 1260, 1.2),
      ],
    },
    // ── V-101 water outlet (produced water) ──────────────────────────────
    {
      id: 'v101-water-out',
      label: 'Produced Water Outlet',
      type: 'water',
      flowSpeed: waterFlowSpeed,
      active: true,
      waypoints: [
        p(820, 960, 0.5), p(820, 1050, 0.4), p(820, 1150, 0.4),
        p(1000, 1150, 0.4), p(1800, 1150, 0.4),
        p(2078, 1150, 0.4), p(2078, 1270, 0.4),
      ],
    },
    // ── V-102 → export (to P-501) ─────────────────────────────────────────
    {
      id: 'v102-export',
      label: 'Oil Export to P-501',
      type: 'oil',
      flowSpeed: 0.4,
      active: true,
      waypoints: [
        p(2430, 1270, 1.2), p(2600, 1270, 0.8), p(2840, 1270, 0.6),
      ],
    },
  ];
}

// ── Color map by pipe type ───────────────────────────────────────────────────
const PIPE_COLORS = {
  feed:    { pipe: '#5a7a9a', glow: '#4488bb', flow: '#aaddff' },
  process: { pipe: '#6a7a5a', glow: '#558855', flow: '#aaffaa' },
  gas:     { pipe: '#9a7a3a', glow: '#cc9922', flow: '#ffffaa' },
  oil:     { pipe: '#7a5a3a', glow: '#996633', flow: '#ffcc88' },
  water:   { pipe: '#3a7a9a', glow: '#2266aa', flow: '#88ccff' },
  flare:   { pipe: '#9a2a2a', glow: '#cc2222', flow: '#ffaa44' },
};

/**
 * PipeNetwork — full P&ID pipe topology driven by live telemetry
 */
export default function PipeNetwork({ telemetry }) {
  const connections = useMemo(() => buildConnections(telemetry), [telemetry]);

  return (
    <group>
      {connections.map((connection) => (
        <Pipe key={connection.id} connection={connection} />
      ))}
    </group>
  );
}

// ── Individual animated pipe segment ─────────────────────────────────────────
function Pipe({ connection }) {
  const meshRef = useRef();
  const colors = PIPE_COLORS[connection.type] || PIPE_COLORS.process;

  const { tubeGeometry, curve } = useMemo(() => {
    const points = connection.waypoints;
    if (points.length < 2) return { tubeGeometry: null, curve: null };
    const c = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const radius = connection.type === 'gas' ? 0.18 : connection.type === 'flare' ? 0.12 : 0.16;
    const geo = new THREE.TubeGeometry(c, Math.max(12, points.length * 8), radius, 10, false);
    return { tubeGeometry: geo, curve: c };
  }, [connection.waypoints, connection.type]);

  // Pulsing emissive when active
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const baseIntensity = connection.active ? 0.08 : 0.02;
    const pulse = connection.active ? Math.sin(t * 3 + connection.id.length) * 0.04 : 0;
    meshRef.current.material.emissiveIntensity = baseIntensity + pulse;
    meshRef.current.material.opacity = connection.active ? 0.92 : 0.4;
  });

  if (!tubeGeometry) return null;

  return (
    <group>
      <mesh ref={meshRef} geometry={tubeGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={connection.active ? colors.pipe : '#334455'}
          roughness={0.4}
          metalness={0.7}
          emissive={colors.glow}
          emissiveIntensity={0.06}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Animated flow spheres */}
      {connection.active && connection.flowSpeed > 0 && (
        <FlowIndicators
          curve={curve}
          colors={colors}
          flowSpeed={connection.flowSpeed}
          pipeId={connection.id}
          type={connection.type}
        />
      )}

      {/* Flanges at start/end */}
      {connection.waypoints.length >= 2 && (
        <>
          <Flange position={connection.waypoints[0]} curve={curve} t={0} />
          <Flange position={connection.waypoints[connection.waypoints.length - 1]} curve={curve} t={1} />
        </>
      )}
    </group>
  );
}

// ── Animated flow indicators ──────────────────────────────────────────────────
function FlowIndicators({ curve, colors, flowSpeed, pipeId, type }) {
  const dotCount = type === 'gas' ? 5 : type === 'flare' ? 6 : 4;
  const dotsRef = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    dotsRef.current.forEach((dot, i) => {
      if (!dot || !curve) return;
      const offset = i / dotCount;
      const progress = ((t * flowSpeed * 0.18 + offset + pipeId.length * 0.05) % 1);
      const safeProgress = Math.max(0.001, Math.min(0.999, progress));
      try {
        const point = curve.getPointAt(safeProgress);
        dot.position.copy(point);
      } catch {}
    });
  });

  const radius = type === 'gas' ? 0.1 : type === 'flare' ? 0.14 : 0.08;

  return (
    <>
      {Array.from({ length: dotCount }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { dotsRef.current[i] = el; }}
        >
          <sphereGeometry args={[radius, 7, 7]} />
          <meshStandardMaterial
            color={colors.flow}
            emissive={colors.flow}
            emissiveIntensity={type === 'flare' ? 3.0 : type === 'gas' ? 2.0 : 1.5}
            toneMapped={false}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </>
  );
}

// ── Pipe flange ring ──────────────────────────────────────────────────────────
function Flange({ position, curve, t }) {
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    try {
      const safe = Math.max(0.01, Math.min(0.99, t));
      const tangent = curve.getTangentAt(safe);
      const up = new THREE.Vector3(0, 1, 0);
      q.setFromUnitVectors(up, tangent.normalize());
    } catch {}
    return q;
  }, [curve, t]);

  if (!position) return null;
  return (
    <mesh
      position={[position.x, position.y, position.z]}
      quaternion={quaternion}
    >
      <torusGeometry args={[0.22, 0.055, 8, 20]} />
      <meshStandardMaterial color="#5a6a80" roughness={0.3} metalness={0.85} />
    </mesh>
  );
}
