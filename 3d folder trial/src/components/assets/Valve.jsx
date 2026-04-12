export default function Valve({ position, name }) {
  return (
    <mesh
      position={position}
      onClick={() => alert(name)}
    >
      <torusGeometry args={[1, 0.3, 16, 100]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}