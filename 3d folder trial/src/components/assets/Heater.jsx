export default function Heater({ position, name }) {
  return (
    <mesh
      position={position}
      onClick={() => alert(name)}
    >
      <boxGeometry args={[5, 2, 2]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}