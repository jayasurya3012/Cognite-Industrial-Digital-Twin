'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment, Float } from '@react-three/drei';
import { Suspense, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import type { AssetHealth } from '@/lib/types';

// ── Color map for asset status ───────────────────────────────────
const STATUS_COLORS: Record<string, [string, string]> = {
  GOOD:    ['#22d3a5', '#0f4a3a'],   // [emissive, base]
  ALARM:   ['#f59e0b', '#4a3200'],
  TRIP:    ['#ef4444', '#4a0f0f'],
  OFFLINE: ['#4b5563', '#1f2937'],
  UNKNOWN: ['#6b7280', '#1f2937'],
};

// ── Coordinate mapping from digital_twin_clean.json ─────────────
// Normalized from PID coordinate space (0–2500) to 3D space (-8 to 8)
function pidToWorld(x: number, y: number): [number, number, number] {
  const wx = (x / 2500) * 16 - 8;
  const wy = -((y / 1500) * 10 - 5); // Flip Y axis
  return [wx, wy, 0];
}

const ASSET_POSITIONS: Record<string, { x: number; y: number; label: string; type: 'vessel' | 'pump' | 'heatex' }> = {
  'AREA-HP-SEP:V-101': { x: 940, y: 840, label: 'V-101\nHP Separator', type: 'vessel' },
  'AREA-HP-SEP:V-102': { x: 2300, y: 1260, label: 'V-102\nTest Separator', type: 'vessel' },
  'AREA-HP-SEP:E-101': { x: 430, y: 855, label: 'E-101\nWellstream Heater', type: 'heatex' },
  'AREA-HP-SEP:E-102': { x: 2380, y: 465, label: 'E-102\nHP Glycol Reboiler', type: 'heatex' },
  'AREA-HP-SEP:P-101': { x: 785, y: 1235, label: 'P-101A/B\nDrain Pumps', type: 'pump' },
};

const VALVES = [
  { id: "TCV-101", x: 760.0, y: 777.0, parent: "AREA-HP-SEP:E-101" },
  { id: "SDV-101", x: 245.0, y: 731.0, parent: "AREA-HP-SEP:E-101" },
  { id: "PSV-101", x: 860.0, y: 727.0, parent: "AREA-HP-SEP:V-101" },
  { id: "PCV-101", x: 1420.0, y: 612.0, parent: "AREA-HP-SEP:V-101" },
  { id: "SDV-201", x: 1620.0, y: 456.0, parent: "AREA-HP-SEP:V-102" },
  { id: "LCV-101", x: 1310.0, y: 1032.0, parent: "AREA-HP-SEP:V-101" },
  { id: "SDV-102", x: 700.0, y: 1192.0, parent: "AREA-HP-SEP:P-101" }
];

const SENSORS = [
  { id: "TT101A", x: 560.0, y: 738.0, parent: "AREA-HP-SEP:E-101" },
  { id: "TT101B", x: 600.0, y: 738.0, parent: "AREA-HP-SEP:E-101" },
  { id: "TIC101", x: 668.0, y: 670.0, parent: "AREA-HP-SEP:E-101" },
  { id: "PT101A", x: 980.0, y: 658.0, parent: "AREA-HP-SEP:V-101" },
  { id: "PT101B", x: 1060.0, y: 658.0, parent: "AREA-HP-SEP:V-101" },
  { id: "PIC101", x: 1190.0, y: 580.0, parent: "AREA-HP-SEP:V-101" },
  { id: "PSHH101", x: 920.0, y: 658.0, parent: "AREA-HP-SEP:V-101" },
  { id: "LT101A", x: 591.0, y: 795.0, parent: "AREA-HP-SEP:E-101" },
  { id: "LT101B", x: 591.0, y: 895.0, parent: "AREA-HP-SEP:E-101" },
  { id: "LIC101", x: 878.0, y: 705.0, parent: "AREA-HP-SEP:V-101" },
  { id: "LALL101", x: 591.0, y: 925.0, parent: "AREA-HP-SEP:E-101" },
  { id: "FT101", x: 1300.0, y: 468.0, parent: "AREA-HP-SEP:V-101" },
  { id: "FIC101", x: 1408.0, y: 405.0, parent: "AREA-HP-SEP:V-101" },
  { id: "PT201", x: 1900.0, y: 468.0, parent: "AREA-HP-SEP:E-102" },
  { id: "FT102", x: 1380.0, y: 1082.0, parent: "AREA-HP-SEP:V-101" },
  { id: "FIC102", x: 1488.0, y: 1145.0, parent: "AREA-HP-SEP:P-101" },
  { id: "VT301", x: 573.0, y: 1170.0, parent: "AREA-HP-SEP:P-101" },
  { id: "FT103", x: 1800.0, y: 1048.0, parent: "AREA-HP-SEP:V-102" },
  { id: "LT103", x: 2031.0, y: 1235.0, parent: "AREA-HP-SEP:V-102" },
  { id: "PT103", x: 2290.0, y: 1098.0, parent: "AREA-HP-SEP:V-102" }
];

// ── Vessel mesh (Separator) ────────────────────────────
function VesselMesh({ health }: { health?: AssetHealth }) {
  const meshRef = useRef<THREE.Group>(null);
  const status = health?.status || 'UNKNOWN';
  const [emissiveHex] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  
  // Extract level percentage for the visual indicator
  const levelS = health?.sensors?.find(s => s.sensor_type === 'LEVEL')?.value ?? 50;
  const levelPercent = Math.min(100, Math.max(0, levelS)) / 100;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const targetScale = 0.25; // Base scale for viewport
    meshRef.current.scale.set(targetScale, targetScale, targetScale);
  });

  const baseColor = '#1a2840';
  const emissiveColor = emissiveHex;

  return (
    <group ref={meshRef}>
      {/* Main body — vertical cylinder */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.8, 1.8, 5, 32]} />
        <meshStandardMaterial color={baseColor} roughness={0.25} metalness={0.85} emissive={emissiveColor} emissiveIntensity={0.2} />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={baseColor} roughness={0.25} metalness={0.85} emissive={emissiveColor} emissiveIntensity={0.2} />
      </mesh>

      {/* Bottom cap */}
      <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={baseColor} roughness={0.25} metalness={0.85} emissive={emissiveColor} emissiveIntensity={0.2} />
      </mesh>

      {/* Inlet nozzle — left */}
      <mesh position={[-1.9, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 1.2, 16]} />
        <meshStandardMaterial color="#2d3b54" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Outlet nozzle — right */}
      <mesh position={[1.9, 3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 1, 16]} />
        <meshStandardMaterial color="#2d3b54" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Gas outlet nozzle — top */}
      <mesh position={[0, 5.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color="#2d3b54" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Level indicator strip */}
      <mesh position={[1.85, 2 + (levelPercent - 0.5) * 3, 0]}>
        <boxGeometry args={[0.08, 0.6, 0.3]} />
        <meshStandardMaterial
          color={levelPercent > 0.8 ? '#ef4444' : levelPercent > 0.6 ? '#f59e0b' : '#22c55e'}
          emissive={levelPercent > 0.8 ? '#ef4444' : levelPercent > 0.6 ? '#f59e0b' : '#22c55e'}
          emissiveIntensity={1.5} toneMapped={false}
        />
      </mesh>

      {/* Level glass strip background */}
      <mesh position={[1.85, 2, 0]}>
        <boxGeometry args={[0.06, 3.5, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.3} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ── Pump mesh (cylinder + impeller) ──────────────────────────────
function PumpMesh({ health }: { health?: AssetHealth }) {
  const groupRef = useRef<THREE.Group>(null);
  const impellerRef = useRef<THREE.Group>(null);
  const status = health?.status || 'UNKNOWN';
  const [emissiveHex] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  const isRunning = status !== 'OFFLINE';

  useFrame((_, delta) => {
    if (impellerRef.current && isRunning) {
      const speed = status === 'ALARM' ? 12 : status === 'TRIP' ? 2 : 6;
      impellerRef.current.rotation.y += delta * speed;
    }
  });

  const baseColor = '#1a2840';

  return (
    <group ref={groupRef} scale={0.35}>
      {/* Volute casing */}
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.3, 1.2, 32]} />
        <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.8} emissive={emissiveHex} emissiveIntensity={0.2} />
      </mesh>

      {/* Discharge nozzle */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.6, 16]} />
        <meshStandardMaterial color="#2d3b54" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Suction nozzle */}
      <mesh position={[1.3, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.8, 16]} />
        <meshStandardMaterial color="#2d3b54" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Motor body */}
      <mesh position={[-1.5, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 1.6, 24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Motor coupling */}
      <mesh position={[-0.6, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Impeller (spinning blades) */}
      <group ref={impellerRef} position={[0, 0.8, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, (Math.PI * 2 * i) / 6, 0]}>
            <boxGeometry args={[0.8, 0.08, 0.15]} />
            <meshStandardMaterial color={isRunning ? '#94a3b8' : '#475569'} emissive={emissiveHex} emissiveIntensity={isRunning ? 0.3 : 0} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Status indicator light */}
      <mesh position={[-2.3, 1.2, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={emissiveHex} emissive={emissiveHex} emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* Base plate */}
      <mesh position={[-0.5, 0.05, 0]} castShadow>
        <boxGeometry args={[3.5, 0.1, 2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

// ── Heat Exchanger mesh ───────────────────────────────────────────
function HeatExchangerMesh({ health }: { health?: AssetHealth }) {
  const status = health?.status || 'UNKNOWN';
  const [emissiveHex] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;

  // Temperature logic
  const tempS = health?.sensors?.find(s => s.sensor_type === 'TEMPERATURE')?.value ?? 85;
  const tempPercent = Math.min(100, Math.max(0, (tempS - 20) / 130)); // Scale 20C-150C
  const heatColor = tempPercent < 0.3 ? '#3b82f6' : tempPercent > 0.7 ? '#ef4444' : '#f59e0b';
  
  const baseColor = '#0f1d30';

  return (
    <group scale={0.35}>
      {/* Main shell — horizontal cylinder */}
      <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 4, 32]} />
        <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.8} emissive={emissiveHex} emissiveIntensity={0.25} />
      </mesh>

      {/* Left end cap */}
      <mesh position={[-2, 1, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <sphereGeometry args={[1.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Right end cap */}
      <mesh position={[2, 1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <sphereGeometry args={[1.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Heat glow strip — shows temperature dynamically based on Live Telemetry */}
      <mesh position={[0, 1, 1.32]}>
        <boxGeometry args={[3.2, 0.3, 0.05]} />
        <meshStandardMaterial color={heatColor} emissive={heatColor} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>

      {/* Inlet nozzle */}
      <mesh position={[-1.5, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Outlet nozzle */}
      <mesh position={[1.5, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Internal tube stubs */}
      {[0.4, -0.4, 0].map((offset, i) => (
        <mesh key={i} position={[-2.1, 1 + offset * 0.8, offset * 0.8]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.3, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* Legs */}
      <mesh position={[-1.2, -0.3, 0]} castShadow>
        <boxGeometry args={[0.3, 0.6, 1.2]} />
        <meshStandardMaterial color="#020617" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[1.2, -0.3, 0]} castShadow>
        <boxGeometry args={[0.3, 0.6, 1.2]} />
        <meshStandardMaterial color="#020617" roughness={0.5} metalness={0.7} />
      </mesh>
    </group>
  );
}

// ── Label tooltip ─────────────────────────────────────────────────
function AssetLabel({ label, status }: { label: string; status: string }) {
  const [emissive] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  return (
    <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(6,11,20,0.88)',
        border: `1px solid ${emissive}`,
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: '0.6rem',
        color: emissive,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        whiteSpace: 'pre',
        textAlign: 'center',
        boxShadow: `0 0 12px ${emissive}33`,
        lineHeight: 1.4,
      }}>
        {label}
      </div>
    </Html>
  );
}

// ── Scene pipe (line between assets) ─────────────────────────────
function Pipe({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const geometry = useMemo(() => {
    const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [from, to]);

  return (
    <line>
      <bufferGeometry attach="geometry" {...geometry as any} />
      <lineBasicMaterial color="#1e3a5f" linewidth={1} opacity={0.5} transparent />
    </line>
  );
}

// ── Asset node (composes the right mesh + label) ──────────────────
function AssetNode({ assetId, pidX, pidY, label, type, health }: {
  assetId: string; pidX: number; pidY: number;
  label: string; type: string; health?: AssetHealth;
}) {
  const [wx, wy, wz] = pidToWorld(pidX, pidY);
  const status = health?.status || 'UNKNOWN';

  return (
    <Float speed={1.2} rotationIntensity={0} floatIntensity={0.08}>
      <group position={[wx, wy, wz]}>
        {type === 'vessel'
          ? <VesselMesh health={health} />
          : type === 'pump'
          ? <PumpMesh health={health} />
          : <HeatExchangerMesh health={health} />}
        <AssetLabel label={label} status={status} />
      </group>
    </Float>
  );
}

// ── Valve Mesh ────────────────────────────────────────────────────
function ValveMesh({ id, pidX, pidY, health }: { id: string; pidX: number; pidY: number; health?: AssetHealth }) {
  const [wx, wy, wz] = pidToWorld(pidX, pidY);
  const status = health?.status || 'UNKNOWN';
  const [emissiveHex] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  
  return (
    <group position={[wx, wy, wz]} scale={0.25}>
      {/* Valve body — two cones meeting at center */}
      <mesh position={[-0.4, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.6, 0.8, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.85} emissive={emissiveHex} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.4, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.6, 0.8, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.85} emissive={emissiveHex} emissiveIntensity={0.2} />
      </mesh>

      {/* Center disc */}
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
        <meshStandardMaterial color={emissiveHex} emissive={emissiveHex} emissiveIntensity={0.8} roughness={0.4} metalness={0.6} toneMapped={false} />
      </mesh>

      {/* Actuator stem */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Actuator/handwheel */}
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.35, 0.06, 8, 24]} />
        <meshStandardMaterial color={emissiveHex} roughness={0.4} metalness={0.7} emissive={emissiveHex} emissiveIntensity={0.3} />
      </mesh>

      {/* Pipe stubs */}
      <mesh position={[-1, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.5, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[1, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.5, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.9} />
      </mesh>

      <Html distanceFactor={25} position={[0, -0.6, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '0.45rem', color: emissiveHex, fontFamily: 'monospace', fontWeight: 600 }}>{id}</div>
      </Html>
    </group>
  );
}

// ── Sensor Mesh ───────────────────────────────────────────────────
function SensorMesh({ id, pidX, pidY, health }: { id: string; pidX: number; pidY: number; health?: AssetHealth }) {
  const [wx, wy, wz] = pidToWorld(pidX, pidY);
  const status = health?.status || 'UNKNOWN';
  const [emissiveHex] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current && status === 'ALARM') {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 4) * 0.2);
    } else if (meshRef.current && status === 'TRIP') {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 10) * 0.4);
    }
  });

  return (
    <group position={[wx, wy, wz]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={emissiveHex} emissive={emissiveHex} emissiveIntensity={status === 'GOOD' ? 0.3 : 1.5} />
      </mesh>
      <Html distanceFactor={20} position={[0, 0.2, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '0.4rem', color: emissiveHex, fontFamily: 'monospace' }}>{id}</div>
      </Html>
    </group>
  );
}

// ── Grid floor ────────────────────────────────────────────────────
function DeckGrid() {
  return (
    <gridHelper
      args={[20, 30, '#1e3a5f', '#0f1d30']}
      position={[0, -3.5, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// ── Main 3D Twin Component ────────────────────────────────────────
export default function DigitalTwinViewer() {
  const { assetHealth } = useLiveTelemetry();

  const healthMap = useMemo(() => {
    const m: Record<string, AssetHealth> = {};
    assetHealth.forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [assetHealth]);

  // Pipe connections derived from P&ID flow:
  // Wellstream inlet → E-101 → V-101 → P-101A/B → V-102
  const pipes: Array<[[number,number,number],[number,number,number]]> = [
    [pidToWorld(430, 855), pidToWorld(940, 840)],   // E-101 → V-101
    [pidToWorld(940, 840), pidToWorld(785, 1235)],  // V-101 → P-101
    [pidToWorld(940, 840), pidToWorld(2300, 1260)], // V-101 → V-102
    [pidToWorld(2300, 1260), pidToWorld(2380, 465)],// V-102 → E-102
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>3D Visual Twin — HP Separation Train</h2>
        <span className="track-badge track1">Track 1 · Transparent</span>
      </div>

      <div className="viewer-container">
        <div className="viewer-overlay">
          <div className="viewer-legend">
            {[
              { label: 'Normal', color: '#22d3a5' },
              { label: 'Alarm', color: '#f59e0b' },
              { label: 'Trip', color: '#ef4444' },
              { label: 'Offline', color: '#6b7280' },
            ].map(l => (
              <div key={l.label} className="legend-item">
                <div className="legend-dot" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{l.label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 4, fontFamily: 'monospace' }}>
            Source: [digital_twin_clean.json] · [pid_hp_separation_train.svg]
          </div>
        </div>

        <Canvas
          camera={{ position: [0, 4, 12], fov: 50 }}
          shadows
          style={{ background: 'transparent' }}
        >
          <color attach="background" args={['#060b14']} />
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 8, 5]} intensity={1.5} castShadow />
          <pointLight position={[-5, 4, -3]} intensity={0.8} color="#3b82f6" />
          <pointLight position={[0, -2, 4]} intensity={0.4} color="#22d3a5" />

          <Suspense fallback={null}>
            <Environment preset="night" />

            {/* Pipe network */}
            {pipes.map(([a, b], i) => <Pipe key={i} from={a} to={b} />)}

            {/* Asset nodes */}
            {Object.entries(ASSET_POSITIONS).map(([id, cfg]) => (
              <AssetNode
                key={id}
                assetId={id}
                pidX={cfg.x}
                pidY={cfg.y}
                label={cfg.label}
                type={cfg.type}
                health={healthMap[id]}
              />
            ))}

            {/* Valve Nodes */}
            {VALVES.map(v => (
              <ValveMesh key={v.id} id={v.id} pidX={v.x} pidY={v.y} health={healthMap[v.parent]} />
            ))}

            {/* Sensor Nodes */}
            {SENSORS.map(s => (
              <SensorMesh key={s.id} id={s.id} pidX={s.x} pidY={s.y} health={healthMap[s.parent]} />
            ))}

            <DeckGrid />
          </Suspense>

          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            maxPolarAngle={Math.PI / 1.5}
            minDistance={4}
            maxDistance={25}
            autoRotate
            autoRotateSpeed={0.3}
          />
        </Canvas>

        {/* Asset detail popup for hovered asset */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          pointerEvents: 'none',
        }}>
          {assetHealth.filter(a => a.status !== 'GOOD').map(a => {
            const short = a.asset_id.split(':')[1] || a.asset_id;
            const colorMap: Record<string, string> = { ALARM: '#f59e0b', TRIP: '#ef4444', OFFLINE: '#6b7280' };
            const c = colorMap[a.status] || '#22d3a5';
            return (
              <div key={a.asset_id} style={{
                background: 'rgba(6,11,20,0.85)',
                border: `1px solid ${c}`,
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: '0.62rem',
                color: c,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {short}: {a.status}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
