import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Valve — Control/shutdown/relief valve with actuator and handwheel.
 * Color reflects open/closed/throttled state.
 */
export default function Valve({
  position,
  name,
  isSelected,
  isHovered,
  state = 'open',
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const groupRef = useRef();

  // Hover/selection animation
  useFrame(() => {
    if (!groupRef.current) return;
    const targetScale = isHovered ? 1.08 : 1.0;
    const s = groupRef.current.scale;
    s.x += (targetScale - s.x) * 0.1;
    s.y += (targetScale - s.y) * 0.1;
    s.z += (targetScale - s.z) * 0.1;
  });

  // State-based colors
  const stateColors = {
    open: '#22c55e',
    closed: '#ef4444',
    throttled: '#f59e0b',
  };

  const valveColor = stateColors[state] || '#888';
  const bodyColor = '#6a7080';
  const emissiveColor = isSelected ? '#00d4ff' : isHovered ? '#00a6cc' : '#000000';
  const emissiveIntensity = isSelected ? 0.3 : isHovered ? 0.15 : 0;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Valve body — two cones meeting at center (butterfly shape) */}
      <mesh position={[-0.4, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.6, 0.8, 16]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.3}
          metalness={0.85}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      <mesh position={[0.4, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.6, 0.8, 16]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.3}
          metalness={0.85}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Center disc */}
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
        <meshStandardMaterial
          color={valveColor}
          emissive={valveColor}
          emissiveIntensity={0.8}
          roughness={0.4}
          metalness={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Actuator stem */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1, 8]} />
        <meshStandardMaterial color="#555" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Actuator/handwheel */}
      <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.35, 0.06, 8, 24]} />
        <meshStandardMaterial
          color={valveColor}
          roughness={0.4}
          metalness={0.7}
          emissive={valveColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Pipe stubs — left and right */}
      <mesh position={[-1, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.5, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      <mesh position={[1, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.5, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.3, 1.5, 64]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
