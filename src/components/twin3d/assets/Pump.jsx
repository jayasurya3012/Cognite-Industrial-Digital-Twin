import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Pump — Centrifugal pump with rotating impeller.
 * Volute casing + motor block + spinning element.
 */
export default function Pump({
  position,
  name,
  isSelected,
  isHovered,
  status = 'operational',
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const groupRef = useRef();
  const impellerRef = useRef();

  const isRunning = status === 'operational';

  // Impeller rotation
  useFrame((_, delta) => {
    if (impellerRef.current && isRunning) {
      impellerRef.current.rotation.y += delta * 6;
    }

    // Hover scale
    if (groupRef.current) {
      const targetScale = isHovered ? 1.05 : 1.0;
      const s = groupRef.current.scale;
      s.x += (targetScale - s.x) * 0.1;
      s.y += (targetScale - s.y) * 0.1;
      s.z += (targetScale - s.z) * 0.1;
    }
  });

  const baseColor = isRunning ? '#5a7a5a' : '#6a6a6a';
  const statusColor = isRunning ? '#22c55e' : '#6b7280';
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
      {/* Volute casing */}
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.3, 1.2, 32]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.3}
          metalness={0.8}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Discharge nozzle */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.6, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Suction nozzle */}
      <mesh position={[1.3, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.8, 16]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Motor body */}
      <mesh position={[-1.5, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 1.6, 24]} />
        <meshStandardMaterial
          color="#4a4f55"
          roughness={0.4}
          metalness={0.7}
        />
      </mesh>

      {/* Motor coupling */}
      <mesh position={[-0.6, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#666" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Impeller (spinning) */}
      <group ref={impellerRef} position={[0, 0.8, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            position={[0, 0, 0]}
            rotation={[0, (Math.PI * 2 * i) / 6, 0]}
          >
            <boxGeometry args={[0.8, 0.08, 0.15]} />
            <meshStandardMaterial
              color={isRunning ? '#88cc88' : '#888'}
              emissive={statusColor}
              emissiveIntensity={isRunning ? 0.5 : 0}
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>

      {/* Status indicator light */}
      <mesh position={[-2.3, 1.2, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* Base plate */}
      <mesh position={[-0.5, 0.05, 0]} castShadow>
        <boxGeometry args={[3.5, 0.1, 2]} />
        <meshStandardMaterial color="#333" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.5, 64]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
