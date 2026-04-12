import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Valve — Control/shutdown/relief valve with live-state animation.
 * openPercent (0-100) controls the actuator position visually.
 * Color reflects: green=open, red=closed, amber=throttled.
 */
export default function Valve({
  position,
  name,
  isSelected,
  isHovered,
  state = 'open',
  openPercent = 100,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const groupRef = useRef();
  const actuatorRef = useRef();

  // Map openPercent to disc rotation — 0%=closed(90°), 100%=open(0°)
  const discAngle = ((100 - openPercent) / 100) * (Math.PI / 2);

  // Hover/selection animation
  useFrame(() => {
    if (!groupRef.current) return;
    const targetScale = isHovered ? 1.08 : 1.0;
    const s = groupRef.current.scale;
    s.x += (targetScale - s.x) * 0.1;
    s.y += (targetScale - s.y) * 0.1;
    s.z += (targetScale - s.z) * 0.1;

    // Smooth actuator stem position
    if (actuatorRef.current) {
      const targetY = 1.2 + (openPercent / 100) * 0.4;
      actuatorRef.current.position.y += (targetY - actuatorRef.current.position.y) * 0.08;
    }
  });

  // State-based colors
  const stateColors = {
    open:     '#22c55e',
    closed:   '#ef4444',
    throttled:'#f59e0b',
    cracking: '#f97316',
  };

  // Derive state from openPercent if not set
  const effectiveState = state === 'cracking' ? 'cracking' 
    : openPercent >= 95 ? 'open' 
    : openPercent <= 5 ? 'closed' 
    : 'throttled';

  const valveColor = stateColors[effectiveState] || stateColors[state] || '#888';
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
      {/* Valve body — two cones in butterfly shape */}
      <mesh position={[-0.4, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.58, 0.8, 16]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.3}
          metalness={0.85}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      <mesh position={[0.4, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.58, 0.8, 16]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.3}
          metalness={0.85}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Rotating disc — shows open/closed position */}
      <mesh position={[0, 0.5, 0]} rotation={[discAngle, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.08, 20]} />
        <meshStandardMaterial
          color={valveColor}
          emissive={valveColor}
          emissiveIntensity={0.7}
          roughness={0.35}
          metalness={0.65}
          toneMapped={false}
        />
      </mesh>

      {/* Center seat ring */}
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.22, 16]} />
        <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Actuator stem */}
      <mesh ref={actuatorRef} position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.2, 8]} />
        <meshStandardMaterial color="#555" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Actuator housing / yoke */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <boxGeometry args={[0.55, 0.4, 0.3]} />
        <meshStandardMaterial color="#445566" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* Status light on top of actuator housing */}
      <mesh position={[0, 2.12, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial
          color={valveColor}
          emissive={valveColor}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Handwheel ring */}
      <mesh position={[0, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.32, 0.05, 8, 24]} />
        <meshStandardMaterial
          color={valveColor}
          roughness={0.4}
          metalness={0.7}
          emissive={valveColor}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Pipe stubs — left and right */}
      <mesh position={[-1.1, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.55, 14]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[1.1, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.55, 14]} />
        <meshStandardMaterial color="#5a6570" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Flange rings on stubs */}
      <mesh position={[-1.35, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.28, 0.05, 6, 18]} />
        <meshStandardMaterial color="#4a5560" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[1.35, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.28, 0.05, 6, 18]} />
        <meshStandardMaterial color="#4a5560" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 1.65, 64]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
