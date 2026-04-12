import { Html } from '@react-three/drei';
import { sensorTypeConfig } from '../../data/sensorConfig';

/**
 * AssetLabel — floating glassmorphism label above each asset.
 * Shows asset ID, name, and key sensor reading.
 */
export default function AssetLabel({
  position,
  id,
  name,
  isSelected,
  sensorValues,
  assetSensors = [],
}) {
  // Get the primary sensor reading to show
  const primarySensor = assetSensors[0];
  const primaryReading = primarySensor
    ? sensorValues[primarySensor.id]
    : null;
  const config = primarySensor
    ? sensorTypeConfig[primarySensor.type]
    : null;

  return (
    <Html
      position={position}
      center
      distanceFactor={25}
      zIndexRange={[10, 0]}
      style={{
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          background: isSelected
            ? 'rgba(0, 212, 255, 0.12)'
            : 'rgba(10, 14, 23, 0.8)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${isSelected ? 'rgba(0, 212, 255, 0.4)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '8px',
          padding: '6px 12px',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: isSelected
            ? '0 0 20px rgba(0, 212, 255, 0.2)'
            : '0 4px 12px rgba(0,0,0,0.4)',
          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.3s ease',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 600,
            color: isSelected ? '#00d4ff' : '#f3f4f6',
            letterSpacing: '0.5px',
          }}
        >
          {id}
        </span>

        {primaryReading && (
          <>
            <span
              style={{
                width: '1px',
                height: '12px',
                background: 'rgba(255,255,255,0.15)',
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                fontWeight: 500,
                color: primaryReading.q === 'BAD' ? '#ff0044' : '#00d4ff'
              }}
            >
              {primaryReading.v?.toFixed(1) || '0.0'}
            </span>
          </>
        )}
      </div>
    </Html>
  );
}
