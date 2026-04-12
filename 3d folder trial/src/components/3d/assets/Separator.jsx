import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import usePlantStore from '../../../hooks/usePlantStore';

/**
 * Separator — Three-phase separation vessel.
 * Multi-mesh: main cylinder + hemispherical caps + nozzles + level indicator.
 */
export default function Separator({
  position,
  name,
  isSelected,
  isHovered,
  sensorValues = {},
  assetId,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const groupRef = useRef();

  const plantLayout = usePlantStore(s => s.plantLayout);
  const rawSensors = plantLayout?.sensors || [];
  const assetSensors = rawSensors.filter(s => s.asset_id === assetId);

  // Get level sensor for visual indicator
  const levelSensor = assetSensors.find(
    (s) => s.id.startsWith('L') || s.id.includes('LEVEL')
  );
  const levelValue = levelSensor
    ? sensorValues[levelSensor.id]?.v ?? 50
    : 50;
  const levelPercent = Math.max(0, Math.min(1, levelValue / 100));

  // Hover/selection animation
  useFrame(() => {
    if (!groupRef.current) return;
    const targetScale = isHovered ? 1.03 : 1.0;
    const s = groupRef.current.scale;
    s.x += (targetScale - s.x) * 0.1;
    s.y += (targetScale - s.y) * 0.1;
    s.z += (targetScale - s.z) * 0.1;
  });

  const baseColor = '#7a8895';
  const emissiveColor = isSelected ? '#00d4ff' : isHovered ? '#00a6cc' : '#000000';
  const emissiveIntensity = isSelected ? 0.25 : isHovered ? 0.15 : 0;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Main body — vertical cylinder */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.8, 1.8, 5, 32]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.25}
          metalness={0.85}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.25}
          metalness={0.85}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Bottom cap */}
      <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.25}
          metalness={0.85}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Inlet nozzle — left */}
      <mesh position={[-1.9, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 1.2, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Outlet nozzle — right */}
      <mesh position={[1.9, 3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 1, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Gas outlet nozzle — top */}
      <mesh position={[0, 5.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Level indicator strip */}
      <mesh position={[1.85, 2 + (levelPercent - 0.5) * 3, 0]}>
        <boxGeometry args={[0.08, 0.6, 0.3]} />
        <meshStandardMaterial
          color={levelPercent > 0.8 ? '#ef4444' : levelPercent > 0.6 ? '#f59e0b' : '#22c55e'}
          emissive={levelPercent > 0.8 ? '#ef4444' : levelPercent > 0.6 ? '#f59e0b' : '#22c55e'}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>

      {/* Level glass strip background */}
      <mesh position={[1.85, 2, 0]}>
        <boxGeometry args={[0.06, 3.5, 0.2]} />
        <meshStandardMaterial
          color="#1a2030"
          roughness={0.5}
          metalness={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.5, 2.8, 64]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
