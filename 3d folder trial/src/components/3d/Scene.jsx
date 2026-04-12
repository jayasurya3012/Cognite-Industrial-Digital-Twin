import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Stars } from '@react-three/drei';
import { Suspense } from 'react';
import AssetFactory from './AssetFactory';
import PipeNetwork from './PipeNetwork';
import Ground from './Ground';
import CameraController from './CameraController';
import usePlantStore from '../../hooks/usePlantStore';

/**
 * SceneCanvas — the main 3D viewport wrapping the Three.js canvas.
 */
export default function SceneCanvas() {
  const layers = usePlantStore((s) => s.layers);
  const plantLayout = usePlantStore((s) => s.plantLayout);

  const assets = plantLayout?.assets || [];
  const valves = plantLayout?.valves || [];
  const sensors = plantLayout?.sensors || [];

  return (
    <Canvas
      camera={{ position: [5, 18, 30], fov: 45, near: 0.1, far: 500 }}
      shadows
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#e5e7eb']} />

      {/* Fog for depth */}
      <fog attach="fog" args={['#e5e7eb', 40, 100]} />

      <Suspense fallback={null}>
        {/* Environment for IBL reflections - switch to a lighter preset like 'city' or 'sunset' if needed, but 'night' can still provide soft contrast reflections */}
        <Environment preset="city" />

        {/* Multi-light rig */}
        <ambientLight intensity={0.4} color="#ffffff" />

        {/* Key light — warm directional */}
        <directionalLight
          position={[20, 30, 15]}
          intensity={1.2}
          color="#ffeedd"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={100}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />

        {/* Fill light */}
        <directionalLight
          position={[-15, 15, -10]}
          intensity={0.6}
          color="#aaccff"
        />

        {/* Accent point lights near equipment */}
        <pointLight position={[-8, 4, -1]} intensity={0.5} color="#00d4ff" distance={20} decay={2} />
        <pointLight position={[8, 4, 3]} intensity={0.3} color="#00d4ff" distance={15} decay={2} />

        {/* Ground */}
        <Ground />

        {/* Grid for light background */}
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

        {/* Assets */}
        {layers.equipment &&
          assets.map((asset) => (
            <AssetFactory key={asset.id} asset={asset} />
          ))}

        {/* Valves */}
        {layers.valves &&
          valves.map((valve, idx) => (
            <AssetFactory key={`${valve.id}-${idx}`} asset={valve} isValve />
          ))}

        {/* Pipes */}
        {layers.pipes && <PipeNetwork />}

        {/* Camera controller for smooth transitions */}
        <CameraController />

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
