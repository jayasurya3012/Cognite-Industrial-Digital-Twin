export default function Sensor({ position }) {
  return (
    <mesh position={position}>
  <sphereGeometry args={[0.6, 16, 16]} />
  <meshStandardMaterial
    color="#ffff00"
    emissive="#ffff00"
    emissiveIntensity={3}
  />
</mesh>
  );
}