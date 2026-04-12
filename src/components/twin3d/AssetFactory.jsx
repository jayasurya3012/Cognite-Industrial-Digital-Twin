import Separator from './assets/Separator';
import Heater from './assets/Heater';
import Pump from './assets/Pump';
import Valve from './assets/Valve';
import Sensor3D from './Sensor';
import AssetLabel from './AssetLabel';
import { useState, useEffect } from 'react';
import { sensors as plantSensors } from '@/data/plantData';

/**
 * AssetFactory — routes each asset/valve to its specialized 3D component.
 * Manages selection/hover state and renders associated sensors + labels.
 */
export default function AssetFactory({ asset, isValve = false, healthMap, rawReadings, sensorValues, isFocused, onFocus }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  // Parse generic sensors mapped to this asset id
  const assetSensors = isValve ? [] : plantSensors.filter(s => s.attachedTo === asset.id);

  const { id, position } = asset;
  const pos = [position.x, position.y, position.z];
  
  useEffect(() => {
    if (isFocused) {
      setIsSelected(true);
      if (onFocus) onFocus({ x: pos[0], y: pos[1], z: pos[2] });
    }
  }, [isFocused]);

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
        state={asset.state}
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

  return (
    <group>
      {component}

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
