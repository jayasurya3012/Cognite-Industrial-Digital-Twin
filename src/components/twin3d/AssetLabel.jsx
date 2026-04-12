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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          pointerEvents: 'auto'
        }}
      >
        <div
          style={{
            background: isSelected
              ? 'rgba(0, 212, 255, 0.2)'
              : 'rgba(10, 14, 23, 0.8)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isSelected ? 'rgba(0, 212, 255, 0.6)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '8px',
            padding: '6px 12px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isSelected
              ? '0 0 20px rgba(0, 212, 255, 0.3)'
              : '0 4px 12px rgba(0,0,0,0.4)',
            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.3s ease',
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 800,
              color: isSelected ? '#00d4ff' : '#f3f4f6',
              letterSpacing: '0.5px',
            }}
          >
            {id}
          </span>

          {primaryReading && !isSelected && (
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

        {isSelected && (
          <div
            style={{
              background: 'rgba(10, 14, 23, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              minWidth: '180px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
             <div style={{ color: 'var(--t3)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                Operational State
             </div>
             {assetSensors.length > 0 ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                 {assetSensors.map(s => {
                   const val = sensorValues[s.id];
                   return (
                     <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{s.name}</span>
                        <span style={{ fontSize: '11px', color: (val?.q === 'BAD' ? '#ff4444' : '#00d4ff'), fontWeight: 700, fontFamily: 'monospace' }}>
                           {val?.v?.toFixed(1) || 'N/A'}<span style={{ fontSize: '8px', marginLeft: '2px', opacity: 0.6 }}>{s.unit}</span>
                        </span>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>No active telemetry</div>
             )}
          </div>
        )}
      </div>
    </Html>
  );
}
