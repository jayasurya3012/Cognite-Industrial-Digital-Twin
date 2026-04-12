import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mapCoords } from './Scene';

// A few hardcoded pipe connections matching the digital twin map
const connections = [
  {
    id: 'pipe-e101-v101',
    from: 'E-101', to: 'V-101',
    waypoints: [
      { x: mapCoords(430, 855)[0], y: 1.5, z: mapCoords(430, 855)[2] },
      { x: mapCoords(600, 840)[0], y: 1.5, z: mapCoords(600, 840)[2] },
      { x: mapCoords(940, 840)[0], y: 4, z: mapCoords(940, 840)[2] },
    ]
  },
  {
    id: 'pipe-v101-v102',
    from: 'V-101', to: 'V-102',
    waypoints: [
      { x: mapCoords(940, 840)[0], y: 2, z: mapCoords(940, 840)[2] },
      { x: mapCoords(940, 1000)[0], y: 2, z: mapCoords(940, 1000)[2] },
      { x: mapCoords(2300, 1260)[0], y: 4, z: mapCoords(2300, 1260)[2] },
    ]
  }
];

/**
 * PipeNetwork — renders all pipe connections as 3D tubes with animated flow.
 */
export default function PipeNetwork() {
  const selectedAssetId = null; // Disabled state sync for simplicity

  return (
    <group>
      {connections.map((connection) => (
        <Pipe
          key={connection.id}
          connection={connection}
          isHighlighted={false}
        />
      ))}
    </group>
  );
}

/**
 * Individual pipe segment with tube geometry and flow animation.
 */
function Pipe({ connection, isHighlighted }) {
  const meshRef = useRef();

  // Build the curve from waypoints
  const { tubeGeometry, curve } = useMemo(() => {
    const points = connection.waypoints.map(
      (wp) => new THREE.Vector3(wp.x, wp.y, wp.z)
    );

    if (points.length < 2) return { tubeGeometry: null, curve: null };

    const c = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const geo = new THREE.TubeGeometry(c, 64, 0.15, 12, false);
    return { tubeGeometry: geo, curve: c };
  }, [connection.waypoints]);

  // Animated flow — texture offset
  useFrame(({ clock }) => {
    if (meshRef.current && meshRef.current.material) {
      meshRef.current.material.emissiveIntensity =
        0.1 + Math.sin(clock.getElapsedTime() * 2 + connection.id.length) * 0.08;
    }
  });

  if (!tubeGeometry) return null;

  const pipeColor = isHighlighted ? '#00d4ff' : '#4a5568';
  const emissiveColor = isHighlighted ? '#00d4ff' : '#1a2535';
  const emissiveIntensity = isHighlighted ? 0.4 : 0.05;

  return (
    <group>
      {/* Main pipe */}
      <mesh ref={meshRef} geometry={tubeGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={pipeColor}
          roughness={0.35}
          metalness={0.65}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Flow direction indicators — small spheres along pipe */}
      <FlowIndicators curve={curve} isHighlighted={isHighlighted} pipeId={connection.id} />

      {/* Flanges at connection points */}
      {connection.waypoints.length >= 2 && (
        <>
          <Flange
            position={connection.waypoints[0]}
            tangent={getTangent(curve, 0)}
          />
          <Flange
            position={connection.waypoints[connection.waypoints.length - 1]}
            tangent={getTangent(curve, 1)}
          />
        </>
      )}
    </group>
  );
}

/**
 * Animated flow dots moving along the pipe.
 */
function FlowIndicators({ curve, isHighlighted, pipeId }) {
  const dotsRef = useRef([]);
  const dotCount = 3;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    dotsRef.current.forEach((dot, i) => {
      if (!dot || !curve) return;
      const offset = i / dotCount;
      const progress = ((t * 0.15 + offset + pipeId.length * 0.1) % 1);
      const point = curve.getPointAt(Math.max(0, Math.min(1, progress)));
      dot.position.copy(point);
    });
  });

  return (
    <>
      {Array.from({ length: dotCount }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            dotsRef.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color={isHighlighted ? '#00ffff' : '#88aacc'}
            emissive={isHighlighted ? '#00ffff' : '#4488aa'}
            emissiveIntensity={isHighlighted ? 2 : 0.8}
            toneMapped={false}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </>
  );
}

/**
 * Pipe flange — small torus ring at connection points.
 */
function Flange({ position, tangent }) {
  if (!position) return null;

  const quaternion = useMemo(() => {
    if (!tangent) return new THREE.Quaternion();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    q.setFromUnitVectors(up, tangent.normalize());
    return q;
  }, [tangent]);

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      quaternion={quaternion}
    >
      <torusGeometry args={[0.22, 0.06, 8, 24]} />
      <meshStandardMaterial
        color="#5a6a75"
        roughness={0.3}
        metalness={0.85}
      />
    </mesh>
  );
}

/**
 * Get tangent vector at a point on the curve.
 */
function getTangent(curve, t) {
  if (!curve) return new THREE.Vector3(0, 1, 0);
  try {
    return curve.getTangentAt(Math.max(0.01, Math.min(0.99, t)));
  } catch {
    return new THREE.Vector3(0, 1, 0);
  }
}
