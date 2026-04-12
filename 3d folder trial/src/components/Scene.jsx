import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import data from "../data.json";
import AssetFactory from "./AssetFactory";

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 40, 80], fov: 50 }}>
      {/* Lights */}
      <ambientLight intensity={0.3} />

      <directionalLight position={[50, 50, 50]} intensity={1.5} />

      <pointLight position={[0, 20, 0]} intensity={2} color="cyan" />

      {/* Controls */}
      <OrbitControls />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Assets */}
      <group position={[-15, 0, -15]}>
        {data.assets.map((asset, i) => (
          <AssetFactory key={i} asset={asset} />
        ))}
      </group>
    </Canvas>
  );
}