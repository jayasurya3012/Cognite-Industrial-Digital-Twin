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

// ── Vessel mesh (horizontal cylinder) ────────────────────────────
function VesselMesh({ health }: { health?: AssetHealth }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const status = health?.status || 'UNKNOWN';
  const [emissiveHex] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  const emissive = new THREE.Color(emissiveHex);
  const isAlarm = status === 'ALARM';
  const isTrip  = status === 'TRIP';

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (isTrip) {
      mat.emissiveIntensity = 0.8 + Math.sin(clock.getElapsedTime() * 6) * 0.7;
    } else if (isAlarm) {
      mat.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    } else {
      mat.emissiveIntensity = 0.2;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, Math.PI / 2]}>
      <capsuleGeometry args={[0.35, 1.2, 8, 16]} />
      <meshStandardMaterial
        color={new THREE.Color('#1a2840')}
        emissive={emissive}
        emissiveIntensity={0.2}
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  );
}

// ── Pump mesh (cylinder + impeller) ──────────────────────────────
function PumpMesh({ health }: { health?: AssetHealth }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const impellerRef = useRef<THREE.Mesh>(null);
  const status = health?.status || 'UNKNOWN';
  const [emissiveHex] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  const emissive = new THREE.Color(emissiveHex);
  const isRunning = status !== 'OFFLINE';

  useFrame(({ clock }) => {
    if (impellerRef.current && isRunning) {
      const speed = status === 'ALARM' ? 4 : status === 'TRIP' ? 0.3 : 2;
      impellerRef.current.rotation.y = clock.getElapsedTime() * speed;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.25, 0.3, 0.5, 16]} />
        <meshStandardMaterial
          color="#1a2840"
          emissive={emissive}
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.9}
        />
      </mesh>
      {/* Spinning impeller disc */}
      <mesh ref={impellerRef} position={[0, 0.28, 0]}>
        <torusGeometry args={[0.22, 0.04, 8, 12]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ── Heat Exchanger mesh ───────────────────────────────────────────
function HeatExchangerMesh({ health }: { health?: AssetHealth }) {
  const status = health?.status || 'UNKNOWN';
  const [emissiveHex] = STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN;
  const emissive = new THREE.Color(emissiveHex);

  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.22, 0.22, 1.6, 12]} />
      <meshStandardMaterial
        color="#0f1d30"
        emissive={emissive}
        emissiveIntensity={0.25}
        roughness={0.5}
        metalness={0.7}
      />
    </mesh>
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
