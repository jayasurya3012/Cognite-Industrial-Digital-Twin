import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import usePlantStore from '../../hooks/usePlantStore';

/**
 * PipeNetwork — renders all pipe connections as 3D tubes with animated flow.
 */
export default function PipeNetwork() {
  const selectedAssetId = usePlantStore((s) => s.selectedAssetId);
  const plantLayout = usePlantStore((s) => s.plantLayout);
  
  const connections = plantLayout?.connections || [];

  return (
    <group>
      {connections.map((c, idx) => (
        <Pipe
          key={`pipe-${idx}`}
          connection={c}
          index={idx}
        />
      ))}
    </group>
  );
}

/**
 * Individual pipe segment with tube geometry and flow animation.
 */
function Pipe({ connection, index }) {
  const meshRef = useRef();

  // Convert SVG coordinates to 3D space
  const scale = 0.015;
  const cx = 1400;
  const cy = 900;
  const h = 0.5; // Default pipe height

  const { tubeGeometry, curve, waypoints } = useMemo(() => {
    const p1 = new THREE.Vector3((connection.x1 - cx) * scale, h, (connection.y1 - cy) * scale);
    const p2 = new THREE.Vector3((connection.x2 - cx) * scale, h, (connection.y2 - cy) * scale);
    
    // Add small interpolations if needed, but a straight 2-point line works for TubeGeometry
    const c = new THREE.CatmullRomCurve3([p1, p2], false, 'catmullrom', 0);
    const geo = new THREE.TubeGeometry(c, 8, 0.15, 8, false);
    return { tubeGeometry: geo, curve: c, waypoints: [p1, p2] };
  }, [connection, cx, cy, scale]);

  // Animated flow — texture offset
  useFrame(({ clock }) => {
    if (meshRef.current && meshRef.current.material) {
      meshRef.current.material.emissiveIntensity =
        0.1 + Math.sin(clock.getElapsedTime() * 2 + index) * 0.08;
    }
  });

  if (!tubeGeometry) return null;

  // Since we don't have explicit from/to nodes mapped easily in generic svg line segments,
  // we just use a default static color logic for now.
  const isHighlighted = false;
  const pipeColor = isHighlighted ? '#00d4ff' : '#ffffff'; // White for pipelines as requested
  const emissiveColor = isHighlighted ? '#00d4ff' : '#cccccc';
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
      <FlowIndicators curve={curve} isHighlighted={isHighlighted} index={index} />

      {/* Flanges at connection points */}
      <Flange
        position={waypoints[0]}
        tangent={getTangent(curve, 0)}
      />
      <Flange
        position={waypoints[1]}
        tangent={getTangent(curve, 1)}
      />
    </group>
  );
}

/**
 * Animated flow dots moving along the pipe.
 */
function FlowIndicators({ curve, isHighlighted, index }) {
  const dotsRef = useRef([]);
  const dotCount = 3;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    dotsRef.current.forEach((dot, i) => {
      if (!dot || !curve) return;
      const offset = i / dotCount;
      const progress = ((t * 0.15 + offset + index * 0.1) % 1);
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
