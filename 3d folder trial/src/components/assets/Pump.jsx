export default function Pump({ position, name }) {
  return (
    <mesh
      position={position}
      onClick={() => alert(name)}
    >
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshStandardMaterial color="green" />
    </mesh>
  );
}