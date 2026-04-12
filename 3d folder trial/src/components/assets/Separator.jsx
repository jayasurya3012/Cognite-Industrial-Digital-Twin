export default function Separator({ position, name }) {
  return (
    <mesh
      position={position}
      onClick={() => alert(name)}
    >
      <cylinderGeometry args={[2, 2, 6, 32]} />
      <meshStandardMaterial color="cyan" />
    </mesh>
  );
}