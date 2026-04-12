import Separator from './assets/Separator';
import Heater from './assets/Heater';
import Pump from './assets/Pump';
import Valve from './assets/Valve';
import Sensor3D from './Sensor';
import AssetLabel from './AssetLabel';
import usePlantStore from '../../hooks/usePlantStore';

/**
 * AssetFactory — routes each asset/valve to its specialized 3D component.
 * Maps parsed SVG (x, y) geometrically into Three.js (x, z) positions.
 */
export default function AssetFactory({ asset, isValve = false }) {
  const selectedAssetId = usePlantStore((s) => s.selectedAssetId);
  const hoveredAssetId = usePlantStore((s) => s.hoveredAssetId);
  const selectAsset = usePlantStore((s) => s.selectAsset);
  const hoverAsset = usePlantStore((s) => s.hoverAsset);
  const clearHover = usePlantStore((s) => s.clearHover);
  const setCameraTarget = usePlantStore((s) => s.setCameraTarget);
  const layers = usePlantStore((s) => s.layers);
  const sensorValues = usePlantStore((s) => s.sensorValues);
  const plantLayout = usePlantStore((s) => s.plantLayout);

  const { id } = asset;
  
  // Parse asset type dynamically based on P&ID prefix
  let type = 'unknown';
  let elevation = 0;
  if (!isValve) {
    if (id.startsWith('E-')) { type = 'heater'; elevation = 1; }
    else if (id.startsWith('V-')) { type = 'separator'; elevation = 1.5; }
    else if (id.startsWith('P-')) { type = 'pump'; elevation = 0.5; }
  } else {
    elevation = 0.8;
  }

  // Geometric projection from SVG
  const scale = 0.015;
  const cx = 1400;
  const cy = 900;
  const pos = [
    (asset.x - cx) * scale,
    elevation,
    (asset.y - cy) * scale
  ];

  const posHash = { x: pos[0], y: pos[1], z: pos[2] };

  const isSelected = selectedAssetId === id;
  const isHovered = hoveredAssetId === id;

  const handleClick = (e) => {
    e.stopPropagation();
    selectAsset(id);
    setCameraTarget(posHash);
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    hoverAsset(id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    clearHover();
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
        state={'open'}
        {...interactionProps}
      />
    );
  } else {
    switch (type) {
      case 'separator':
        component = (
          <Separator
            position={pos}
            name={id}
            isSelected={isSelected}
            isHovered={isHovered}
            sensorValues={sensorValues}
            assetId={id}
            {...interactionProps}
          />
        );
        break;
      case 'heater':
        component = (
          <Heater
            position={pos}
            name={id}
            isSelected={isSelected}
            isHovered={isHovered}
            sensorValues={sensorValues}
            assetId={id}
            {...interactionProps}
          />
        );
        break;
      case 'pump':
        component = (
          <Pump
            position={pos}
            name={id}
            isSelected={isSelected}
            isHovered={isHovered}
            status={'operational'}
            sensorValues={sensorValues}
            assetId={id}
            {...interactionProps}
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

  // Get sensors dynamically associated with this asset from SVG parsing
  const rawSensors = plantLayout?.sensors || [];
  const assetSensors = isValve ? [] : rawSensors.filter(s => s.asset_id === id);

  return (
    <group>
      {component}

      {/* Label */}
      {layers.labels && (
        <AssetLabel
          position={[
            pos[0],
            pos[1] + (isValve ? 2.5 : type === 'separator' ? 5 : 3.5),
            pos[2],
          ]}
          id={id}
          name={asset.name || id}
          isSelected={isSelected}
          sensorValues={sensorValues}
          assetSensors={assetSensors}
        />
      )}

      {/* Sensors */}
      {layers.sensors &&
        assetSensors.map((sensor, idx) => (
          <Sensor3D
            key={`${sensor.id}-${idx}`}
            sensor={{
               ...sensor,
               position: { 
                 x: (sensor.x - cx) * scale, 
                 y: 2.5, 
                 z: (sensor.y - cy) * scale 
               }
            }}
            value={sensorValues[sensor.id]}
          />
        ))}
    </group>
  );
}
