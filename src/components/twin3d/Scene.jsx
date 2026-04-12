import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Stars, Html } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import AssetFactory from './AssetFactory';
import PipeNetwork from './PipeNetwork';
import Ground from './Ground';
import CameraController from './CameraController';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import { assets as plantAssets, valves as plantValves, sensors as plantSensors } from '@/data/plantData';
import Sensor3D from './Sensor';

// Simple scaling helper for flat 2D json coordinates -> 3D engine
export function mapCoords(x, y) {
  return [(x - 1200) * 0.015, 0, (y - 800) * 0.015];
}

/**
 * SceneCanvas — the main 3D viewport wrapping the Three.js canvas.
 */
export default function SceneCanvas({ focusedAsset, timeFilter = 'RT' }) {
  const { assetHealth, readings, loading } = useLiveTelemetry();
  const [cameraTarget, setCameraTarget] = useState(null);

  // Remap data (simulate historical spikes if timeFilter isn't Real-Time)
  const simulatedHealth = useMemo(() => {
    const historicalSpikes = {
      'AREA-HP-SEP:V-101': { status: 'critical' },
      'AREA-HP-SEP:P-101A': { status: 'warning' }
    };
    
    return assetHealth.map(a => {
      if (timeFilter !== 'RT' && historicalSpikes[a.asset_id]) {
        return { ...a, status: historicalSpikes[a.asset_id].status };
      }
      return a;
    });
  }, [assetHealth, timeFilter]);

  const simulatedReadings = useMemo(() => {
    if (timeFilter === 'RT') return readings;
    return readings.map(r => {
      // Inject historical pressure anomaly on V-101 to match the 'critical' tag
      if (r.asset_id === 'AREA-HP-SEP:V-101') {
        if (r.sensor_type === 'PRESSURE') return { ...r, value: 78.5 }; // exceeding 75 MAWP
        if (r.sensor_type === 'LEVEL') return { ...r, value: 88.0 };
      }
      if (r.asset_id === 'AREA-HP-SEP:P-101A' && r.sensor_type === 'VIBRATION') return { ...r, value: 5.2 };
      return r;
    });
  }, [readings, timeFilter]);

  const healthMap = useMemo(() => {
    const m = {};
    simulatedHealth.forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [assetHealth]);

  const layers = { equipment: true, valves: true, pipes: true, labels: true, sensors: true };

  // Transcode array-based Supabase readings into the hash-mapping Trial components expect
  const sensorValuesObj = useMemo(() => {
    const acc = {};
    // Fallback: populate with defaults from plantSensors first
    plantSensors.forEach(s => { acc[s.id] = { v: s.setpoint || 50, q: 'GOOD' }; });
    
    // Inject Live/Simulated Telemetry
    simulatedReadings.forEach(r => {
      // Very naive mapping: we bind Supabase sensor type back to generic tags from plantData.js
      plantSensors.forEach(s => {
        if (r.asset_id.includes(s.attachedTo)) {
           if (s.type.toUpperCase() === r.sensor_type) {
              acc[s.id] = { v: r.value, q: r.quality || 'GOOD' };
           }
        }
      });
    });
    return acc;
  }, [simulatedReadings]);

  return (
    <Canvas
      camera={{ position: [5, 18, 30], fov: 45, near: 0.1, far: 500 }}
      shadows
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#e5e7eb']} />

      {/* Fog for depth styling */}
      <fog attach="fog" args={['#e5e7eb', 40, 100]} />

      <Suspense fallback={<Html center>Loading 3D Twin...</Html>}>
        {/* Environment reflection */}
        <Environment preset="city" />

        {/* Multi-light rig */}
        <ambientLight intensity={0.6} color="#ffffff" />

        <directionalLight
          position={[20, 30, 15]}
          intensity={1.2}
          color="#ffeedd"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <directionalLight
          position={[-15, 15, -10]}
          intensity={0.6}
          color="#aaccff"
        />

        {/* Accent lights */}
        <pointLight position={[-8, 4, -1]} intensity={0.5} color="#00d4ff" />
        <pointLight position={[8, 4, 3]} intensity={0.3} color="#00d4ff" />
        
        <Ground />
        <Grid
          position={[0, -0.01, 0]}
          args={[100, 100]}
          cellSize={2}
          cellThickness={0.5}
          cellColor="#9ca3af"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#6b7280"
          fadeDistance={60}
          fadeStrength={1}
          infiniteGrid
        />

        {layers.equipment && plantAssets.map((asset) => (
          <AssetFactory key={asset.id} asset={asset} healthMap={healthMap} rawReadings={simulatedReadings} sensorValues={sensorValuesObj} isFocused={focusedAsset === asset.id} onFocus={setCameraTarget} />
        ))}
        {layers.valves && plantValves.map((valve) => (
          <AssetFactory key={valve.id} asset={valve} isValve healthMap={healthMap} rawReadings={simulatedReadings} sensorValues={sensorValuesObj} isFocused={focusedAsset === valve.id} onFocus={setCameraTarget} />
        ))}
        {layers.pipes && <PipeNetwork />}

        {/* Floating discrete sensors from Trial rendering loop */}
        {layers.sensors && plantSensors.map((sensor, idx) => (
          <Sensor3D
            key={`${sensor.id}-${idx}`}
            sensor={sensor}
            value={sensorValuesObj[sensor.id]}
          />
        ))}

        {/* Camera controller for smooth transitions */}
        <CameraController targetPosition={cameraTarget} />

        {/* Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 2]}
        />
      </Suspense>
    </Canvas>
  );
}
