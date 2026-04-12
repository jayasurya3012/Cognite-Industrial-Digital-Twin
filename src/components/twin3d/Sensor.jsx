import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sensorTypeConfig } from '../../data/sensorConfig';

/**
 * Sensor3D — a glowing sphere representing a sensor in 3D space.
 * Color and pulse speed change based on sensor value vs thresholds.
 */
export default function Sensor3D({ sensor, value }) {
  const meshRef = useRef();
  
  // Normalize type for lookup
  const typeKey = sensor.type ? sensor.type.toLowerCase() : '';
  const config = sensorTypeConfig[typeKey] || {};

  const reading = value?.v ?? 0;
  // Fallback to checking quality for status visualizer
  const quality = value?.q ?? 'GOOD';
  const status = quality === 'BAD' ? 'critical' : quality === 'UNCERTAIN' ? 'warning' : 'normal';

  // Determine color from status
  const getColorHex = () => {
    if (quality === 'BAD') return '#ff0000'; // Glow Red for bad quality
    switch (status) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#00aaff'; // Blue hue
    }
  };

  const color = getColorHex();

  // Pulse animation — faster for critical or BAD quality
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    let pulseSpeed = 1;
    let pulseIntensity = 0.3;

    if (quality === 'BAD') {
      pulseSpeed = 6;
      pulseIntensity = 0.8;
    } else if (status === 'critical') {
      pulseSpeed = 4;
      pulseIntensity = 0.6;
    } else if (status === 'warning') {
      pulseSpeed = 2;
      pulseIntensity = 0.4;
    }

    const scale = 1 + Math.sin(t * pulseSpeed) * pulseIntensity * 0.15;
    meshRef.current.scale.setScalar(scale);

    // Update emissive intensity
    const mat = meshRef.current.material;
    if (mat) {
      mat.emissiveIntensity =
        1 + Math.sin(t * pulseSpeed) * pulseIntensity * 2;
    }
  });

  if (!sensor.position) return null;

  const pos = [sensor.position.x, sensor.position.y, sensor.position.z];

  return (
    <mesh ref={meshRef} position={pos} castShadow>
      <sphereGeometry args={[0.25, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        roughness={0.3}
        metalness={0.1}
        toneMapped={false}
      />
    </mesh>
  );
}
