import Separator from './assets/Separator';
import Heater from './assets/Heater';
import Pump from './assets/Pump';
import Valve from './assets/Valve';
import Sensor3D from './Sensor';
import AssetLabel from './AssetLabel';
import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sensors as plantSensors } from '@/data/plantData';

/**
 * AssetFactory — routes each asset/valve to its specialized 3D component.
 * Manages selection/hover state and renders associated sensors + labels.
 */
export default function AssetFactory({ asset, isValve = false, healthMap, rawReadings, sensorValues, isFocused, onFocus }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const focusRingRef = useRef(null);
  const focusHaloRef = useRef(null);

  // Parse generic sensors mapped to this asset id
  const assetSensors = isValve ? [] : plantSensors.filter(s => s.attachedTo === asset.id);

  const { id, position } = asset;
  const pos = [position.x, position.y, position.z];
  
  useEffect(() => {
    if (isFocused) {
      setIsSelected(true);
      if (onFocus) onFocus({ x: pos[0], y: pos[1], z: pos[2] });
    } else {
      setIsSelected(false);
    }
  }, [isFocused, onFocus, pos]);

  useFrame(({ clock }) => {
    if (focusRingRef.current) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.4) * 0.08;
      focusRingRef.current.scale.set(pulse, pulse, pulse);
      focusRingRef.current.material.opacity = 0.35 + (Math.sin(clock.getElapsedTime() * 2.4) + 1) * 0.18;
    }

    if (focusHaloRef.current) {
      focusHaloRef.current.material.opacity = 0.12 + (Math.sin(clock.getElapsedTime() * 1.8) + 1) * 0.08;
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    setIsSelected((prev) => !prev);
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setIsHovered(false);
    document.body.style.cursor = 'default';
  };

  const interactionProps = {
    onClick: handleClick,
    onPointerOver: handlePointerOver,
    onPointerOut: handlePointerOut,
  };

  // Determine 3D component
  let component;

  if (isValve) {
    component = (
      <Valve
        position={pos}
        name={id}
        isSelected={isSelected}
        isHovered={isHovered}
        state={asset.state || 'open'}
        openPercent={asset.openPercent ?? 100}
        {...interactionProps}
      />
    );
  } else {
    const type = asset.type;

    switch (type) {
      case 'separator':
        component = (
          <Separator
            position={pos} name={id} isSelected={isSelected} isHovered={isHovered}
            sensorValues={rawReadings} assetId={id} {...interactionProps}
          />
        );
        break;
      case 'heater':
        component = (
          <Heater
            position={pos} name={id} isSelected={isSelected} isHovered={isHovered}
            sensorValues={rawReadings} assetId={id} {...interactionProps}
          />
        );
        break;
      case 'pump':
        component = (
          <Pump
            position={pos} name={id} isSelected={isSelected} isHovered={isHovered}
            status={asset.status} sensorValues={rawReadings} assetId={id} {...interactionProps}
          />
        );
        break;
      default:
        component = (
          <mesh position={pos} {...interactionProps}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#666" />
          </mesh>
        );
    }
  }

  // Filter raw readings specifically for this asset so the label can display them
  const assetReadings = (rawReadings || []).filter(r => r.asset_id === `AREA-HP-SEP:${id}`);
  const focusRingSize = isValve ? [1.6, 1.95] : asset.type === 'separator' ? [2.8, 3.2] : asset.type === 'heater' ? [3.1, 3.5] : [2.3, 2.7];

  return (
    <group>
      {component}

      {isFocused && (
        <>
          <mesh ref={focusRingRef} position={[pos[0], pos[1] + 0.06, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[focusRingSize[0], focusRingSize[1], 72]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0.4} toneMapped={false} />
          </mesh>
          <mesh ref={focusHaloRef} position={[pos[0], pos[1] + 1.8, pos[2]]}>
            <sphereGeometry args={[2.2, 24, 24]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.16} wireframe toneMapped={false} />
          </mesh>
        </>
      )}

      {/* Label */}
      <AssetLabel
        position={[ pos[0], pos[1] + (isValve ? 2.5 : asset.type === 'separator' ? 5 : 3.5), pos[2] ]}
        id={id}
        name={asset.name}
        isSelected={isSelected}
        sensorValues={sensorValues}
        assetSensors={assetSensors}
      />
    </group>
  );
}
