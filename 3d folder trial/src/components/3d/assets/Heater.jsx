import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import usePlantStore from '../../../hooks/usePlantStore';

/**
 * Heater — Shell & tube heat exchanger.
 * Horizontal cylinder with tube stubs and temperature-based glow.
 */
export default function Heater({
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

  // Get temperature sensor for visual color
  const tempSensor = assetSensors.find(
    (s) => s.id.startsWith('T') || s.id.includes('TEMP')
  );
  const tempValue = tempSensor
    ? sensorValues[tempSensor.id]?.v ?? 85
    : 85;
  const tempPercent = Math.max(0, Math.min(1, tempValue / 150));

  // Temperature-based color: blue (cold) → orange (warm) → red (hot)
  const getHeatColor = (t) => {
    if (t < 0.3) return '#4488cc';
    if (t < 0.5) return '#88aa44';
    if (t < 0.7) return '#dd8822';
    if (t < 0.85) return '#ee5522';
    return '#ff3311';
  };

  const heatColor = getHeatColor(tempPercent);

  // Hover/selection animation
  useFrame(() => {
    if (!groupRef.current) return;
    const targetScale = isHovered ? 1.04 : 1.0;
    const s = groupRef.current.scale;
    s.x += (targetScale - s.x) * 0.1;
    s.y += (targetScale - s.y) * 0.1;
    s.z += (targetScale - s.z) * 0.1;
  });

  const baseColor = '#8a7560';
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
      {/* Main shell — horizontal cylinder */}
      <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 4, 32]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.3}
          metalness={0.8}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
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

      {/* Heat glow strip — shows temperature */}
      <mesh position={[0, 1, 1.32]}>
        <boxGeometry args={[3.2, 0.3, 0.05]} />
        <meshStandardMaterial
          color={heatColor}
          emissive={heatColor}
          emissiveIntensity={1 + tempPercent * 2}
          toneMapped={false}
        />
      </mesh>

      {/* Inlet nozzle — bottom left */}
      <mesh position={[-1.5, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Outlet nozzle — top right */}
      <mesh position={[1.5, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Internal tube stubs visible at ends */}
      {[0.4, -0.4, 0].map((offset, i) => (
        <mesh key={i} position={[-2.1, 1 + offset * 0.8, offset * 0.8]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.3, 8]} />
          <meshStandardMaterial color="#666" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* Legs */}
      <mesh position={[-1.2, -0.3, 0]} castShadow>
        <boxGeometry args={[0.3, 0.6, 1.2]} />
        <meshStandardMaterial color="#444" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[1.2, -0.3, 0]} castShadow>
        <boxGeometry args={[0.3, 0.6, 1.2]} />
        <meshStandardMaterial color="#444" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 3.1, 64]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
