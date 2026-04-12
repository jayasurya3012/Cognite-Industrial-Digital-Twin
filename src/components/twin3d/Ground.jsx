/**
 * Ground — reflective industrial floor plane.
 */
export default function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial
        color="#0c1018"
        roughness={0.85}
        metalness={0.15}
      />
    </mesh>
  );
}
